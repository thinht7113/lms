from abc import ABC, abstractmethod
from typing import Any, Dict, List

class BaseCourseCrawler(ABC):
    @abstractmethod
    async def crawl(self, source_url: str, limit: int = 5, checkout_free: bool = False) -> List[Dict[str, Any]]:
        raise NotImplementedError
