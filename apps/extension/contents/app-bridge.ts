/**
 * Content script injected on Influuc web app pages.
 * Announces the extension ID to the host page so the capture page
 * can send scrape commands via chrome.runtime.sendMessage without
 * needing a hardcoded extension ID.
 */
export const config = {
  matches: ["https://influuc-two.vercel.app/*", "http://localhost:3000/*"],
};

function announce() {
  window.postMessage({ type: "__INFLUUC_EXT", id: chrome.runtime.id }, "*");
}

announce();

window.addEventListener("message", (e: MessageEvent) => {
  if (e.data?.type === "__INFLUUC_PING") announce();
});
