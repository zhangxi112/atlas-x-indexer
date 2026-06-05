async function sendToActiveTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab found");
  return chrome.tabs.sendMessage(tab.id, message);
}

function setStatus(message) {
  document.getElementById("status").textContent = message;
}

document.getElementById("capture-current").addEventListener("click", async () => {
  try {
    await sendToActiveTab({ type: "ATLASX_CAPTURE_CURRENT" });
    setStatus("Capture request sent");
  } catch (error) {
    console.error(error);
    setStatus("Capture failed. Open ChatGPT/Gemini and start the desktop app.");
  }
});

document.getElementById("capture-batch").addEventListener("click", async () => {
  try {
    await sendToActiveTab({ type: "ATLASX_CAPTURE_BATCH" });
    setStatus("Batch capture request sent");
  } catch (error) {
    console.error(error);
    setStatus("Batch capture failed. Open ChatGPT/Gemini and start the desktop app.");
  }
});
