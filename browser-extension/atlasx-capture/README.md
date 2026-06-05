# Atlas-X Capture Browser Extension

This is the desktop browser extension for Atlas-X Indexer. It uses Chromium Manifest V3.

## Supported sites

- ChatGPT: `https://chatgpt.com/*`, `https://chat.openai.com/*`
- Gemini: `https://gemini.google.com/*`

## Supported browsers

- Chrome desktop: supported.
- Microsoft Edge desktop: supported with the same extension directory.
- Mobile browsers: not recommended for this local extension flow, because `127.0.0.1` on a phone points to the phone itself, not the computer running Atlas-X.

## Install in Chrome

1. Start Atlas-X Indexer desktop app.
2. Open `chrome://extensions/`.
3. Enable Developer mode.
4. Click `Load unpacked`.
5. Select the `browser-extension\atlasx-capture` directory from this repository.
6. Open or refresh ChatGPT/Gemini.

## Install in Edge

1. Start Atlas-X Indexer desktop app.
2. Open `edge://extensions/`.
3. Enable Developer mode.
4. Click `Load unpacked`.
5. Select the `browser-extension\atlasx-capture` directory from this repository.
6. Open or refresh ChatGPT/Gemini.

## Usage

- Floating button: `Atlas-X: Capture ChatGPT/Gemini` captures the current page.
- Floating button: `Atlas-X: Batch list` captures visible sidebar/list conversation links.
- Sidebar/list `AX` button captures a single conversation link.
- Browser native right-click menu supports current page, link capture, and batch list capture.

All captured items go into the Atlas-X capture inbox first. Review and approve them inside Atlas-X before they enter the main index.

## Mobile direction

For phone capture, the safer next step is a LAN capture mode: Atlas-X shows a QR code with a temporary token, the phone opens a small capture page on your computer LAN IP, and submitted links go into the same capture inbox.
