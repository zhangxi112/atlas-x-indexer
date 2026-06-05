# Contributing

Thanks for improving Atlas-X Indexer.

## Local Setup

1. Install Node.js 20+ and Rust stable.
2. Run `npm.cmd install`.
3. Run `npm.cmd test`.
4. Run `npm.cmd run build`.
5. Run `cargo check` from `src-tauri`.

On Windows, if PowerShell blocks `npm.ps1`, use `npm.cmd`. If a path with spaces causes Rust or GNU toolchain issues, use the helper scripts in `scripts/`.

## Development Guidelines

- Keep user data local-first and avoid adding network calls unless the feature explicitly requires them.
- Do not commit local databases, exports with private content, build outputs, local toolchains, browser-extension private keys, or installer artifacts.
- Keep frontend changes covered by focused Vitest tests when business logic or parsing behavior changes.
- Keep Tauri commands small and validate inputs at the boundary.
- Prefer explicit import/export error reporting over silent failure.

## Pull Requests

Include:

- The user-facing behavior changed.
- Tests or checks run.
- Any migration, import/export, or local data compatibility notes.
