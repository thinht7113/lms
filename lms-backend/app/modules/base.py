from dataclasses import dataclass, field
from typing import Sequence

from fastapi import APIRouter


@dataclass(frozen=True)
class ModuleRoute:
    """One externally mounted router owned by a business module."""

    router: APIRouter
    prefix: str
    tags: Sequence[str]


@dataclass(frozen=True)
class ModuleDefinition:
    """
    Declarative boundary for one module in the modular monolith.

    The application remains one deployable FastAPI service, but every business
    capability is registered through a module definition so ownership and
    dependencies are visible in one place.
    """

    name: str
    description: str
    routes: Sequence[ModuleRoute]
    owns_models: Sequence[str] = field(default_factory=tuple)
    depends_on: Sequence[str] = field(default_factory=tuple)
