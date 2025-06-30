let unlockKey = null; // Stored in memory (not persisted)

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // 🔓 Handle vault unlock request
  if (msg.type === "UNLOCK_VAULT") {
    console.log("🔓 Unlocking vault with master password");
    unlockKey = msg.key;

    const state = {
      vault_unlocked: true,
      unlocked_at: Date.now(),
      timeout_minutes: 180
    };

    chrome.storage.session.set({ vault_state: state }, () => {
      console.log("✅ Vault session saved:", state);
      sendResponse({ success: true });
    });

    return true; // Keep message channel open for async response
  }

  // 📡 Check if vault is unlocked
  if (msg.type === "IS_VAULT_UNLOCKED") {
    chrome.storage.session.get("vault_state", (res) => {
      const state = res.vault_state;
      console.log("🔍 Checking vault session:", state);
      if (!state) return sendResponse({ unlocked: false });

      const now = Date.now();
      const elapsed = (now - state.unlocked_at) / 60000; // Minutes
      const isValid = elapsed <= state.timeout_minutes;

      console.log(`🕒 Session valid? ${isValid} (${elapsed.toFixed(2)} min elapsed)`);
      sendResponse({ unlocked: isValid });
    });

    return true; // async
  }

  // 🔑 Retrieve unlock key (only if still in memory)
  if (msg.type === "GET_UNLOCK_KEY") {
  if (unlockKey) {
    console.log("🔑 Unlock key already in memory.");
    return sendResponse({ key: unlockKey });
  }

  // Re-prompt user only to derive key again
  chrome.storage.session.get("vault_state", async (res) => {
    const state = res.vault_state;

    if (!state || !state.vault_unlocked) {
      return sendResponse({ key: null });
    }

    // Ask user again only to derive key
    const userPassword = prompt("VaultMate: Please re-enter your master password (session resumed)");
    if (!userPassword) return sendResponse({ key: null });

    unlockKey = userPassword;
    sendResponse({ key: unlockKey });
  });

  return true; // Keep message channel open
}

});
