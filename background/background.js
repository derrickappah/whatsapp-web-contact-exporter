/**
 * WhatsApp Web Exporter - Background Service Worker (Manifest V3)
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[WA-Exporter] Extension successfully installed.');
  }
});

// Listener for any background notifications or messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'GET_EXTENSION_INFO') {
    sendResponse({ version: chrome.runtime.getManifest().version });
  }
  return true;
});
