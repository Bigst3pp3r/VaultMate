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

  // Add click behavior (just logs for now)
  btn.addEventListener("click", () => {
    console.log("🔐 Generate password clicked for field", index);
    const password = generatePassword(16);
    field.value = password;
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
