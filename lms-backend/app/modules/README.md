# Modular Monolith Boundaries

The backend is one deployable FastAPI application, but business capabilities are
registered as explicit modules through `app.modules.registry`.

## Module Rules

- A module owns a business capability, not just a technical folder.
- API routers are registered through `ModuleDefinition.routes`.
- Endpoint modules import domain objects through `app.modules.<module>.*`
  facades instead of importing directly from `app.models`, `app.schemas`, or
  `app.services`.
- Cross-module dependencies must be declared in `ModuleDefinition.depends_on`.
- Shared infrastructure remains in `app.core`, `app.api.deps`, and reusable
  low-level service implementations until it is extracted further.
- New endpoints should be added to the owning module, then exposed through that module definition.
- Avoid adding new direct router imports in `app.api.v1.router`; use the registry.
- Run `python scripts/check_modular_boundaries.py` before submission to catch
  imports that bypass module boundaries.

## Current Modules

| Module | Responsibility |
|---|---|
| `identity` | Auth, profile, roles, password recovery |
| `storage` | Upload and MinIO/S3 object access |
| `catalog` | Courses, categories, lessons, public instructors, banners |
| `commerce` | Cart, coupons, orders, payments, refunds |
| `learning` | Enrollments, progress, quizzes, certificates |
| `instructor` | Instructor studio, analytics, payout requests |
| `administration` | Admin dashboard, moderation, settings, audit logs |

## Migration Plan Toward Stricter Modular Monolith

1. Keep route registration centralized in `app.modules.registry`.
2. Move module-specific services into each module package when editing that feature.
3. Introduce repositories per module when service/database coupling becomes hard to maintain.
4. Replace generic dynamic admin writes with module-specific admin workflows where business rules matter.
5. Use internal domain events for cross-module side effects such as payment success -> enrollment creation -> certificate checks.
