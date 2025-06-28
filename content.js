console.log("🔍 VaultMate content script loaded.");

// Look for password fields on the page
const passwordFields = document.querySelectorAll('input[type="password"]');

if (passwordFields.length > 0) {
  console.log(`🔐 Found ${passwordFields.length} password field(s).`);

  // Highlighting them for testing (you can remove this later)
  passwordFields.forEach(field => {
    field.style.border = "2px solid #00bfff";
  });
}
