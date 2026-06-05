const SUPPORTED_PATTERNS = ["https://chatgpt.com/*", "https://chat.openai.com/*", "https://gemini.google.com/*"];
const CHATGPT_LINK_PATTERNS = ["https://chatgpt.com/c/*", "https://chat.openai.com/c/*"];
const GEMINI_LINK_PATTERNS = ["https://gemini.google.com/app/*"];

function createMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "atlasx-capture-current",
      title: "Atlas-X: capture current conversation",
      contexts: ["page", "selection"],
      documentUrlPatterns: SUPPORTED_PATTERNS,
    });

    chrome.contextMenus.create({
      id: "atlasx-capture-link",
      title: "Atlas-X: capture this conversation link",
      contexts: ["link"],
      documentUrlPatterns: SUPPORTED_PATTERNS,
      targetUrlPatterns: [...CHATGPT_LINK_PATTERNS, ...GEMINI_LINK_PATTERNS],
    });

    chrome.contextMenus.create({
      id: "atlasx-capture-sidebar-batch",
      title: "Atlas-X: batch capture sidebar",
      contexts: ["page"],
      documentUrlPatterns: SUPPORTED_PATTERNS,
    });
  });
}

chrome.runtime.onInstalled.addListener(createMenus);
chrome.runtime.onStartup.addListener(createMenus);

async function sendToActiveTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await chrome.tabs.sendMessage(tab.id, message);
}

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "atlasx-capture-current") {
    void sendToActiveTab({ type: "ATLASX_CAPTURE_CURRENT", selectionText: info.selectionText || "" });
  }

  if (info.menuItemId === "atlasx-capture-link") {
    void sendToActiveTab({ type: "ATLASX_CAPTURE_LINK", linkUrl: info.linkUrl || "" });
  }

  if (info.menuItemId === "atlasx-capture-sidebar-batch") {
    void sendToActiveTab({ type: "ATLASX_CAPTURE_BATCH" });
  }
});
