"""Check the backend's Modular Monolithic import boundaries.

This script intentionally uses only the Python standard library so it can run
on a clean machine before the FastAPI dependencies are installed.
"""

from __future__ import annotations

import ast
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ENDPOINTS_DIR = ROOT / "app" / "api" / "v1" / "endpoints"
API_ROUTER = ROOT / "app" / "api" / "v1" / "router.py"

FORBIDDEN_ENDPOINT_IMPORTS = (
    "app.models",
    "app.schemas",
    "app.services",
)

ALLOWED_API_ROUTER_IMPORTS = {
    "fastapi",
    "app.modules",
}


def iter_imports(path: Path):
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module:
            yield node.lineno, node.module
        elif isinstance(node, ast.Import):
            for alias in node.names:
                yield node.lineno, alias.name


def is_forbidden_endpoint_import(module: str) -> bool:
    return module in FORBIDDEN_ENDPOINT_IMPORTS or module.startswith(
        tuple(f"{item}." for item in FORBIDDEN_ENDPOINT_IMPORTS)
    )


def check_endpoints() -> list[str]:
    errors: list[str] = []
    for path in sorted(ENDPOINTS_DIR.glob("*.py")):
        for lineno, module in iter_imports(path):
            if is_forbidden_endpoint_import(module):
                rel = path.relative_to(ROOT)
                errors.append(f"{rel}:{lineno} imports {module}; use app.modules.* facade")
    return errors


def check_api_router() -> list[str]:
    errors: list[str] = []
    for lineno, module in iter_imports(API_ROUTER):
        if module not in ALLOWED_API_ROUTER_IMPORTS:
            rel = API_ROUTER.relative_to(ROOT)
            errors.append(f"{rel}:{lineno} imports {module}; router should use module registry")
    return errors


def main() -> int:
    errors = check_endpoints() + check_api_router()
    if errors:
        print("Modular boundary violations:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Modular boundaries OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
