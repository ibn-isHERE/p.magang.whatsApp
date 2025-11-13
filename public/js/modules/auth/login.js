// Toggle password visibility
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

togglePassword.addEventListener("click", function () {
  const type =
    passwordInput.getAttribute("type") === "password" ? "text" : "password";
  passwordInput.setAttribute("type", type);
  this.classList.toggle("fa-eye");
  this.classList.toggle("fa-eye-slash");
});

// Show alert function
function showAlert(message, type = "error") {
  const alertBox = document.getElementById("alertBox");
  alertBox.className = `alert alert-${type}`;
  alertBox.innerHTML = `
        <i class="fa-solid fa-${
          type === "error" ? "circle-exclamation" : "circle-check"
        }"></i>
        ${message}
    `;
  alertBox.style.display = "block";

  setTimeout(() => {
    alertBox.style.display = "none";
  }, 5000);
}

// Handle form submission
document
  .getElementById("loginForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const rememberMe = document.getElementById("rememberMe").checked;
    const loginBtn = document.getElementById("loginBtn");

    // Disable button and show loading
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<div class="spinner"></div><span>Memproses...</span>';

    try {
      console.log("🔄 Sending login request...");
      console.log("Email:", email);
      console.log("Password:", password);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      console.log("✅ Response received!");
      console.log("Response status:", response.status);
      console.log("Response OK:", response.ok);

      const data = await response.json();

      console.log("✅ Data parsed!");
      console.log("📥 Full response data:", data);
      console.log("Data.success:", data.success);
      console.log("Data.token:", data.token);
      console.log("Data.user:", data.user);
      console.log("Token type:", typeof data.token);
      console.log("Token exists:", !!data.token);

      if (response.ok && data.success) {
        // Pilih storage berdasarkan "Ingat Saya"
        const storage = rememberMe ? localStorage : sessionStorage;

        console.log(
          "💾 Saving to:",
          rememberMe ? "localStorage" : "sessionStorage"
        );

        // SIMPAN token dan user
        storage.setItem("token", data.token);
        storage.setItem("user", JSON.stringify(data.user));

        // Verify saved data
        console.log("✅ Token saved:", storage.getItem("token"));
        console.log("✅ User saved:", storage.getItem("user"));
        console.log("✅ Token saved:", data.token.substring(0, 20) + "...");

        showAlert("Login berhasil! Mengalihkan...", "success");

        // Redirect to mainpage after short delay
        setTimeout(() => {
          console.log("🔄 Redirecting to mainpage...");
          window.location.href = "/mainpage.html";
        }, 1000);
      } else {
        console.error("❌ Login failed:", data.message);
        showAlert(data.message || "Email atau password salah!", "error");
        loginBtn.disabled = false;
        loginBtn.innerHTML =
          '<i class="fa-solid fa-right-to-bracket"></i><span>Masuk</span>';
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      showAlert("Terjadi kesalahan. Silakan coba lagi.", "error");
      loginBtn.disabled = false;
      loginBtn.innerHTML =
        '<i class="fa-solid fa-right-to-bracket"></i><span>Masuk</span>';
    }
  });
