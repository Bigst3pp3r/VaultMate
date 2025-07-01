const MASTER_KEY_REQUIRED = false;

let unlockKey = MASTER_KEY_REQUIRED ? null : "VAULTMATE_DEV_KEY"; // Temporary static key if no prompt

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // 🔓 Unlock vault manually
  if (msg.type === "UNLOCK_VAULT") {
    console.log("🔓 Unlocking vault manually");
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

    return true;
  }

  // 📡 Check if vault is unlocked
  if (msg.type === "IS_VAULT_UNLOCKED") {
    if (!MASTER_KEY_REQUIRED) {
      return sendResponse({ unlocked: true }); // Always unlocked if disabled
    }

    chrome.storage.session.get("vault_state", (res) => {
      const state = res.vault_state;
      if (!state) return sendResponse({ unlocked: false });

      const now = Date.now();
      const elapsed = (now - state.unlocked_at) / 60000;
      const isValid = elapsed <= state.timeout_minutes;

      sendResponse({ unlocked: isValid });
    });

    return true;
  }

  // 🔑 Get master key
  if (msg.type === "GET_UNLOCK_KEY") {
    sendResponse({ key: unlockKey });
  }
});
