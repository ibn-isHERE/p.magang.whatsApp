// ===========================
// USER MANAGEMENT MODULE - FIXED
// ===========================

let users = [];

// Helper function to get token from either storage
function getAuthToken() {
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

// Check if user is authenticated
function checkAuthentication() {
  const token = getAuthToken();
  if (!token) {
    Swal.fire({
      icon: "error",
      title: "Sesi Berakhir",
      text: "Silakan login kembali",
      confirmButtonText: "OK",
    }).then(() => {
      window.location.href = "/login.html";
    });
    return false;
  }
  return true;
}

// Load Users from API
async function loadUsersList() {
  const tbody = document.getElementById("user-management-tbody");

  // Check authentication first
  if (!checkAuthentication()) {
    return;
  }

  // Show loading state
  tbody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align: center; padding: 40px">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; color: #4299e1"></i>
        <p style="color: #a0aec0; margin-top: 12px">Memuat data users...</p>
      </td>
    </tr>
  `;

  try {
    const token = getAuthToken();
    console.log("🔑 Token found:", token ? "YES" : "NO");
    
    const response = await fetch("/api/auth/users", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("📡 Response status:", response.status);

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      Swal.fire({
        icon: "error",
        title: "Sesi Berakhir",
        text: "Silakan login kembali",
        confirmButtonText: "OK",
      }).then(() => {
        window.location.href = "/login.html";
      });
      return;
    }

    const data = await response.json();
    console.log("📦 Response data:", data);

    if (!response.ok) {
      throw new Error(data.message || "Gagal memuat data users");
    }

    // Validate data structure
    if (!data.success) {
      throw new Error(data.message || "Response tidak valid");
    }

    if (!data.users || !Array.isArray(data.users)) {
      throw new Error("Format data users tidak valid");
    }

    users = data.users;

    if (users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px">
            <i class="fa-solid fa-users" style="font-size: 48px; color: #cbd5e0"></i>
            <p style="color: #a0aec0; margin-top: 12px">Belum ada user terdaftar</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = users
      .map(
        (user) => `
        <tr>
          <td>${escapeHtml(user.name)}</td>
          <td>${escapeHtml(user.email)}</td>
          <td>
            <span class="role-badge ${user.role}">
              ${user.role}
            </span>
          </td>
          <td>
            <span class="status-badge ${user.is_active ? "active" : "inactive"}">
              <i class="fa-solid fa-circle"></i>
              ${user.is_active ? "Aktif" : "Nonaktif"}
            </span>
          </td>
          <td>${formatLastLogin(user.last_login)}</td>
          <td>
            <div class="action-buttons">
              <button class="btn-action btn-edit" onclick="editUserCrud(${user.id})">
                <i class="fa-solid fa-edit"></i> Edit
              </button>
              <button class="btn-action btn-delete" onclick="deleteUserCrud(${user.id})">
                <i class="fa-solid fa-trash"></i> Hapus
              </button>
            </div>
          </td>
        </tr>
      `
      )
      .join("");
  } catch (error) {
    console.error("❌ Error loading users:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: #fc8181;">
          <i class="fa-solid fa-exclamation-triangle" style="font-size: 32px;"></i>
          <p style="margin-top: 12px">Gagal memuat data: ${escapeHtml(error.message)}</p>
          <button class="btn-action btn-edit" onclick="loadUsersList()" style="margin-top: 12px;">
            <i class="fa-solid fa-refresh"></i> Coba Lagi
          </button>
        </td>
      </tr>
    `;
  }
}

// Format Last Login
function formatLastLogin(lastLogin) {
  if (!lastLogin) return "Belum pernah login";

  const date = new Date(lastLogin);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit yang lalu`;
  if (diffHours < 24) return `${diffHours} jam yang lalu`;
  if (diffDays < 7) return `${diffDays} hari yang lalu`;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Reset Form
function resetUserCrudForm() {
  document.getElementById("user-crud-id").value = "";
  document.getElementById("user-crud-name").value = "";
  document.getElementById("user-crud-email").value = "";
  document.getElementById("user-crud-password").value = "";
  document.getElementById("user-crud-role").value = "";
  document.getElementById("user-crud-active").checked = true;

  const submitBtn = document.getElementById("user-crud-submit");
  const cancelBtn = document.getElementById("user-crud-cancel");
  const hintText = document.getElementById("user-password-hint");

  if (submitBtn)
    submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Tambah User';
  if (cancelBtn) cancelBtn.style.display = "none";
  if (hintText) hintText.textContent = "";
}

// Edit User Function
async function editUserCrud(userId) {
  const user = users.find((u) => u.id === userId);
  if (!user) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "User tidak ditemukan",
    });
    return;
  }

  document.getElementById("user-crud-id").value = user.id;
  document.getElementById("user-crud-name").value = user.name;
  document.getElementById("user-crud-email").value = user.email;
  document.getElementById("user-crud-password").value = "";
  document.getElementById("user-crud-role").value = user.role;
  document.getElementById("user-crud-active").checked = user.is_active;

  document.getElementById("user-crud-submit").innerHTML =
    '<i class="fa-solid fa-save"></i> Update User';
  document.getElementById("user-crud-cancel").style.display = "inline-block";
  document.getElementById("user-password-hint").textContent =
    "(Kosongkan jika tidak ingin mengubah password)";

  // Scroll to form
  const formContainer = document.getElementById("userManagementFormContainer");
  if (formContainer) {
    formContainer.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

// Delete User Function
async function deleteUserCrud(userId) {
  const user = users.find((u) => u.id === userId);
  if (!user) return;

  const result = await Swal.fire({
    title: "Konfirmasi Hapus",
    html: `Apakah Anda yakin ingin menghapus user:<br><strong>${escapeHtml(user.name)}</strong>?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#fc8181",
    cancelButtonColor: "#a0aec0",
    confirmButtonText: "Ya, Hapus!",
    cancelButtonText: "Batal",
  });

  if (!result.isConfirmed) return;

  try {
    const token = getAuthToken();
    const response = await fetch(`/api/auth/users/${userId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      Swal.fire({
        icon: "error",
        title: "Sesi Berakhir",
        text: "Silakan login kembali",
        confirmButtonText: "OK",
      }).then(() => {
        window.location.href = "/login.html";
      });
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal menghapus user");
    }

    Swal.fire({
      icon: "success",
      title: "Berhasil!",
      text: "User berhasil dihapus",
      timer: 2000,
      showConfirmButton: false,
    });

    loadUsersList();
  } catch (error) {
    console.error("Error deleting user:", error);
    Swal.fire({
      icon: "error",
      title: "Gagal!",
      text: error.message,
    });
  }
}

// Initialize User Management Form
document.addEventListener("DOMContentLoaded", function () {
  const userCrudForm = document.getElementById("user-crud-form");
  if (userCrudForm) {
    userCrudForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      if (!checkAuthentication()) {
        return;
      }

      const userId = document.getElementById("user-crud-id").value;
      const name = document.getElementById("user-crud-name").value.trim();
      const email = document.getElementById("user-crud-email").value.trim();
      const password = document.getElementById("user-crud-password").value;
      const role = document.getElementById("user-crud-role").value;
      const isActive = document.getElementById("user-crud-active").checked;

      // Validation
      if (!name || !email || !role) {
        Swal.fire({
          icon: "warning",
          title: "Data Tidak Lengkap",
          text: "Mohon lengkapi semua field yang wajib diisi",
        });
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Swal.fire({
          icon: "warning",
          title: "Email Tidak Valid",
          text: "Mohon masukkan email yang valid",
        });
        return;
      }

      // Password validation for new user
      if (!userId && !password) {
        Swal.fire({
          icon: "warning",
          title: "Password Diperlukan",
          text: "Password wajib diisi untuk user baru",
        });
        return;
      }

      if (password && password.length < 6) {
        Swal.fire({
          icon: "warning",
          title: "Password Terlalu Pendek",
          text: "Password minimal 6 karakter",
        });
        return;
      }

      const userData = {
        name,
        email,
        role,
        is_active: isActive,
      };

      if (password) {
        userData.password = password;
      }

      try {
        const url = userId ? `/api/auth/users/${userId}` : "/api/auth/users";
        const method = userId ? "PUT" : "POST";
        const token = getAuthToken();

        const response = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(userData),
        });

        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          
          Swal.fire({
            icon: "error",
            title: "Sesi Berakhir",
            text: "Silakan login kembali",
            confirmButtonText: "OK",
          }).then(() => {
            window.location.href = "/login.html";
          });
          return;
        }

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Terjadi kesalahan");
        }

        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: userId ? "User berhasil diupdate" : "User berhasil ditambahkan",
          timer: 2000,
          showConfirmButton: false,
        });

        // Reset form
        resetUserCrudForm();

        // Reload user list
        loadUsersList();
      } catch (error) {
        console.error("Error saving user:", error);
        Swal.fire({
          icon: "error",
          title: "Gagal!",
          text: error.message,
        });
      }
    });
  }

  // Cancel button
  const cancelBtn = document.getElementById("user-crud-cancel");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", resetUserCrudForm);
  }
});

// Make functions globally available
window.loadUsersList = loadUsersList;
window.editUserCrud = editUserCrud;
window.deleteUserCrud = deleteUserCrud;
window.resetUserCrudForm = resetUserCrudForm;

// ✅ AUTO LOAD saat tab User Management dibuka
document.addEventListener("DOMContentLoaded", function () {
  // Observe sidebar menu clicks
  const userManagementBtn = document.querySelector('[data-form="user"]');
  if (userManagementBtn) {
    userManagementBtn.addEventListener("click", function () {
      console.log("🔄 Loading users list...");
      loadUsersList();
    });
  }

  // Check if User Management tab is already active on page load
  const userContainer = document.getElementById("userManagementMainContainer");
  if (userContainer && userContainer.style.display !== "none") {
    console.log("🔄 User Management already active, loading users...");
    loadUsersList();
  }
});