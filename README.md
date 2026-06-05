# Atlas-X Indexer

**Language:** English | [中文](README.zh-CN.md)

Atlas-X Indexer is a local-first desktop index manager for ChatGPT conversation links, notes, tags, projects, saved filters, imports, and exports. The app is built with Tauri 2, React, TypeScript, Tailwind CSS, SQLite, FTS5, Zustand, Zod, and SheetJS.

## Features

- Local SQLite database with schema migrations for entries, tags, projects, saved filters, import/export logs, app settings, search history, access history, and entry history.
- Dashboard, entry list, detail view, create/edit forms, and settings pages.
- Table and card views with search, sorting, pagination, date filters, status filters, project filters, and tag filters.
- Bulk delete, bulk tag assignment, bulk status updates, and bulk export.
- CSV, Excel, and JSON import/export with preview, field mapping, duplicate hints, and error report export.
- Database backup and restore from the settings page.
- Light and dark themes.
- Optional browser extension source for capturing ChatGPT page metadata into the desktop app.

## Repository Layout

```text
.
|-- browser-extension/        # Optional capture extension source
|-- scripts/                  # Windows helper scripts
|-- src/                      # React frontend
|-- src-tauri/                # Tauri/Rust backend
|-- tests/                    # Vitest tests
|-- package.json
|-- package-lock.json
`-- README.md
```

## Requirements

- Windows 10/11
- Node.js 20+
- Rust stable
- Visual Studio C++ Build Tools or a compatible Windows Rust toolchain
- NSIS, when building the Windows installer

This checkout may contain local toolchain folders such as `.tools/`, `.cargo-local/`, and `.rustup-local/` on the developer machine. They are intentionally ignored by Git and are not part of the public source release.

## Install From Release

Download the Windows installer from GitHub Releases when a release is published:

```text
Atlas-X Indexer_0.1.0_x64-setup.exe
```

The installer is a Tauri NSIS per-user installer. It should install without administrator privileges and create a runnable Atlas-X Indexer desktop app.

## Local Development

Install dependencies:

```powershell
npm install
```

On PowerShell systems that block `npm.ps1`, use `npm.cmd`:

```powershell
npm.cmd install
```

Frontend-only development:

```powershell
npm.cmd run dev
```

Tauri desktop development:

```powershell
npm.cmd run tauri:dev
```

If the project path contains spaces and the local GNU toolchain has path parsing issues, use the Windows helper script:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows-dev.ps1
```

## Test And Build

Run the frontend tests:

```powershell
npm.cmd test
```

Build the frontend:

```powershell
npm.cmd run build
```

Check the Rust backend:

```powershell
cd src-tauri
cargo check
```

Build the Windows app and NSIS installer:

```powershell
npm.cmd run tauri:build
```

On the local Windows development machine, the path-safe helper can also be used:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows-build.ps1
```

## Verified Local Release Build

The current local release artifact is:

```text
src-tauri\target\release\bundle\nsis\Atlas-X Indexer_0.1.0_x64-setup.exe
```

Local verification before publication:

- `npm.cmd test`: 2 test files passed, 9 tests passed.
- `npm.cmd run build`: TypeScript and Vite production build completed.
- `cargo check` from a short `X:\src-tauri` path using the local Windows Rust toolchain completed successfully.
- Local NSIS installer artifact was found for version `0.1.0`.

## Data Location

The app stores its SQLite database in the Tauri app data directory. On Windows this is typically:

```text
%APPDATA%\com.atlasx.indexer\atlas-x-indexer.db
```

Do not commit local database files, backups, captured private conversation exports, packaged browser-extension keys, or generated installer artifacts.

## Browser Extension

The extension source lives under `browser-extension/atlasx-capture`. Packaged extension artifacts and private keys are intentionally excluded from Git:

- `browser-extension/*.pem`
- `browser-extension/*.crx`
- `browser-extension/*.zip`

Repackage the extension locally when needed instead of committing private packaging keys.

## License

This project is released under the MIT License. See [LICENSE](LICENSE).
