# Coding Standards

## General

1. **No emoji** in comments or log messages.

2. **Braces**: Opening bracket on the same line as the statement, closing bracket on its own line.

   ```python
   if condition:
       do_something()
   ```

   ```typescript
   if (condition) {
     doSomething();
   }
   ```

3. **Indentation**:
   - Generally: 4 spaces, not tabs.
   - Typescript: 2 spaces

4. **Naming conventions**:
   - Variables: `snake_case`
   - Constants: `ELEPHANT_CASE`
   - Classes: `PascalCase`
   - Methods/Functions: `snake_case`

5. **Import ordering**: stdlib, third-party, local (blank lines between groups).

   ```python
   import os
   from datetime import datetime

   from fastapi import APIRouter
   from sqlalchemy import select

   from app.models import Player
   from app.schemas import PlayerRead
   ```

6. **TypeScript strictness**: `strict: true` enabled, avoid `any`.

7. **Log format** for all unstructured text/event logs:
   ```
   [<ISO 8601 Date/Time>] <LOG LEVEL> - <component>:<module/function> - <message>
   ```
   Example:
   ```
   [2024-01-15T14:32:01Z] INFO - backend:auth/login - User authenticated successfully
   [2024-01-15T14:32:05Z] ERROR - frontend:api/client - Request failed with status 500
   ```

## API

8. **Error responses**: Consistent JSON format.
   ```json
   { "error": "Human readable message", "code": "ERROR_CODE" }
   ```

## Database

9. **Migrations**: Always use Alembic. Never run manual DDL in production.

## Security

10. **Secrets**: Never commit `.env`. Always update `.env.example` when adding new environment variables.

## Testing

11. **80%+ unit test coverage** target:
    - Pull requests must include test coverage to be merged
    - No merging PRs that decrease overall coverage
    - You don't lie about tests passing, and you don't lie about having written tests

12. **GitHub Actions CI**:
    - Unit tests run automatically on all PRs
    - PRs cannot be merged with failing tests

## Git

13. **Trunk-based development**:
    - Small, frequent, encapsulated branches
    - Create the feature branch **before** making any commits — never commit issue work directly to `main`
    - Frequent merges back to a stable `main` branch
    - Keep branches short-lived
    - Delete working branches after merges, and delete the local branch as well

14. **Branch prefixes and naming**:
    - The following prefixes are acceptable, based on the type of issue.
      - _feature/_: These branches are used for developing new features. For instance, feature/login-system.
      - _fix/_: These branches are used to fix bugs in the code. For example, bugfix/header-styling.
      - _hotfix/_: These branches are made directly from the production branch to fix critical bugs in the production environment. For instance, hotfix/critical-security-issue.
      - _release/_: These branches are used to prepare for a new production release. They allow for last-minute dotting of i’s and crossing t’s. Use the prefix release/. For example, release/v1.0.1.
      - _docs/_: These branches are used to write, update, or fix documentation eg. the README.md file. For instance, docs/api-endpoints.
    - Branch names (after the prefix) should start with the issue number, and then contain a 1-to-3 word descriptive name, lowercase, with hyphens betwen them. For example, 27-fix-avatar-size.
    - Only use an issue number in the branch name if a real issue exists. If there's no tracked issue, omit the number (e.g. `fix/tsconfig-include-override`).

## Versioning

15. **CalVer scheme**: This project uses calendar versioning in `YYYY.MM.DD` format, stored in the `VERSION` file at the repo root.
    - Bump the version when merging meaningful changes (content updates, features, serious layout changes, fixes)
    - Include the VERSION bump in the same PR as the change — never as a separate follow-up
    - Use a `.N` suffix for multiple releases on the same day (e.g. `2026.02.10.1`)
    - No version bump needed for internal refactors, CI changes, or documentation-only updates
    - The VERSION file is the single source of truth -- build tooling reads it to tag images and embed in output

## Documentation

16. **README maintenance**:
    - Update README.md when changes affect:
      - Project setup or prerequisites
      - Available npm scripts
      - Tech stack (major version bumps or new tools)
      - Project structure (new top-level directories or key files)
      - Data model or variant system behavior
    - Keep the tech stack section current with package.json
    - No update needed for internal refactors, patch versions, or minor feature work
