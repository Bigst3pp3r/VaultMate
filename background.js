let unlockKey = null; // Not persisted, only in memory

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "UNLOCK_VAULT") {
    unlockKey = msg.key;

    chrome.storage.session.set({
      vault_state: {
        vault_unlocked: true,
        unlocked_at: Date.now(),
        timeout_minutes: 180
      }
    });
    sendResponse({ success: true });
  }

  if (msg.type === "IS_VAULT_UNLOCKED") {
    chrome.storage.session.get("vault_state", (res) => {
      const state = res.vault_state;
      if (!state) return sendResponse({ unlocked: false });

      const now = Date.now();
      const elapsed = (now - state.unlocked_at) / 60000; // in minutes

      if (elapsed > state.timeout_minutes) {
        sendResponse({ unlocked: false });
      } else {
        sendResponse({ unlocked: true });
      }
    });

    // Needed because we respond asynchronously
    return true;
  }

  if (msg.type === "GET_UNLOCK_KEY") {
    sendResponse({ key: unlockKey });
  }
});
