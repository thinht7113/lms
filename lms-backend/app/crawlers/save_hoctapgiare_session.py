from __future__ import annotations

import asyncio
from pathlib import Path

from playwright.async_api import async_playwright

from app.core.config import settings


async def save_session() -> None:
    storage_state_path = settings.CRAWLER_HOCTAPGIARE_STORAGE_STATE_PATH or "storage_states/hoctapgiare.json"
    output_path = Path(storage_state_path)
    if not output_path.is_absolute():
        output_path = Path.cwd() / output_path
    output_path.parent.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=False)
        context = await browser.new_context(
            locale="vi-VN",
            viewport={"width": 1440, "height": 1000},
        )
        page = await context.new_page()
        await page.goto("https://hoctapgiare.top/login", wait_until="domcontentloaded")

        if settings.CRAWLER_HOCTAPGIARE_EMAIL and settings.CRAWLER_HOCTAPGIARE_PASSWORD:
            await page.locator("#login-email, input[name='email']").first.fill(settings.CRAWLER_HOCTAPGIARE_EMAIL)
            await page.locator("#login-password, input[name='password']").first.fill(settings.CRAWLER_HOCTAPGIARE_PASSWORD)
            await page.locator("button[type='submit'], .btn-login, .btn-primary").first.click()

        print("Hoan tat dang nhap tren cua so Chromium, sau do quay lai terminal va nhan Enter.")
        await asyncio.to_thread(input)

        await context.storage_state(path=str(output_path))
        await browser.close()

    print(f"Da luu session vao: {output_path}")


if __name__ == "__main__":
    asyncio.run(save_session())
