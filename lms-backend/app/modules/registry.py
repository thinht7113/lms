from app.modules.administration import module as administration_module
from app.modules.catalog import module as catalog_module
from app.modules.commerce import module as commerce_module
from app.modules.identity import module as identity_module
from app.modules.instructor import module as instructor_module
from app.modules.learning import module as learning_module
from app.modules.storage import module as storage_module
from app.modules.base import ModuleDefinition


MODULES: tuple[ModuleDefinition, ...] = (
    identity_module,
    storage_module,
    catalog_module,
    commerce_module,
    learning_module,
    instructor_module,
    administration_module,
)


def get_modules() -> tuple[ModuleDefinition, ...]:
    return MODULES
