// login.js - FIXED VERSION (Persistent Session)

// Toggle password visibility
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

togglePassword.addEventListener("click", function () {
  const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
  passwordInput.setAttribute("type", type);
  this.classList.toggle("fa-eye");
  this.classList.toggle("fa-eye-slash");
});

// Show alert function
function showAlert(message, type = "error") {
  const alertBox = document.getElementById("alertBox");
  alertBox.className = `alert alert-${type}`;
  alertBox.innerHTML = `
    <i class="fa-solid fa-${type === "error" ? "circle-exclamation" : "circle-check"}"></i>
    ${message}
  `;
  alertBox.style.display = "block";

  setTimeout(() => {
    alertBox.style.display = "none";
  }, 5000);
}

// Handle form submission
document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const rememberMe = document.getElementById("rememberMe").checked;
  const loginBtn = document.getElementById("loginBtn");

  // Disable button and show loading
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<div class="spinner"></div><span>Memproses...</span>';

  try {
    console.log("📤 Sending login request...");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, rememberMe }),
    });

    console.log("✅ Response received - Status:", response.status);

    const data = await response.json();
    console.log("📥 Response data:", { success: data.success, hasToken: !!data.token });

    if (response.ok && data.success) {
      // ✅ SOLUSI: SELALU simpan ke localStorage agar persisten
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      // ✅ Simpan lastActivity untuk activity tracking
      const now = Date.now();
      localStorage.setItem("lastActivity", data.user.lastActivity || now);
      
      // 🔒 Simpan flag "rememberMe" untuk keperluan UI
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberMe");
      }

      console.log("✅ Token saved to localStorage (persistent)");
      console.log("✅ User data saved:", data.user.name);
      console.log("✅ Activity tracking initialized");

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
      loginBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><span>Masuk</span>';
    }
  } catch (error) {
    console.error("❌ Login error:", error);
    showAlert("Terjadi kesalahan. Silakan coba lagi.", "error");
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><span>Masuk</span>';
  }
});