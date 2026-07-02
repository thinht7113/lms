import argparse
import asyncio
import json
import os
import re
import sys
from datetime import datetime

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from playwright.async_api import async_playwright
from config import settings
from crawlers.hoctapgiare_crawler import HocTapGiaReCrawler
from services.importer import CourseImporter
from db import async_session_maker

def save_json_backup(draft: dict, prefix: str = "backup") -> str:
    os.makedirs("drafts", exist_ok=True)
    title = str(draft.get("title") or "untitled")
    safe_title = re.sub(r"[^\w\-_\. ]", "", title).replace(" ", "_").lower()[:40]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"drafts/{prefix}_{timestamp}_{safe_title}.json"
    
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(draft, f, ensure_ascii=False, indent=2)
    return filename

async def crawl_and_import(url: str, publish: bool, approve: bool, export_only: bool = False, limit: int = 1, concurrency: int = 8):
    print(f"🚀 Bắt đầu thu thập tối đa {limit} khóa học từ: {url} (Đa luồng: {concurrency} luồng/khóa)")
    
    async with async_playwright() as p:
        storage_path = settings.CRAWLER_HOCTAPGIARE_STORAGE_STATE_PATH
        if not os.path.exists(storage_path):
            print(f"⚠️ Không tìm thấy file session tại {storage_path}. Tool sẽ chạy với chế độ Khách (Guest).")
            storage_path = None
        else:
            print(f"🔐 Sử dụng cookie đăng nhập từ: {storage_path}")

        crawler = HocTapGiaReCrawler(
            headless=settings.CRAWLER_DEFAULT_HEADLESS,
            storage_state_path=storage_path,
            email=settings.CRAWLER_HOCTAPGIARE_EMAIL,
            password=settings.CRAWLER_HOCTAPGIARE_PASSWORD,
            max_concurrency=concurrency,
        )


        
        try:
            results = await crawler.crawl(url, limit=limit, checkout_free=True)
            if not results:
                print("❌ Không thu thập được dữ liệu khóa học nào!")
                return
            
            print(f"\n🎉 Đã cào thành công tổng cộng {len(results)} khóa học. Đang tiến hành xử lý...")
            
            for idx, draft in enumerate(results, 1):
                print(f"\n[{idx}/{len(results)}] 📦 Đang xử lý: '{draft.get('title')}'")
                print(f"  - Số chương: {len(draft.get('sections', []))}")
                total_lessons = sum(len(s.get('lessons', [])) for s in draft.get('sections', []))
                print(f"  - Tổng bài học: {total_lessons}")

                # 1. Tự động xuất file backup JSON thô (Raw Draft)
                raw_backup_path = save_json_backup(draft, prefix="raw_draft")
                print(f"  📁 [Auto-Backup] Đã lưu JSON thô tại: {raw_backup_path}")

                if export_only:
                    print(f"  📋 [Print-Only] Xem trước dữ liệu (tối đa 1500 ký tự):")
                    print("  " + "-" * 50)
                    print("  " + json.dumps(draft, ensure_ascii=False, indent=2)[:1500].replace("\n", "\n  "))
                    print("  " + "-" * 50)
                    continue

                print("  💾 Đang tải media lên MinIO và lưu vào PostgreSQL...")
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
                    print(f"  🎉 XONG! Khóa học '{draft.get('title')}' đã vào LMS với ID = {course_id}")
                else:
                    print(f"  ⚠️ Bỏ qua import khóa học '{draft.get('title')}'.")

            print(f"\n🎊 HOÀN TẤT TOÀN BỘ QUÁ TRÌNH XỬ LÝ {len(results)} KHÓA HỌC!")

        except Exception as e:
            print(f"\n❌ LỖI trong quá trình cào/import: {e}")
            import traceback
            traceback.print_exc()

async def import_from_json(file_path: str, publish: bool, approve: bool):
    print(f"📂 Đang tải dữ liệu từ file backup JSON: {file_path}...")
    if not os.path.exists(file_path):
        print(f"❌ Không tìm thấy file: {file_path}")
        return

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            draft = json.load(f)
        
        print(f"✅ Đã đọc thông tin khóa học: '{draft.get('title')}'")
        print("💾 Đang tiến hành kiểm tra media và import vào PostgreSQL...")
        
        async with async_session_maker() as db:
            course_id = await CourseImporter.import_course_to_db(
                db=db,
                draft=draft,
                publish=publish,
                approve=approve,
            )
        
        processed_backup_path = save_json_backup(draft, prefix="reimported")
        print(f"📁 [Auto-Backup] Đã lưu file JSON cập nhật tại: {processed_backup_path}")
        print(f"\n🎉 HOÀN TẤT! Khóa học từ file JSON đã vào LMS với ID = {course_id}")
    except Exception as e:
        print(f"\n❌ LỖI khi import từ JSON: {e}")
        import traceback
        traceback.print_exc()

async def login_and_save_session(email: str, password: str):
    print(f"🔐 Đăng nhập vào hoctapgiare.top với email: {email}...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        
        await page.goto("https://hoctapgiare.top/login")
        await page.fill("input[name='email'], input[type='email']", email)
        await page.fill("input[name='password'], input[type='password']", password)
        await page.click("button[type='submit'], button:has-text('Đăng nhập'), button:has-text('Login')")
        
        print("⏳ Đang chờ xác thực đăng nhập (bạn có thể xử lý Captcha trên trình duyệt nếu có)...")
        await asyncio.sleep(10)
        
        os.makedirs(os.path.dirname(settings.CRAWLER_HOCTAPGIARE_STORAGE_STATE_PATH), exist_ok=True)
        await context.storage_state(path=settings.CRAWLER_HOCTAPGIARE_STORAGE_STATE_PATH)
        print(f"✅ Đã lưu session thành công vào: {settings.CRAWLER_HOCTAPGIARE_STORAGE_STATE_PATH}")
        
        await browser.close()

def main():
    parser = argparse.ArgumentParser(description="LMS Standalone Course Crawler Tool")
    parser.add_argument("--url", type=str, help="URL khóa học hoặc bài học từ hoctapgiare.top")
    parser.add_argument("--from-json", type=str, dest="from_json", help="Import trực tiếp từ file JSON backup (không cần cào lại web)")
    parser.add_argument("--publish", action="store_true", default=True, help="Tự động xuất bản khóa học ngay sau khi import")
    parser.add_argument("--draft", action="store_true", help="Lưu dưới dạng nháp (Draft - không công khai)")
    parser.add_argument("--login", action="store_true", help="Chạy chế độ đăng nhập để lưu cookie session")
    parser.add_argument("--email", type=str, help="Email đăng nhập hoctapgiare.top")
    parser.add_argument("--password", type=str, help="Mật khẩu đăng nhập hoctapgiare.top")
    parser.add_argument("--print-only", "--export-only", action="store_true", dest="print_only", help="Chỉ cào và in ra JSON để xem/kiểm tra, KHÔNG lưu vào CSDL")
    parser.add_argument("--limit", type=int, default=1, help="Số lượng khóa học tối đa cần cào khi truyền vào URL danh mục hoặc trang chủ")
    parser.add_argument("-c", "--concurrency", type=int, default=8, dest="concurrency", help="Số lượng luồng cào bài học song song (Mặc định: 8. Tăng lên nếu máy mạnh/mạng nhanh)")

    args = parser.parse_args()

    if args.login:
        email = args.email or settings.CRAWLER_HOCTAPGIARE_EMAIL
        password = args.password or settings.CRAWLER_HOCTAPGIARE_PASSWORD
        if not email or not password:
            print("❌ Vui lòng cung cấp --email và --password (hoặc cấu hình trong file .env của crawler tool)")
            sys.exit(1)
        asyncio.run(login_and_save_session(email, password))
        return


    publish = False if args.draft else args.publish
    approve = False if args.draft else True

    if args.from_json:
        asyncio.run(import_from_json(args.from_json, publish, approve))
        return

    if not args.url:
        parser.print_help()
        sys.exit(1)

    asyncio.run(crawl_and_import(args.url, publish, approve, export_only=args.print_only, limit=args.limit, concurrency=args.concurrency))




if __name__ == "__main__":
    main()
