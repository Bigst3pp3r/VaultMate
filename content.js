const MASTER_KEY_REQUIRED = false;

const STATIC_DEV_KEY = "vaultmate-dev";

console.log("🔍 VaultMate content script loaded.");

// Encryption Key Resolver
async function getEncryptionKey() {
  if (!MASTER_KEY_REQUIRED) return STATIC_DEV_KEY;

  return await ensureVaultUnlocked();
}

// Ensure Vault is Unlocked
async function ensureVaultUnlocked() {
  if (!MASTER_KEY_REQUIRED) return "vaultmate-dev";

  const masterPassword = prompt("VaultMate: Enter your master password to decrypt");
  return masterPassword || null;
}


// --- Detect Password Fields and Inject Button ---
const passwordFields = document.querySelectorAll('input[type="password"]');

passwordFields.forEach((field) => {
  if (field.dataset.vaultmateInjected) return;

  field.dataset.vaultmateInjected = "true";

  const btn = document.createElement("button");
  btn.innerText = "🔒";
  btn.title = "Generate Password";
  Object.assign(btn.style, {
    position: "absolute",
    zIndex: "1000",
    padding: "4px 6px",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
    background: "#00bfff",
    color: "#fff",
    fontSize: "12px"
  });

  const rect = field.getBoundingClientRect();
  btn.style.top = `${window.scrollY + rect.top}px`;
  btn.style.left = `${window.scrollX + rect.right + 5}px`;

  btn.addEventListener("click", async () => {
  const generatedPassword = generatePassword(16);
  field.value = generatedPassword;

  const masterPassword = "vaultmate-dev"; // Always use static for encryption

  const usernameField = document.querySelector(
    'input[type="email"], input[name*="user"], input[name*="email"], input[name*="login"], input[type="text"]'
  );
  const username = usernameField ? usernameField.value : null;

  const encryptedPassword = await encryptPassword(masterPassword, generatedPassword);
  const encryptedUsername = username
    ? await encryptPassword(masterPassword, username)
    : null;

  const site = window.location.origin;
  chrome.storage.local.get(["vault_data"], (res) => {
    const vault = res.vault_data || {};
    if (!vault[site]) vault[site] = [];

    vault[site].push({
      password: encryptedPassword,
      username: encryptedUsername,
      created_at: new Date().toISOString()
    });

    chrome.storage.local.set({ vault_data: vault }, () => {
      console.log("🔒 New credentials saved for", site);
    });
  });
});

  document.body.appendChild(btn);
});

// --- Autofill ---
(async function autoFillVaultmate() {
  const site = window.location.origin;

  chrome.storage.local.get(["vault_data"], async (res) => {
    const vault = res.vault_data || {};
    const entries = vault[site];
    if (!entries || entries.length === 0) return;

    const latest = entries[entries.length - 1];

    // Use static key or prompt depending on config
    let masterKey = "vaultmate-dev";
    if (MASTER_KEY_REQUIRED) {
      masterKey = await ensureVaultUnlocked();
      if (!masterKey) return; // User cancelled
    }

    try {
      const decryptedPassword = await decryptPassword(masterKey, latest.password);
      const decryptedUsername = latest.username
        ? await decryptPassword(masterKey, latest.username)
        : null;

      const passwordField = document.querySelector('input[type="password"]');
      if (passwordField) passwordField.value = decryptedPassword;

      const usernameField = document.querySelector(
        'input[type="email"], input[name*="user"], input[name*="email"], input[name*="login"], input[type="text"]'
      );
      if (usernameField && decryptedUsername) usernameField.value = decryptedUsername;

      console.log("✅ VaultMate autofilled credentials");
    } catch (err) {
      console.error("❌ VaultMate failed to decrypt:", err);

      if (MASTER_KEY_REQUIRED) {
        alert("VaultMate: Incorrect master password or corrupt data.");
      }
    }
  });
})();



// --- Unmask Protection (kept with master key) ---
passwordFields.forEach((field) => {
  const observer = new MutationObserver(async (mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.attributeName === "type" &&
        field.type === "text" &&
        !field.dataset.vaultmateUnmasked
      ) {
        const key = await ensureVaultUnlocked();
        if (key) {
          field.dataset.vaultmateUnmasked = "true";
        } else {
          field.type = "password";
          alert("VaultMate: Unlock required to view password.");
        }
      }
    }
  });

  observer.observe(field, { attributes: true });
});

// --- Encrypt / Decrypt ---
async function encryptPassword(masterPassword, plaintext) {
  const encoder = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const key = await window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 300000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    salt: Array.from(salt),
    iv: Array.from(iv)
  };
}

async function decryptPassword(masterPassword, encryptedObj) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const { ciphertext, salt, iv } = encryptedObj;

  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array(salt),
      iterations: 250000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["decrypt"]
  );

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
  );

  return decoder.decode(decrypted);
}

// --- Generator ---
function generatePassword(length) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";
  let password = "";
  const array = new Uint32Array(length);
  window.crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  return password;
}
