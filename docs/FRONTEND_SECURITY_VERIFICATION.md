# Frontend security verification

## Automated checks
The frontend GitHub Actions workflow runs dependency installation, Oxlint, and a Vite production build for pushes and pull requests targeting `main`.

## URL handling
API-provided profile images are restricted to HTTPS URLs. Meeting links, qualification documents, and demo-video links are restricted to HTTP(S) URLs before being placed in browser URL attributes. Invalid or unsafe schemes are not rendered as active links/media sources.

This is defense in depth; backend validation remains required. React text interpolation should be used for user-generated content. Do not use `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, or dynamic code evaluation for API/user content.

## Browser verification checklist (test accounts only)
- [ ] Confirm login, signup, logout, password reset and role-specific routing.
- [ ] Confirm student, teacher and admin pages load and unauthorized roles receive 401/403 from private endpoints.
- [ ] Confirm a valid HTTPS profile image and video render; malformed, `javascript:`, and `data:` URLs do not become active media.
- [ ] Confirm only valid HTTP(S) meeting/document/video links are clickable.
- [ ] Confirm user-supplied markup is displayed as text and cannot execute.
- [ ] Confirm the deployed frontend origin succeeds on API preflight and an unapproved origin is rejected by CORS.
- [ ] Confirm rejected teacher applications retain their rejection reason after refresh.
- [ ] Confirm teacher hide/restore and admin delete actions behave as intended using disposable test records only.

## Production database recovery
See the backend `docs/PRODUCTION_DATABASE_BACKUP_RESTORE.md`. Backup and isolated restore are operator-run steps because production database credentials are not available to CI. Never put database URLs, passwords, tokens, or database dumps in source control or chat.

## Scope
Automated lint/build and URL-scheme guards do not constitute a penetration test, a full browser XSS assessment, or proof of every API authorization path. Record each manual check only after executing it against a dedicated test account and disposable test data.
