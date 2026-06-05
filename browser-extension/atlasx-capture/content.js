(() => {
  if (window.__ATLASX_CAPTURE_EXTENSION_LOADED__) return;
  window.__ATLASX_CAPTURE_EXTENSION_LOADED__ = true;

  const ENDPOINT = "http://127.0.0.1:38951/capture";
  const DOCK_ID = "atlasx-extension-dock";
  const DOCK_MENU_ID = "atlasx-extension-dock-menu";
  const TOAST_ID = "atlasx-extension-toast";
  const BOUND_ATTR = "data-atlasx-extension-bound";

  function getSource() {
    if (location.hostname.includes("gemini.google.com")) {
      return {
        type: "gemini",
        label: "Gemini",
        linkSelector: 'a[href*="/app/"]',
        titleSuffixes: [/\s*\|\s*Gemini$/i, /\s*-\s*Gemini$/i],
        messageSelectors: [
          "message-content",
          ".conversation-container .markdown",
          "main .markdown",
          "main user-query",
          "main model-response",
        ],
      };
    }

    return {
      type: "chatgpt",
      label: "ChatGPT",
      linkSelector: 'nav a[href*="/c/"], aside a[href*="/c/"]',
      titleSuffixes: [/\s*\|\s*ChatGPT$/i, /\s*-\s*ChatGPT$/i],
      messageSelectors: [
        '[data-message-author-role="assistant"]',
        '[data-message-author-role="user"]',
        'article [class*="markdown"]',
        'main [data-testid^="conversation-turn-"]',
      ],
    };
  }

  async function postCapture(payload) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }

    return response.json();
  }

  function cleanTitle(raw) {
    const source = getSource();
    let value = String(raw || "").trim();
    for (const pattern of source.titleSuffixes) value = value.replace(pattern, "");
    return value.trim();
  }

  function getPageTitle() {
    const selectors = ["main h1", "h1", "title"];
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (node?.textContent?.trim()) return cleanTitle(node.textContent);
    }
    return cleanTitle(document.title) || `Untitled ${getSource().label} conversation`;
  }

  function collectMessageTexts() {
    const source = getSource();
    return Array.from(new Set(
      source.messageSelectors
        .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
        .map((node) => node.textContent?.replace(/\s+/g, " ").trim())
        .filter(Boolean),
    ));
  }

  function createPageSummary(selectionText) {
    if (selectionText?.trim()) return selectionText.trim().slice(0, 1000);
    const selectedText = window.getSelection?.().toString().trim();
    if (selectedText) return selectedText.slice(0, 1000);
    const messages = collectMessageTexts();
    return (messages.find((text) => text.length > 30) || `Captured from ${getSource().label}; summary pending.`).slice(0, 1000);
  }

  function buildBasePayload() {
    const source = getSource();
    return {
      sourceType: source.type,
      tags: ["web-capture", source.label, "browser-extension"],
      conversationDate: new Date().toISOString().slice(0, 10),
      status: "\u5f85\u6574\u7406",
    };
  }

  function buildPagePayload(selectionText = "") {
    const source = getSource();
    return {
      ...buildBasePayload(),
      title: getPageTitle(),
      url: window.location.href,
      summary: createPageSummary(selectionText),
      notes: `Captured from current ${source.label} page by Atlas-X browser extension.`,
      sourceContext: `${source.type}-extension-page-capture`,
    };
  }

  function getConversationLinks() {
    const source = getSource();
    const links = Array.from(document.querySelectorAll(source.linkSelector))
      .filter((node) => node instanceof HTMLAnchorElement);
    const seen = new Set();
    return links.filter((link) => {
      if (!link.href || seen.has(link.href)) return false;
      seen.add(link.href);
      return true;
    });
  }

  function findLinkByUrl(url) {
    return getConversationLinks().find((link) => link.href === url || link.getAttribute("href") === url) || null;
  }

  function buildLinkPayload(url) {
    const source = getSource();
    const link = findLinkByUrl(url);
    const title = cleanTitle(link?.textContent || "") || cleanTitle(url.split("/").pop()) || `Untitled ${source.label} conversation`;
    return {
      ...buildBasePayload(),
      title,
      url,
      summary: `Captured from a ${source.label} conversation link; summary pending.`,
      tags: ["web-capture", source.label, "browser-extension", "context-menu"],
      notes: `Captured from a ${source.label} link by Atlas-X browser extension.`,
      sourceContext: `${source.type}-extension-link-capture`,
    };
  }

  function buildSidebarPayload(link) {
    const source = getSource();
    const title = cleanTitle(link.textContent?.trim()) || `Untitled ${source.label} conversation`;
    return {
      ...buildBasePayload(),
      title,
      url: link.href,
      summary: `Captured from ${source.label} sidebar/list; summary pending.`,
      tags: ["web-capture", source.label, "browser-extension", "sidebar"],
      notes: `Captured from ${source.label} sidebar/list by Atlas-X browser extension.`,
      sourceContext: `${source.type}-extension-sidebar-capture`,
    };
  }

  function toast(message, isError = false) {
    const existing = document.getElementById(TOAST_ID);
    if (existing) existing.remove();
    const node = document.createElement("div");
    node.id = TOAST_ID;
    node.className = isError ? "error" : "";
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 3200);
  }

  function formatCaptureMessage(result, title) {
    return result.action === "updated" ? `Atlas-X inbox updated: ${title}` : `Sent to Atlas-X inbox: ${title}`;
  }

  async function sendCapture(payload) {
    try {
      const result = await postCapture(payload);
      toast(formatCaptureMessage(result, payload.title));
      return result;
    } catch (error) {
      console.error(error);
      toast("Atlas-X capture failed. Start the desktop app first.", true);
      throw error;
    }
  }

  async function captureCurrentPage(selectionText = "") {
    return sendCapture(buildPagePayload(selectionText));
  }

  async function captureLink(url) {
    if (!url) {
      toast("No captureable link found.", true);
      return;
    }
    return sendCapture(buildLinkPayload(url));
  }

  async function captureSidebarBatch() {
    const links = getConversationLinks();
    if (!links.length) {
      toast("No sidebar/list conversations found to capture.", true);
      return;
    }

    let queued = 0;
    let updated = 0;
    let failed = 0;

    for (const link of links) {
      try {
        const result = await postCapture(buildSidebarPayload(link));
        if (result.action === "updated") updated += 1;
        else queued += 1;
        await new Promise((resolve) => setTimeout(resolve, 120));
      } catch (error) {
        console.error(error);
        failed += 1;
      }
    }

    const parts = [`queued ${queued}`, `updated ${updated}`];
    if (failed) parts.push(`failed ${failed}`);
    toast(`Atlas-X batch capture finished: ${parts.join(", ")}`, failed > 0);
  }

  function createButton(label, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void onClick();
    });
    return button;
  }

  function ensureFloatingDock() {
    if (document.getElementById(DOCK_ID)) return;
    const source = getSource();
    const dock = document.createElement("div");
    dock.id = DOCK_ID;

    const trigger = createButton("AX", "atlasx-extension-trigger", () => {
      dock.classList.toggle("open");
    });
    trigger.title = "Atlas-X Capture";

    const menu = document.createElement("div");
    menu.id = DOCK_MENU_ID;
    menu.appendChild(createButton(`Capture ${source.label}`, "atlasx-extension-button", () => captureCurrentPage()));
    menu.appendChild(createButton("Batch list", "atlasx-extension-button secondary", captureSidebarBatch));

    dock.appendChild(menu);
    dock.appendChild(trigger);
    document.body.appendChild(dock);
  }

  function injectSidebarButtons() {
    if (getSource().type !== "chatgpt") return;
    for (const link of getConversationLinks()) {
      if (link.getAttribute(BOUND_ATTR) === "true") continue;
      link.setAttribute(BOUND_ATTR, "true");
      const wrapper = link.parentElement;
      if (!wrapper) continue;
      wrapper.style.position = "relative";
      wrapper.appendChild(createButton("AX", "atlasx-extension-sidebar-button", () => sendCapture(buildSidebarPayload(link))));
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const run = async () => {
      if (message.type === "ATLASX_CAPTURE_CURRENT") await captureCurrentPage(message.selectionText || "");
      if (message.type === "ATLASX_CAPTURE_LINK") await captureLink(message.linkUrl || "");
      if (message.type === "ATLASX_CAPTURE_BATCH") await captureSidebarBatch();
      return { ok: true };
    };

    run().then(sendResponse).catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  });

  function boot() {
    ensureFloatingDock();
    injectSidebarButtons();
  }

  boot();
  new MutationObserver(() => boot()).observe(document.documentElement, { childList: true, subtree: true });
})();

