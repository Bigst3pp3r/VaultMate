// Content script to find password fields on the page
document.getElementById("generate").addEventListener("click", () => {
  const password = generatePassword(16);
  document.getElementById("result").textContent = password;
});

// Function to generate a random password
function generatePassword(length) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-="; // Define the character set for the password
  let password = "";
  const array = new Uint32Array(length);
  window.crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  return password; // Return the generated password
}
