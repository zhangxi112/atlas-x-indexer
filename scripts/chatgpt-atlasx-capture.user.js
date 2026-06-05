// ==UserScript==
// @name         Atlas-X ChatGPT Capture
// @namespace    https://atlas-x.local
// @version      0.3.0
// @description  Add Atlas-X capture controls to ChatGPT, including current-page capture, sidebar batch capture, and a right-click capture menu.
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @grant        none
// ==/UserScript==

(function () {
  const ENDPOINT = "http://127.0.0.1:38951/capture";
  const BADGE_ATTR = "data-atlasx-capture-bound";
  const FLOATING_DOCK_ID = "atlasx-floating-dock";
  const CONTEXT_MENU_ID = "atlasx-context-menu";
  const TOAST_ID = "atlasx-toast";

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
    return String(raw || "")
      .replace(/\s*\|\s*ChatGPT$/i, "")
      .replace(/\s*-\s*ChatGPT$/i, "")
      .trim();
  }

  function getPageTitle() {
    const h1 = document.querySelector("main h1");
    if (h1?.textContent?.trim()) return cleanTitle(h1.textContent);

    const titleNode = document.querySelector("title");
    if (titleNode?.textContent?.trim()) return cleanTitle(titleNode.textContent);

    return cleanTitle(document.title) || "?????";
  }

  function collectMessageTexts() {
    const selectors = [
      '[data-message-author-role="assistant"]',
      '[data-message-author-role="user"]',
      'article [class*="markdown"]',
      'main [data-testid^="conversation-turn-"]',
    ];

    const nodes = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
    const texts = nodes
      .map((node) => node.textContent?.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    return Array.from(new Set(texts));
  }

  function createSummaryFromPage() {
    const selectedText = window.getSelection?.().toString().trim();
    if (selectedText) return selectedText.slice(0, 1000);

    const messages = collectMessageTexts();
    return (messages.find((text) => text.length > 30) || "? ChatGPT ?????????????").slice(0, 1000);
  }

  function buildPagePayload() {
    return {
      title: getPageTitle(),
      url: window.location.href,
      summary: createSummaryFromPage(),
      sourceType: "chatgpt",
      tags: ["????", "ChatGPT"],
      notes: "? ChatGPT userscript ?????",
      sourceContext: "chatgpt-page-capture",
      conversationDate: new Date().toISOString().slice(0, 10),
      status: "???",
    };
  }

  function getSidebarLinks() {
    const links = Array.from(document.querySelectorAll('nav a[href*="/c/"], aside a[href*="/c/"]'))
      .filter((node) => node instanceof HTMLAnchorElement);

    const seen = new Set();
    return links.filter((link) => {
      const href = link.href;
      if (!href || seen.has(href)) return false;
      seen.add(href);
      return true;
    });
  }

  function buildSidebarPayload(link) {
    const title = cleanTitle(link.textContent?.trim()) || "?????";
    return {
      title,
      url: link.href,
      summary: "? ChatGPT ???????????????",
      sourceType: "chatgpt",
      tags: ["????", "ChatGPT", "???"],
      notes: "? ChatGPT ??? Atlas-X ????",
      sourceContext: "chatgpt-sidebar-capture",
      conversationDate: new Date().toISOString().slice(0, 10),
      status: "???",
    };
  }

  function toast(message, isError = false) {
    const existing = document.getElementById(TOAST_ID);
    if (existing) existing.remove();

    const node = document.createElement("div");
    node.id = TOAST_ID;
    node.textContent = message;
    Object.assign(node.style, {
      position: "fixed",
      right: "20px",
      bottom: "20px",
      zIndex: 99999,
      padding: "10px 14px",
      borderRadius: "12px",
      background: isError ? "#7f1d1d" : "#0f766e",
      color: "#fff",
      fontSize: "13px",
      boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
      maxWidth: "360px",
    });
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 3200);
  }

  function formatCaptureMessage(result, fallbackTitle) {
    if (result.action === "updated") {
      return `??? Atlas-X ????${fallbackTitle}`;
    }
    return `??? Atlas-X ????${fallbackTitle}`;
  }

  async function sendCapture(payload) {
    try {
      const result = await postCapture(payload);
      toast(formatCaptureMessage(result, payload.title));
      return result;
    } catch (error) {
      console.error(error);
      toast("Atlas-X ????????????????", true);
      throw error;
    }
  }

  async function captureCurrentPage() {
    return sendCapture(buildPagePayload());
  }

  async function captureSidebarLink(link) {
    return sendCapture(buildSidebarPayload(link));
  }

  async function captureSidebarBatch() {
    const links = getSidebarLinks();
    if (!links.length) {
      toast("????????????????", true);
      return;
    }

    let queued = 0;
    let updated = 0;
    let failed = 0;

    for (const link of links) {
      try {
        const result = await postCapture(buildSidebarPayload(link));
        if (result.action === "updated") {
          updated += 1;
        } else {
          queued += 1;
        }
        await new Promise((resolve) => setTimeout(resolve, 120));
      } catch (error) {
        console.error(error);
        failed += 1;
      }
    }

    const parts = [`?? ${queued} ?`, `?? ${updated} ?`];
    if (failed) parts.push(`?? ${failed} ?`);
    toast(`Atlas-X ??????????${parts.join("?")}` , failed > 0);
  }

  function createButton(label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void onClick();
    });
    return button;
  }

  function decorateButton(button, { compact = false, outlined = false } = {}) {
    Object.assign(button.style, {
      border: outlined ? "1px solid rgba(15, 118, 110, 0.35)" : "1px solid rgba(15, 118, 110, 0.7)",
      background: outlined ? "rgba(15, 118, 110, 0.08)" : "#0f766e",
      color: outlined ? "#134e4a" : "#ffffff",
      borderRadius: compact ? "999px" : "14px",
      padding: compact ? "2px 8px" : "10px 14px",
      fontSize: compact ? "11px" : "13px",
      fontWeight: "600",
      cursor: "pointer",
      lineHeight: "1.4",
      whiteSpace: "nowrap",
    });
  }

  function ensureFloatingDock() {
    if (document.getElementById(FLOATING_DOCK_ID)) return;

    const dock = document.createElement("div");
    dock.id = FLOATING_DOCK_ID;
    Object.assign(dock.style, {
      position: "fixed",
      right: "20px",
      bottom: "72px",
      zIndex: 99998,
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      alignItems: "stretch",
    });

    const pageButton = createButton("?????", captureCurrentPage);
    decorateButton(pageButton);

    const batchButton = createButton("??????", captureSidebarBatch);
    decorateButton(batchButton, { outlined: true });

    dock.appendChild(pageButton);
    dock.appendChild(batchButton);
    document.body.appendChild(dock);
  }

  function injectSidebarButtons() {
    const links = getSidebarLinks();
    for (const link of links) {
      if (link.getAttribute(BADGE_ATTR) === "true") continue;
      link.setAttribute(BADGE_ATTR, "true");

      const wrapper = link.parentElement;
      if (!wrapper) continue;
      wrapper.style.position = "relative";

      const button = createButton("AX", async () => captureSidebarLink(link));
      decorateButton(button, { compact: true, outlined: true });
      Object.assign(button.style, {
        position: "absolute",
        right: "8px",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 10,
      });
      wrapper.appendChild(button);
    }
  }

  function ensureContextMenu() {
    let menu = document.getElementById(CONTEXT_MENU_ID);
    if (menu) return menu;

    menu = document.createElement("div");
    menu.id = CONTEXT_MENU_ID;
    menu.hidden = true;
    Object.assign(menu.style, {
      position: "fixed",
      zIndex: 100000,
      minWidth: "200px",
      padding: "8px",
      borderRadius: "16px",
      background: "rgba(255, 255, 255, 0.98)",
      border: "1px solid rgba(15, 23, 42, 0.08)",
      boxShadow: "0 24px 48px rgba(15, 23, 42, 0.18)",
      backdropFilter: "blur(12px)",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    });
    document.body.appendChild(menu);
    return menu;
  }

  function hideContextMenu() {
    const menu = document.getElementById(CONTEXT_MENU_ID);
    if (!menu) return;
    menu.hidden = true;
    menu.innerHTML = "";
  }

  function createMenuItem(label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    Object.assign(button.style, {
      border: "0",
      background: "transparent",
      padding: "10px 12px",
      borderRadius: "12px",
      textAlign: "left",
      fontSize: "13px",
      color: "#0f172a",
      cursor: "pointer",
    });
    button.addEventListener("mouseenter", () => {
      button.style.background = "rgba(15, 118, 110, 0.08)";
    });
    button.addEventListener("mouseleave", () => {
      button.style.background = "transparent";
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      hideContextMenu();
      void onClick();
    });
    return button;
  }

  function showContextMenu(actions, x, y) {
    const menu = ensureContextMenu();
    menu.innerHTML = "";
    for (const action of actions) {
      menu.appendChild(createMenuItem(action.label, action.onClick));
    }

    menu.hidden = false;
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    const rect = menu.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width - 12;
    const maxTop = window.innerHeight - rect.height - 12;
    menu.style.left = `${Math.max(12, Math.min(x, maxLeft))}px`;
    menu.style.top = `${Math.max(12, Math.min(y, maxTop))}px`;
  }

  function getSidebarLinkFromTarget(target) {
    return target instanceof Element ? target.closest('nav a[href*="/c/"], aside a[href*="/c/"]') : null;
  }

  function bindContextMenu() {
    document.addEventListener("contextmenu", (event) => {
      const sidebarLink = getSidebarLinkFromTarget(event.target);
      const inMain = event.target instanceof Element && event.target.closest("main");

      if (!sidebarLink && !inMain) {
        hideContextMenu();
        return;
      }

      event.preventDefault();

      const actions = [];
      if (sidebarLink instanceof HTMLAnchorElement) {
        actions.push({ label: "??????", onClick: () => captureSidebarLink(sidebarLink) });
      }
      if (inMain) {
        actions.push({ label: "?????", onClick: captureCurrentPage });
      }
      actions.push({ label: "???????", onClick: captureSidebarBatch });
      actions.push({ label: "?? Atlas-X ??", onClick: () => {} });

      showContextMenu(actions, event.clientX, event.clientY);
    });

    document.addEventListener("click", () => hideContextMenu());
    document.addEventListener("scroll", () => hideContextMenu(), true);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") hideContextMenu();
    });
  }

  function boot() {
    ensureFloatingDock();
    injectSidebarButtons();
  }

  boot();
  bindContextMenu();
  const observer = new MutationObserver(() => boot());
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
