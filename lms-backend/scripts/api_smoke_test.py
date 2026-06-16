import argparse
import asyncio
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import async_session_maker
from app.core.security import create_access_token


BASE_URL = "http://localhost:8000"


@dataclass
class ApiResult:
    method: str
    path: str
    url: str
    role: str
    status_code: int | None
    ok: bool
    detail: str


TABLE_ID_QUERIES = {
    "user_id": "select id from nguoi_dung order by id limit 1",
    "instructor_id": "select id from nguoi_dung where vai_tro = 'instructor' order by id limit 1",
    "category_id": "select id from danh_muc order by id limit 1",
    "course_id": "select id from khoa_hoc order by id limit 1",
    "section_id": "select id from chuong_hoc order by id limit 1",
    "lesson_id": "select id from bai_hoc order by id limit 1",
    "content_id": "select id from noi_dung_bai_hoc order by id limit 1",
    "enrollment_id": "select id from dang_ky_hoc order by id limit 1",
    "coupon_id": "select id from ma_giam_gia order by id limit 1",
    "order_id": "select id from don_hang order by id limit 1",
    "banner_id": "select id from banners order by id limit 1",
    "quiz_id": "select id from bai_kiem_tra order by id limit 1",
    "question_id": "select id from cau_hoi order by id limit 1",
    "attempt_id": "select id from lich_su_lam_bai order by id limit 1",
    "certificate_id": "select id from chung_chi order by id limit 1",
    "review_id": "select id from danh_gia_khoa_hoc order by id limit 1",
    "notification_id": "select id from thong_bao order by id limit 1",
}


DYNAMIC_TABLES = {
    "banners": "banners",
    "categories": "danh_muc",
    "coupons": "ma_giam_gia",
    "courses": "khoa_hoc",
    "lesson-contents": "noi_dung_bai_hoc",
    "lessons": "bai_hoc",
    "logs": "nhat_ky_quan_tri",
    "orders": "don_hang",
    "sections": "chuong_hoc",
    "settings": "cau_hinh_he_thong",
    "users": "nguoi_dung",
}


MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
SAFE_MUTATION_ALLOWLIST = {
    ("POST", "/api/v1/auth/logout"),
}


async def scalar_or_default(db, sql: str, default: Any) -> Any:
    try:
        value = (await db.execute(text(sql))).scalar()
        return value if value is not None else default
    except Exception:
        return default


async def load_context() -> dict[str, Any]:
    context: dict[str, Any] = {}
    async with async_session_maker() as db:
        roles = {
            "student": "select id from nguoi_dung where vai_tro = 'student' and trang_thai_hoat_dong is true order by id limit 1",
            "instructor": "select id from nguoi_dung where vai_tro = 'instructor' and trang_thai_hoat_dong is true order by id limit 1",
            "admin": "select id from nguoi_dung where vai_tro = 'admin' and trang_thai_hoat_dong is true order by id limit 1",
        }
        for role, sql in roles.items():
            context[f"{role}_user_id"] = await scalar_or_default(db, sql, None)

        for key, sql in TABLE_ID_QUERIES.items():
            context[key] = await scalar_or_default(db, sql, 1)

        context["certificate_uuid"] = await scalar_or_default(
            db,
            "select uuid from chung_chi where uuid is not null order by id limit 1",
            "00000000-0000-0000-0000-000000000000",
        )

        for slug, table in DYNAMIC_TABLES.items():
            context[f"dynamic_{slug}_item_id"] = await scalar_or_default(
                db, f"select id from {table} order by id limit 1", 1
            )

    context["tokens"] = {
        role: create_access_token(user_id)
        for role in ("student", "instructor", "admin")
        if (user_id := context.get(f"{role}_user_id"))
    }
    return context


def choose_role(path: str) -> str:
    if path.startswith("/api/v1/admin") or path.startswith("/api/v1/dynamic-admin"):
        return "admin"
    if path.startswith("/api/v1/banners/admin") or path in {"/api/v1/banners/"}:
        return "admin"
    if path.startswith("/api/v1/instructor"):
        return "instructor"
    if any(
        path.startswith(prefix)
        for prefix in (
            "/api/v1/auth/profile",
            "/api/v1/cart",
            "/api/v1/checkout",
            "/api/v1/certificates/my-certificates",
            "/api/v1/certificates/{course_id}/download",
            "/api/v1/enrollments",
            "/api/v1/learn",
            "/api/v1/my-orders",
            "/api/v1/notifications",
            "/api/v1/orders",
            "/api/v1/payments/mock",
            "/api/v1/progress",
            "/api/v1/quizzes",
        )
    ):
        return "student"
    if any(path.startswith(prefix) for prefix in ("/api/v1/courses/{course_id}/quizzes", "/api/v1/sections", "/api/v1/lessons", "/api/v1/lesson-contents", "/api/v1/questions")):
        return "instructor"
    return "public"


def dynamic_item_id_for(path: str, context: dict[str, Any]) -> Any:
    parts = path.split("/")
    try:
        slug = parts[3]
    except IndexError:
        return 1
    return context.get(f"dynamic_{slug}_item_id", 1)


def fill_path(path: str, context: dict[str, Any]) -> str:
    values = {
        "user_id": context.get("user_id", 1),
        "instructor_id": context.get("instructor_id", 1),
        "category_id": context.get("category_id", 1),
        "course_id": context.get("course_id", 1),
        "section_id": context.get("section_id", 1),
        "lesson_id": context.get("lesson_id", 1),
        "content_id": context.get("content_id", 1),
        "enrollment_id": context.get("enrollment_id", 1),
        "coupon_id": context.get("coupon_id", 1),
        "order_id": context.get("order_id", 1),
        "banner_id": context.get("banner_id", 1),
        "quiz_id": context.get("quiz_id", 1),
        "question_id": context.get("question_id", 1),
        "attempt_id": context.get("attempt_id", 1),
        "certificate_id": context.get("certificate_id", 1),
        "review_id": context.get("review_id", 1),
        "notification_id": context.get("notification_id", 1),
        "certificate_uuid": context.get("certificate_uuid"),
        "item_id": dynamic_item_id_for(path, context),
    }
    result = path
    for key, value in values.items():
        result = result.replace("{" + key + "}", str(value))
    return result


def headers_for(role: str, context: dict[str, Any]) -> dict[str, str]:
    token = context.get("tokens", {}).get(role)
    return {"Authorization": f"Bearer {token}"} if token else {}


def minimal_body(path: str) -> dict[str, Any]:
    if path == "/api/v1/auth/login":
        return {"email": "not-existing-smoke@example.com", "mat_khau": "invalid-password"}
    if path == "/api/v1/auth/forgot-password":
        return {"email": "not-existing-smoke@example.com"}
    if path == "/api/v1/auth/reset-password":
        return {"token": "invalid-token", "mat_khau_moi": "NewPassword123"}
    if path == "/api/v1/auth/social":
        return {"provider": "google", "token": "invalid-token"}
    if path == "/api/v1/coupons/apply":
        return {"code": "INVALID-SMOKE-CODE", "order_total": 100000}
    return {}


async def call_endpoint(
    client: httpx.AsyncClient,
    method: str,
    path: str,
    context: dict[str, Any],
    mutate: bool,
) -> ApiResult:
    role = choose_role(path)
    url_path = fill_path(path, context)
    url = f"{BASE_URL}{url_path}"

    if method in MUTATING_METHODS and not mutate and (method, path) not in SAFE_MUTATION_ALLOWLIST:
        role = "public"

    headers = headers_for(role, context)
    kwargs: dict[str, Any] = {"headers": headers, "timeout": 15.0}
    if method in {"POST", "PUT", "PATCH"}:
        kwargs["json"] = minimal_body(path)

    try:
        response = await client.request(method, url, **kwargs)
        if response.status_code >= 500:
            detail = response.text[:500].replace("\n", " ")
            return ApiResult(method, path, url_path, role, response.status_code, False, detail)
        return ApiResult(method, path, url_path, role, response.status_code, True, "")
    except Exception as exc:
        return ApiResult(method, path, url_path, role, None, False, repr(exc))


async def main() -> int:
    parser = argparse.ArgumentParser(description="Smoke test all LMS API endpoints from OpenAPI.")
    parser.add_argument("--mutate", action="store_true", help="Allow mutating endpoints to run with role tokens.")
    args = parser.parse_args()

    context = await load_context()
    async with httpx.AsyncClient() as client:
        openapi = (await client.get(f"{BASE_URL}/openapi.json", timeout=15.0)).json()
        operations: list[tuple[str, str]] = []
        for path, methods in openapi["paths"].items():
            if not path.startswith("/api/v1"):
                continue
            for method in methods:
                if method.upper() in {"GET", "POST", "PUT", "PATCH", "DELETE"}:
                    operations.append((method.upper(), path))

        results = []
        for method, path in sorted(operations):
            results.append(await call_endpoint(client, method, path, context, args.mutate))

    failures = [result for result in results if not result.ok]
    by_status: dict[str, int] = {}
    for result in results:
        key = str(result.status_code)
        by_status[key] = by_status.get(key, 0) + 1

    print("API SMOKE TEST REPORT")
    print("=====================")
    print(f"Base URL: {BASE_URL}")
    print(f"Operations tested: {len(results)}")
    print(f"Mutating endpoints executed with auth: {args.mutate}")
    print(f"Status summary: {json.dumps(by_status, ensure_ascii=False, sort_keys=True)}")
    print(f"Failures: {len(failures)}")
    if failures:
        print("\nFAILED ENDPOINTS")
        for failure in failures:
            print(f"- {failure.method} {failure.path} -> {failure.status_code} ({failure.role}) {failure.detail}")
    else:
        print("\nNo transport errors or 5xx server errors detected.")

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
