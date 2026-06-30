import logging

import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize asynchronous Redis client
redis_client = aioredis.from_url(
    settings.REDIS_URL,
    decode_responses=True
)

async def clear_categories_cache():
    try:
        await redis_client.delete("categories:all", "categories:with_counts")
    except Exception as e:
        logger.warning("Error clearing Redis categories cache: %s", e)
