console.log("🔍 VaultMate content script loaded."); 

// Look for password fields
const passwordFields = document.querySelectorAll('input[type="password"]');

passwordFields.forEach((field, index) => {
  // Skip if already injected
  if (field.dataset.vaultmateInjected) return;

  field.dataset.vaultmateInjected = "true";

  const btn = document.createElement("button");
  btn.innerText = "🔒";
  btn.title = "Generate Password";
  btn.style.position = "absolute";
  btn.style.zIndex = "1000";
  btn.style.padding = "4px 6px";
  btn.style.borderRadius = "4px";
  btn.style.border = "none";
  btn.style.cursor = "pointer";
  btn.style.background = "#00bfff";
  btn.style.color = "#fff";
  btn.style.fontSize = "12px";

  // Position button next to the field
  const rect = field.getBoundingClientRect();
  btn.style.top = `${window.scrollY + rect.top}px`;
  btn.style.left = `${window.scrollX + rect.right + 5}px`;

  btn.addEventListener("click", async () => {
  const generatedPassword = generatePassword(16);
  field.value = generatedPassword;

  // Ask for master password (basic prompt for now)
  const masterPassword = prompt("Enter your VaultMate master password:");
  if (!masterPassword) return;

  // Encrypt the password
  const encryptedData = await encryptPassword(masterPassword, generatedPassword);

  // Store it locally (keyed by site origin for now)
  const site = window.location.origin;
  chrome.storage.local.get(["vault_data"], (res) => {
    const vault = res.vault_data || {};
    if (!vault[site]) vault[site] = [];

    vault[site].push({
      password: encryptedData,
      created_at: new Date().toISOString()
    });

    chrome.storage.local.set({ vault_data: vault }, () => {
      console.log("🔒 Password saved securely for", site);
    });
  });
});


  // Insert into page
  document.body.appendChild(btn);
});

// Simple generator (reused from popup)
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

async function encryptPassword(masterPassword, plaintext) {
  const encoder = new TextEncoder();

  // Generate a random salt
  const salt = window.crypto.getRandomValues(new Uint8Array(16));

  // Derive key using PBKDF2
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw", encoder.encode(masterPassword), "PBKDF2", false, ["deriveKey"]
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encoder.encode(plaintext)
  );

  // Return encrypted data as base64 with salt + iv
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    salt: Array.from(salt),
    iv: Array.from(iv)
  };
}

