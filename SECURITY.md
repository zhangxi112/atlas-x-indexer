# Security Policy

## Supported Versions

This repository currently tracks the active source release of Atlas-X Indexer.

## Reporting A Vulnerability

Please report security issues privately to the repository owner rather than opening a public issue with exploit details.

Include:

- Affected version or commit.
- Steps to reproduce.
- Impact and affected local data.
- Any relevant logs with private content removed.

## Public Release Boundary

Do not commit:

- Local SQLite databases, database backups, or imported/exported private conversation data.
- Browser-extension private keys such as `.pem` files.
- Packaged extension artifacts such as `.crx` or `.zip` files.
- Local toolchains, build caches, installer outputs, or `src-tauri/target`.
- Tokens, API keys, cookies, or proxy credentials.

The app is designed as a local-first desktop tool. Any future network-facing feature should document what is sent, where it is sent, and how user consent is collected.
