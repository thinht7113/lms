"""
Lumina LMS - Seed Script
Script tạo dữ liệu mẫu thông qua API endpoints.
Chạy: python seed_data.py [--api-url http://localhost:8000/api/v1]
"""
import httpx
import sys
import argparse

def seed(api_url: str):
    client = httpx.Client(timeout=30.0)
    print(f"🌱 Seeding data via API: {api_url}\n")

    # 1. Đăng ký Giảng viên
    print("1️⃣  Đăng ký Giảng viên...")
    r = client.post(f"{api_url}/auth/register", json={
        "email": "instructor@test.com", "mat_khau": "password123",
        "ho_ten": "Giảng viên Lumina", "vai_tro": "instructor"
    })
    print(f"   → {r.status_code}")

    # 2. Đăng ký Học viên
    print("2️⃣  Đăng ký Học viên...")
    r = client.post(f"{api_url}/auth/register", json={
        "email": "student@test.com", "mat_khau": "password123",
        "ho_ten": "Học viên Demo", "vai_tro": "student"
    })
    print(f"   → {r.status_code}")

    # 3. Đăng ký Admin (tạo như instructor rồi promote qua DB)
    print("3️⃣  Đăng ký Admin...")
    r = client.post(f"{api_url}/auth/register", json={
        "email": "admin@test.com", "mat_khau": "password123",
        "ho_ten": "Quản trị viên", "vai_tro": "instructor"
    })
    print(f"   → {r.status_code}")

    # Promote admin (cần gọi trực tiếp DB)
    print("   → Promoting admin (via DB)...")
    try:
        from app.core.database import async_session_maker
        from app.models.user import User
        from sqlalchemy import select
        import asyncio

        async def promote():
            async with async_session_maker() as session:
                res = await session.execute(select(User).where(User.email == "admin@test.com"))
                u = res.scalars().first()
                if u:
                    u.vai_tro = "admin"
                    session.add(u)
                    await session.commit()
                    print("   ✅ Admin promoted")

        asyncio.run(promote())
    except Exception as e:
        print(f"   ⚠ Không promote được admin qua DB (có thể chạy ngoài container): {e}")

    # Login Admin
    r = client.post(f"{api_url}/auth/login", json={"email": "admin@test.com", "mat_khau": "password123"})
    admin_token = r.json().get("access_token") if r.status_code == 200 else None
    admin_h = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}

    # Login Instructor
    r = client.post(f"{api_url}/auth/login", json={"email": "instructor@test.com", "mat_khau": "password123"})
    inst_token = r.json()["access_token"]
    inst_h = {"Authorization": f"Bearer {inst_token}"}

    # 4. Tạo danh mục
    print("4️⃣  Tạo danh mục...")
    categories = [
        {"ten_danh_muc": "Lập trình Web", "mo_ta": "Frontend & Backend Web Development"},
        {"ten_danh_muc": "Backend", "mo_ta": "Server-side programming & APIs"},
        {"ten_danh_muc": "Thiết kế UI/UX", "mo_ta": "Giao diện và trải nghiệm người dùng"},
        {"ten_danh_muc": "Python", "mo_ta": "Ngôn ngữ lập trình Python"},
    ]
    cat_ids = {}
    for cat in categories:
        r = client.post(f"{api_url}/categories", headers=admin_h, json=cat)
        if r.status_code == 201:
            cat_ids[cat["ten_danh_muc"]] = r.json()["id"]
            print(f"   ✅ {cat['ten_danh_muc']} (id={r.json()['id']})")
        else:
            print(f"   ⚠ {cat['ten_danh_muc']}: {r.status_code}")

    # 5. Tạo khóa học
    print("5️⃣  Tạo khóa học...")
    courses_data = [
        {"tieu_de": "React JS Nâng Cao - Kiến Trúc Component Hiện Đại", "gia_tien": 499000,
         "mo_ta": "Làm chủ React Hooks, Context API, Performance Optimization, và các Design Patterns hiện đại cho ứng dụng React quy mô lớn.",
         "ma_danh_muc": cat_ids.get("Lập trình Web"), "trinh_do": "advanced"},
        {"tieu_de": "FastAPI Backend Mastery - Làm Chủ API Không Đồng Bộ", "gia_tien": 399000,
         "mo_ta": "Xây dựng REST API hiệu suất cao với FastAPI, SQLAlchemy async, JWT Authentication, và triển khai Docker.",
         "ma_danh_muc": cat_ids.get("Backend"), "trinh_do": "intermediate"},
        {"tieu_de": "Thiết Kế UI/UX Hiện Đại Với Figma", "gia_tien": 299000,
         "mo_ta": "Học thiết kế giao diện chuyên nghiệp từ wireframe đến prototype với Figma, Auto Layout, và Design System.",
         "ma_danh_muc": cat_ids.get("Thiết kế UI/UX"), "trinh_do": "beginner"},
        {"tieu_de": "Python Cơ Bản Cho Người Mới Bắt Đầu", "gia_tien": 199000,
         "mo_ta": "Khóa học Python toàn diện từ zero: biến, hàm, OOP, xử lý file, và các thư viện phổ biến.",
         "ma_danh_muc": cat_ids.get("Python"), "trinh_do": "beginner"},
        {"tieu_de": "Next.js Full-Stack - Từ Frontend Đến Deployment", "gia_tien": 599000,
         "mo_ta": "Xây dựng ứng dụng full-stack với Next.js App Router, Server Components, API Routes, và Vercel Deployment.",
         "ma_danh_muc": cat_ids.get("Lập trình Web"), "trinh_do": "intermediate"},
    ]

    course_ids = []
    for cd in courses_data:
        r = client.post(f"{api_url}/instructor/courses", headers=inst_h, json=cd)
        if r.status_code == 201:
            cid = r.json()["id"]
            course_ids.append(cid)
            print(f"   ✅ {cd['tieu_de']} (id={cid})")
            # Xuất bản
            client.put(f"{api_url}/courses/{cid}", headers=inst_h, json={"da_xuat_ban": True})
        else:
            print(f"   ⚠ {cd['tieu_de']}: {r.status_code} {r.text}")

    # 6. Tạo chương & bài học cho khóa học đầu tiên
    if course_ids:
        cid = course_ids[0]
        print(f"6️⃣  Tạo chương & bài học cho khóa {cid}...")
        sections = [
            {"tieu_de": "Chương 1: React Hooks Nâng Cao", "lessons": [
                {"tieu_de": "useState và useReducer nâng cao", "thoi_luong": 600, "da_xuat_ban": True,
                 "noi_dung": [{"loai_noi_dung": "text", "noi_dung_text": "useState không chỉ là lưu trữ state đơn giản. Trong bài này, chúng ta tìm hiểu về lazy initialization, functional updates, và khi nào nên dùng useReducer thay thế.", "thu_tu": 1}]},
                {"tieu_de": "useEffect và cleanup patterns", "thoi_luong": 500, "da_xuat_ban": True,
                 "noi_dung": [{"loai_noi_dung": "text", "noi_dung_text": "Hiểu sâu về dependency array, cleanup function, và cách tránh memory leaks trong React Effects.", "thu_tu": 1}]},
                {"tieu_de": "Custom Hooks - Tái sử dụng logic", "thoi_luong": 450, "da_xuat_ban": True,
                 "noi_dung": [{"loai_noi_dung": "text", "noi_dung_text": "Tạo custom hooks để tái sử dụng logic giữa các component: useFetch, useLocalStorage, useDebounce.", "thu_tu": 1}]},
            ]},
            {"tieu_de": "Chương 2: State Management", "lessons": [
                {"tieu_de": "Context API vs Redux", "thoi_luong": 700, "da_xuat_ban": True,
                 "noi_dung": [{"loai_noi_dung": "text", "noi_dung_text": "So sánh Context API và Redux: khi nào dùng cái nào, ưu nhược điểm, và best practices.", "thu_tu": 1}]},
                {"tieu_de": "Zustand - Giải pháp nhẹ nhàng (Bản nháp)", "thoi_luong": 400, "da_xuat_ban": False,
                 "noi_dung": [{"loai_noi_dung": "text", "noi_dung_text": "Bài học đang được chuẩn bị...", "thu_tu": 1}]},
            ]},
        ]
        for si, sec in enumerate(sections):
            sr = client.post(f"{api_url}/courses/{cid}/sections", headers=inst_h, json={"tieu_de": sec["tieu_de"], "thu_tu": si + 1})
            if sr.status_code == 201:
                sid = sr.json()["id"]
                print(f"   📂 {sec['tieu_de']} (id={sid})")
                for li, les in enumerate(sec["lessons"]):
                    lr = client.post(f"{api_url}/sections/{sid}/lessons", headers=inst_h, json={
                        "tieu_de": les["tieu_de"], "thoi_luong": les["thoi_luong"],
                        "thu_tu": li + 1, "da_xuat_ban": les["da_xuat_ban"],
                        "noi_dung": les.get("noi_dung", [])
                    })
                    status = "✅" if lr.status_code == 201 else "⚠"
                    draft = " (Nháp)" if not les["da_xuat_ban"] else ""
                    print(f"      {status} {les['tieu_de']}{draft}")

        # 7. Tạo quiz
        print(f"7️⃣  Tạo quiz cho khóa {cid}...")
        qr = client.post(f"{api_url}/courses/{cid}/quizzes", headers=inst_h, json={
            "tieu_de": "Kiểm tra React Hooks", "diem_dat": 6.0,
            "thoi_gian_lam_bai": 15, "so_luot_lam_toi_da": 3
        })
        if qr.status_code == 201:
            qid = qr.json()["id"]
            print(f"   ✅ Quiz id={qid}")
            questions = [
                {"noi_dung": "useEffect cleanup function chạy khi nào?",
                 "cac_lua_chon": [
                     {"text": "Khi component mount", "is_correct": False},
                     {"text": "Khi component unmount hoặc dependency thay đổi", "is_correct": True},
                     {"text": "Chỉ khi component unmount", "is_correct": False},
                     {"text": "Không bao giờ chạy tự động", "is_correct": False},
                 ]},
                {"noi_dung": "Custom Hook bắt buộc phải bắt đầu bằng gì?",
                 "cac_lua_chon": [
                     {"text": "hook", "is_correct": False},
                     {"text": "use", "is_correct": True},
                     {"text": "custom", "is_correct": False},
                     {"text": "my", "is_correct": False},
                 ]},
            ]
            for q in questions:
                cqr = client.post(f"{api_url}/quizzes/{qid}/questions", headers=inst_h, json=q)
                s = "✅" if cqr.status_code == 201 else "⚠"
                print(f"      {s} {q['noi_dung'][:50]}...")

    print("\n🎉 Seed hoàn tất!")
    print(f"   📧 Giảng viên: instructor@test.com / password123")
    print(f"   📧 Học viên:   student@test.com / password123")
    print(f"   📧 Admin:      admin@test.com / password123")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-url", default="http://localhost:8000/api/v1")
    args = parser.parse_args()
    seed(args.api_url)
