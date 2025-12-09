# Repository Guidelines

This repo is intentionally minimal right now; use this guide to keep early contributions consistent as the stack takes shape. Prefer small, well-scoped PRs so we can review quickly.

## Project Structure & Module Organization
- Place application code in `src/` and mirror that layout in `tests/` (e.g., `src/api/users.py` → `tests/api/test_users.py`).
- Keep reusable utilities in `src/common/` or `src/lib/`; isolate scripts in `scripts/`.
- Store documentation in `docs/`, environment samples in `.env.example`, and infra/CI assets in `infra/`.
- Avoid top-level clutter: new files should live in a subdirectory with a clear owner.

## Build, Test, and Development Commands
- Provide a `Makefile` (or package scripts) as the single entrypoint. Suggested targets:
  - `make setup` — install toolchain and dependencies.
  - `make run` — start the app locally with sensible defaults.
  - `make test` — run the full test suite; keep it fast and deterministic.
  - `make lint` / `make fmt` — enforce style before opening a PR.
- Keep commands non-interactive so CI can reuse them. Document any required env vars in `docs/`.

## Coding Style & Naming Conventions
- Indentation: 2 spaces for JS/TS; 4 for Python; follow language norms elsewhere. Keep lines ≤ 100 chars.
- Naming: files and modules `snake_case`; classes `PascalCase`; functions/variables `lowerCamelCase`; constants `SCREAMING_SNAKE_CASE`.
- Use language-native formatters (`prettier`, `black`, `gofmt`, etc.) and run linting before commits. Add pre-commit hooks mirroring CI checks.

## Testing Guidelines
- Mirror `src/` structure under `tests/`; name files `test_<module>.ext` or `<module>.spec.ext` to match the language ecosystem.
- Include unit tests with every feature; add integration/e2e suites under `tests/e2e/` when external services are involved.
- Aim for >80% coverage once the codebase grows; prefer deterministic tests with explicit fixtures or fakes over shared global state.
- Run `make test` before pushing; flag any flaky cases in the PR.

## Commit & Pull Request Guidelines
- Use Conventional Commit headers (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`) followed by a short imperative description.
- PRs should summarize intent, link related issues, and list test commands run. Add screenshots or logs for user-facing or operational changes.
- Keep PRs focused; avoid mixing refactors with behavioral changes unless necessary and well-documented.

## Security & Configuration Tips
- Never commit secrets; load them from a local `.env` and provide safe defaults in `.env.example`.
- Document required keys, ports, and external dependencies in `docs/config.md`; prefer least-privilege access for any service credentials.
