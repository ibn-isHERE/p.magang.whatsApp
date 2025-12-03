// login.js - FIXED VERSION (Persistent Session - No Remember Me)

// Toggle password visibility
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

togglePassword.addEventListener("click", function () {
  const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
  passwordInput.setAttribute("type", type);
  this.classList.toggle("fa-eye");
  this.classList.toggle("fa-eye-slash");
});

// Fungsi tampilkan alert
function showAlert(message, type = "error") {
  const alertBox = document.getElementById("alertBox");
  alertBox.className = `alert alert-${type}`;
  alertBox.innerHTML = `
    <i class="fa-solid fa-${type === "error" ? "circle-exclamation" : "circle-check"}"></i>
    <span>${message}</span>
  `;
  alertBox.style.display = "flex";

  setTimeout(() => {
    alertBox.style.display = "none";
  }, 5000);
}

// Handle form submission
document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const loginBtn = document.getElementById("loginBtn");

  // Disable button dan tampilkan loading
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<div class="spinner"></div><span>Memproses...</span>';

  try {
    console.log("Mengirim permintaan login...");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    console.log("Response diterima - Status:", response.status);

    const data = await response.json();
    console.log("Data response:", { success: data.success, hasToken: !!data.token });

    if (response.ok && data.success) {
      // SOLUSI: SELALU simpan ke localStorage agar persisten
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      // Simpan lastActivity untuk activity tracking
      const now = Date.now();
      localStorage.setItem("lastActivity", data.user.lastActivity || now);

      console.log("Token berhasil disimpan ke localStorage (persisten)");
      console.log("Data user berhasil disimpan:", data.user.name);
      console.log("Activity tracking diinisialisasi");

      showAlert("Login berhasil! Mengalihkan...", "success");

      // Redirect ke mainpage setelah delay singkat
      setTimeout(() => {
        console.log("Mengalihkan ke mainpage...");
        window.location.href = "/mainpage.html";
      }, 1000);
    } else {
      console.error("Login gagal:", data.message);
      showAlert(data.message || "Email atau password salah!", "error");
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><span>Masuk</span>';
    }
  } catch (error) {
    console.error("Error login:", error);
    showAlert("Terjadi kesalahan. Silakan coba lagi.", "error");
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><span>Masuk</span>';
  }
});