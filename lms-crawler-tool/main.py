import argparse
import asyncio
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
except Exception:
    pass    

from playwright.async_api import async_playwright
from urllib.parse import urlparse
from config import TOOL_ROOT, settings
from crawlers.hoctapgiare_crawler import HocTapGiaReCrawler
from crawlers.khoahocre_crawler import KhoaHoCreCrawler
from services.importer import CourseImporter
from db import async_session_maker

def save_json_backup(draft: dict, prefix: str = "backup") -> str:
    backup_dir = TOOL_ROOT / "drafts"
    backup_dir.mkdir(parents=True, exist_ok=True)
    title = str(draft.get("title") or "untitled")
    safe_title = re.sub(r"[^\w\-_\. ]", "", title).replace(" ", "_").lower()[:40]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = backup_dir / f"{prefix}_{timestamp}_{safe_title}.json"
    
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(draft, f, ensure_ascii=False, indent=2)
    return str(filename)

def resolve_tool_path(value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else TOOL_ROOT / path

async def crawl_and_import(url: str, publish: bool, approve: bool, export_only: bool = False, limit: int = 1, concurrency: int = 8):
    print(f"Bắt đầu thu thập tối đa {limit} khóa học từ: {url} (Đa luồng: {concurrency} luồng/khóa)")

    parsed_url = urlparse(url)
    host = parsed_url.netloc.lower()
    is_khoahocre = "khoahocre.com" in host

    if is_khoahocre:
        storage_path_value = settings.CRAWLER_KHOAHOCRE_STORAGE_STATE_PATH
        email = settings.CRAWLER_KHOAHOCRE_EMAIL
        password = settings.CRAWLER_KHOAHOCRE_PASSWORD
        crawler_cls = KhoaHoCreCrawler
    else:
        storage_path_value = settings.CRAWLER_HOCTAPGIARE_STORAGE_STATE_PATH
        email = settings.CRAWLER_HOCTAPGIARE_EMAIL
        password = settings.CRAWLER_HOCTAPGIARE_PASSWORD
        crawler_cls = HocTapGiaReCrawler

    storage_path = resolve_tool_path(storage_path_value) if storage_path_value else None
    if storage_path and not storage_path.exists():
        print(f"Không tìm thấy file session tại {storage_path}. Tool sẽ chạy với chế độ Khách (Guest).")
        storage_state_path = None
    else:
        storage_state_path = str(storage_path) if storage_path else None
        if storage_state_path:
            print(f"Sử dụng cookie đăng nhập từ: {storage_state_path}")

    existing_titles = None
    if not export_only:
        try:
            async with async_session_maker() as db:
                existing_titles = await CourseImporter.load_existing_course_title_keys(db)
            print(f"Đã nạp {len(existing_titles)} tiêu đề khóa học hiện có để tránh import trùng.")
        except Exception as exc:
            print(f"Không đọc được danh sách khóa học hiện có, vẫn tiếp tục crawl: {exc}")

    crawler = crawler_cls(
        headless=settings.CRAWLER_DEFAULT_HEADLESS,
        storage_state_path=storage_state_path,
        email=email,
        password=password,
        max_concurrency=concurrency,
    )


    processed_count = 0
    total_drafts = []
    queue = asyncio.Queue()

    async def import_worker():
        nonlocal processed_count
        while True:
            draft = await queue.get()
            try:
                processed_count += 1
                idx = processed_count
                print(f"\n[{idx}] Đang xử lý import: '{draft.get('title')}'")
                print(f"  - Số chương: {len(draft.get('sections', []))}")
                total_lessons = sum(len(s.get('lessons', [])) for s in draft.get('sections', []))
                print(f"  - Tổng bài học: {total_lessons}")

                raw_backup_path = save_json_backup(draft, prefix="raw_draft")
                print(f"[Auto-Backup] Đã lưu JSON thô tại: {raw_backup_path}")

                if export_only:
                    print("[Print-Only] Xem trước dữ liệu (tối đa 1500 ký tự):")
                    print("  " + "-" * 50)
                    print("  " + json.dumps(draft, ensure_ascii=False, indent=2)[:1500].replace("\n", "\n  "))
                    print("  " + "-" * 50)
                else:
                    print("Đang tải media lên MinIO và lưu vào PostgreSQL...")
                    async with async_session_maker() as db:
                        course_id = await CourseImporter.import_course_to_db(
                            db=db,
                            draft=draft,
                            publish=publish,
                            approve=approve,
                        )

                    if course_id:
                        processed_backup_path = save_json_backup(draft, prefix="imported_minio")
                        print(f"  📁 [Auto-Backup] Đã lưu JSON MinIO tại: {processed_backup_path}")
                        print(f"  XONG! Khóa học '{draft.get('title')}' đã vào LMS với ID = {course_id}")
                    else:
                        print(f"  Bỏ qua import khóa học '{draft.get('title')}'.")
            except Exception as exc:
                print(f"Lỗi khi xử lý import khóa học '{draft.get('title')}': {exc}")
                import traceback
                traceback.print_exc()
            finally:
                queue.task_done()

    # Khởi động 2 luồng worker chạy ngầm song song để xử lý import & upload MinIO
    worker_tasks = [asyncio.create_task(import_worker()) for _ in range(2)]

    async def on_course_draft(draft: dict):
        total_drafts.append(draft)
        await queue.put(draft)
        print(f"  [Pipeline] Đã đẩy khóa học '{draft.get('title')}' vào hàng đợi xử lý import ngầm!", flush=True)

    try:
        results = await asyncio.wait_for(
            crawler.crawl(url, limit=limit, checkout_free=True, existing_titles=existing_titles, on_draft=on_course_draft),
            timeout=max(60, settings.CRAWLER_JOB_TIMEOUT_SECONDS),
        )
        if not results and not total_drafts:
            print("❌ Không thu thập được dữ liệu khóa học nào!")
            return

        print("\nĐang chờ hoàn tất xử lý import cho tất cả các khóa học trong hàng đợi pipeline...")
        await queue.join()
        print(f"\nHOÀN TẤT TOÀN BỘ QUÁ TRÌNH XỬ LÝ {len(total_drafts)} KHÓA HỌC!")

    except Exception as e:
        print(f"\n❌ LỖI trong quá trình cào/import: {e}")
        import traceback
        traceback.print_exc()
    finally:
        for w in worker_tasks:
            w.cancel()
        await asyncio.gather(*worker_tasks, return_exceptions=True)

async def import_from_json(file_path: str, publish: bool, approve: bool):
    print(f"📂 Đang tải dữ liệu từ file backup JSON: {file_path}...")
    if not os.path.exists(file_path):
        print(f"❌ Không tìm thấy file: {file_path}")
        return

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            draft = json.load(f)
        
        print(f"Đã đọc thông tin khóa học: '{draft.get('title')}'")
        print("Đang tiến hành kiểm tra media và import vào PostgreSQL...")
        
        async with async_session_maker() as db:
            course_id = await CourseImporter.import_course_to_db(
                db=db,
                draft=draft,
                publish=publish,
                approve=approve,
            )
        
        processed_backup_path = save_json_backup(draft, prefix="reimported")
        print(f"📁 [Auto-Backup] Đã lưu file JSON cập nhật tại: {processed_backup_path}")
        print(f"\n HOÀN TẤT! Khóa học từ file JSON đã vào LMS với ID = {course_id}")
    except Exception as e:
        print(f"\n❌ LỖI khi import từ JSON: {e}")
        import traceback
        traceback.print_exc()

async def login_and_save_session(email: str, password: str, site: str = "hoctapgiare"):
    is_khoahocre = "khoahocre" in site.lower()
    if is_khoahocre:
        login_url = "https://khoahocre.com/join/"
        home_url = "https://khoahocre.com"
        storage_setting = settings.CRAWLER_KHOAHOCRE_STORAGE_STATE_PATH
        print(f"Đăng nhập vào khoahocre.com với email: {email}...")
    else:
        login_url = "https://hoctapgiare.top/login"
        home_url = "https://hoctapgiare.top/home"
        storage_setting = settings.CRAWLER_HOCTAPGIARE_STORAGE_STATE_PATH
        print(f"Đăng nhập vào hoctapgiare.top với email: {email}...")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        
        await page.goto(login_url)
        if is_khoahocre:
            await page.fill("#khrUser, input[name='log'], input[name='user_login'], input[name='username'], input[type='email']", email)
            await page.fill("#khrPass, input[name='pwd'], input[name='user_password'], input[name='password'], input[type='password']", password)
            await page.click("button.khr-join-submit, button[name='wp-submit'], button[type='submit'], input[type='submit'], button:has-text('Đăng nhập'), button:has-text('Login')")
        else:
            await page.fill("input[name='email'], input[type='email']", email)
            await page.fill("input[name='password'], input[type='password']", password)
            await page.click("button[type='submit'], button:has-text('Đăng nhập'), button:has-text('Login')")
        
        print("Đang chờ xác thực đăng nhập (bạn có thể xử lý Captcha/Cloudflare trên trình duyệt nếu có)...")
        await asyncio.sleep(12)
        
        await page.goto(home_url, wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)

        storage_state_path = resolve_tool_path(storage_setting)
        storage_state_path.parent.mkdir(parents=True, exist_ok=True)
        await context.storage_state(path=str(storage_state_path))
        print(f"Đã lưu session thành công vào: {storage_state_path}")
        
        await browser.close()

def main():
    parser = argparse.ArgumentParser(description="LMS Standalone Course Crawler Tool")
    parser.add_argument("url_positional", nargs="?", default=None, metavar="URL", help="URL khóa học hoặc trang danh mục (có thể gõ trực tiếp, không cần --url)")
    parser.add_argument("--url", type=str, dest="url_flag", help="URL khóa học (dạng cờ, tương đương gõ URL trực tiếp)")
    parser.add_argument("--from-json", type=str, dest="from_json", help="Import trực tiếp từ file JSON backup (không cần cào lại web)")
    parser.add_argument("--publish", action="store_true", default=True, help="Tự động xuất bản khóa học ngay sau khi import")
    parser.add_argument("--draft", action="store_true", help="Lưu dưới dạng nháp (Draft - không công khai)")
    parser.add_argument("--login", action="store_true", help="Chạy chế độ đăng nhập để lưu cookie session")
    parser.add_argument("--site", type=str, default="hoctapgiare", choices=["hoctapgiare", "khoahocre"], help="Trang web mục tiêu cho chế độ --login (hoctapgiare hoặc khoahocre)")
    parser.add_argument("--email", type=str, help="Email đăng nhập")
    parser.add_argument("--password", type=str, help="Mật khẩu đăng nhập")
    parser.add_argument("--print-only", "--export-only", action="store_true", dest="print_only", help="Chỉ cào và in ra JSON để xem/kiểm tra, KHÔNG lưu vào CSDL")
    parser.add_argument("--limit", type=int, default=1, help="Số lượng khóa học tối đa cần cào khi truyền vào URL danh mục hoặc trang chủ")
    parser.add_argument("-c", "--concurrency", type=int, default=8, dest="concurrency", help="Số lượng luồng cào bài học song song (Mặc định: 8. Tăng lên nếu máy mạnh/mạng nhanh)")

    args = parser.parse_args()

    # Merge URL: ưu tiên --url flag, fallback sang positional argument
    url = args.url_flag or args.url_positional

    if args.login:
        is_khoahocre = "khoahocre" in (args.site or "").lower() or (url and "khoahocre.com" in url.lower())
        if is_khoahocre:
            email = args.email or settings.CRAWLER_KHOAHOCRE_EMAIL
            password = args.password or settings.CRAWLER_KHOAHOCRE_PASSWORD
            site_name = "khoahocre"
        else:
            email = args.email or settings.CRAWLER_HOCTAPGIARE_EMAIL
            password = args.password or settings.CRAWLER_HOCTAPGIARE_PASSWORD
            site_name = "hoctapgiare"

        if not email or not password:
            print(f"❌ Vui lòng cung cấp --email và --password cho {site_name} (hoặc cấu hình trong file .env)")
            sys.exit(1)
        asyncio.run(login_and_save_session(email, password, site=site_name))
        return


    publish = False if args.draft else args.publish
    approve = False if args.draft else True

    if args.from_json:
        asyncio.run(import_from_json(args.from_json, publish, approve))
        return

    if not url:
        parser.print_help()
        sys.exit(1)

    asyncio.run(crawl_and_import(url, publish, approve, export_only=args.print_only, limit=args.limit, concurrency=args.concurrency))




if __name__ == "__main__":
    main()
