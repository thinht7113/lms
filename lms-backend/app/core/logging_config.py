import logging
import sys
from app.core.config import settings


def setup_logging() -> None:
    """Cấu hình logging chuẩn cho toàn bộ ứng dụng LMS Backend."""
    log_level = logging.DEBUG if settings.APP_ENV.lower() in {"development", "test"} else logging.INFO

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Xóa handler cũ (tránh duplicate khi reload)
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    # Giảm noise từ thư viện bên thứ ba
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("boto3").setLevel(logging.WARNING)
    logging.getLogger("botocore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
