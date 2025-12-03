let users = [];

// Helper function untuk mendapatkan token dari storage
function getAuthToken() {
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

// Cek apakah user terautentikasi
function checkAuthentication() {
  const token = getAuthToken();
  if (!token) {
    Swal.fire({
      icon: "error",
      title: "Sesi Berakhir",
      text: "Silakan login kembali",
      confirmButtonText: "OK",
    }).then(() => {
      window.location.href = "/index.html";
    });
    return false;
  }
  return true;
}

// Load Users dari API
async function loadUsersList() {
  const tbody = document.getElementById("user-management-tbody");

  if (!checkAuthentication()) {
    return;
  }

  tbody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align: center; padding: 40px">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; color: #4299e1"></i>
        <p style="color: #a0aec0; margin-top: 12px">Memuat data users...</p>
      </td>
    </tr>
  `;

  try {
    const token = getAuthToken();
    
    const response = await fetch("/api/auth/users", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

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
        window.location.href = "/index.html";
      });
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal memuat data users");
    }

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
          <td colspan="5" style="text-align: center; padding: 40px">
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
          <td>
            <div class="action-buttons">
              <button class="btn-action btn-edit" onclick="openEditUserModal(${user.id})">
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
    console.error("Error loading users:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: #fc8181;">
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

// Escape HTML untuk mencegah XSS
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

// Buka Modal Edit User
function openEditUserModal(userId) {
  const user = users.find((u) => u.id === userId);
  if (!user) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "User tidak ditemukan",
    });
    return;
  }

  const modalContent = `
    <div id="editUserModal" class="edit-modal" style="display: flex;">
      <div class="edit-modal-content" style="max-width: 600px;">
        <div class="edit-modal-header">
          <h2>Edit User</h2>
          <button class="edit-modal-close" onclick="closeEditUserModal()">
            &times;
          </button>
        </div>
        <div class="edit-modal-body" style="padding: 24px;">
          <form id="editUserForm">
            <input type="hidden" id="edit-user-id" value="${user.id}" />

            <div class="form-group" style="margin-bottom: 20px;">
              <label for="edit-user-name">
                <i class="fa-solid fa-user"></i> Nama Lengkap:
              </label>
              <input
                type="text"
                id="edit-user-name"
                value="${escapeHtml(user.name)}"
                placeholder="Nama Lengkap"
                required
                style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 8px;"
              />
            </div>

            <div class="form-group" style="margin-bottom: 20px;">
              <label for="edit-user-email">
                <i class="fa-solid fa-envelope"></i> Email:
              </label>
              <input
                type="email"
                id="edit-user-email"
                value="${escapeHtml(user.email)}"
                placeholder="email@example.com"
                required
                style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 8px;"
              />
            </div>

            <div class="form-group" style="margin-bottom: 20px;">
              <label for="edit-user-password">
                <i class="fa-solid fa-lock"></i> Password:
              </label>
              <div class="input-wrapper" style="position: relative; margin-top: 8px;">
                <input
                  type="password"
                  id="edit-user-password"
                  placeholder="Kosongkan jika tidak ingin mengubah"
                  style="width: 100%; padding: 12px 40px 12px 12px; border: 1px solid #e2e8f0; border-radius: 8px;"
                />
                <i
                  class="fa-solid fa-eye"
                  id="toggleEditPassword"
                  style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #a0aec0;"
                ></i>
              </div>
              <small style="display: block; color: #718096; margin-top: 4px; font-size: 12px;">
                Kosongkan jika tidak ingin mengubah password
              </small>
            </div>

            <div class="form-group" style="margin-bottom: 20px;">
              <label for="edit-user-role">
                <i class="fa-solid fa-user-tag"></i> Role:
              </label>
              <select 
                id="edit-user-role" 
                required
                style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 8px;"
              >
                <option value="">-- Pilih Role --</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                <option value="operator" ${user.role === 'operator' ? 'selected' : ''}>Operator</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 24px;">
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                <input
                  type="checkbox"
                  id="edit-user-active"
                  ${user.is_active ? 'checked' : ''}
                  style="width: 18px; height: 18px; cursor: pointer;"
                />
                <span><i class="fa-solid fa-check-circle"></i> User Aktif</span>
              </label>
            </div>

            <div style="display: flex; gap: 12px; margin-top: 24px;">
              <button
                type="button"
                onclick="closeEditUserModal()"
                style="flex: 1; padding: 12px; background-color: #a0aec0; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;"
              >
                <i class="fa-solid fa-times"></i> Batal
              </button>
              <button
                type="submit"
                style="flex: 1; padding: 12px; background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;"
              >
                <i class="fa-solid fa-save"></i> Update User
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  const existingModal = document.getElementById("editUserModal");
  if (existingModal) {
    existingModal.remove();
  }

  document.body.insertAdjacentHTML("beforeend", modalContent);

  const togglePassword = document.getElementById("toggleEditPassword");
  const passwordInput = document.getElementById("edit-user-password");
  
  togglePassword.addEventListener("click", function () {
    const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);
    this.classList.toggle("fa-eye");
    this.classList.toggle("fa-eye-slash");
  });

  const editForm = document.getElementById("editUserForm");
  editForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    await handleEditUserSubmit();
  });

  const modal = document.getElementById("editUserModal");
  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      closeEditUserModal();
    }
  });
}

// Tutup Modal Edit User
function closeEditUserModal() {
  const modal = document.getElementById("editUserModal");
  if (modal) {
    modal.remove();
  }
}

// Handle Submit Form Edit User
async function handleEditUserSubmit() {
  if (!checkAuthentication()) {
    return;
  }

  const userId = document.getElementById("edit-user-id").value;
  const name = document.getElementById("edit-user-name").value.trim();
  const email = document.getElementById("edit-user-email").value.trim();
  const password = document.getElementById("edit-user-password").value;
  const role = document.getElementById("edit-user-role").value;
  const isActive = document.getElementById("edit-user-active").checked;

  if (!name || !email || !role) {
    Swal.fire({
      icon: "warning",
      title: "Data Tidak Lengkap",
      text: "Mohon lengkapi semua field yang wajib diisi",
    });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    Swal.fire({
      icon: "warning",
      title: "Email Tidak Valid",
      text: "Mohon masukkan email yang valid",
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
    const token = getAuthToken();

    const response = await fetch(`/api/auth/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });

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
        window.location.href = "/index.html";
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
      text: "User berhasil diupdate",
      timer: 2000,
      showConfirmButton: false,
    });

    closeEditUserModal();
    loadUsersList();
  } catch (error) {
    console.error("Error updating user:", error);
    Swal.fire({
      icon: "error",
      title: "Gagal!",
      text: error.message,
    });
  }
}

// Fungsi Delete User
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
        window.location.href = "/index.html";
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

// Inisialisasi Password Toggle untuk Form ADD User
function initPasswordToggle() {
  const passwordInput = document.getElementById("user-crud-password");
  if (!passwordInput) return;

  const existingToggle = passwordInput.parentElement.querySelector('.password-toggle');
  if (existingToggle) return;

  let wrapper = passwordInput.parentElement;
  if (wrapper.tagName !== 'DIV' || !wrapper.classList.contains('input-wrapper')) {
    wrapper = document.createElement('div');
    wrapper.className = 'input-wrapper';
    wrapper.style.cssText = 'position: relative; margin-top: 8px;';
    passwordInput.parentNode.insertBefore(wrapper, passwordInput);
    wrapper.appendChild(passwordInput);
  } else {
    wrapper.style.position = 'relative';
  }

  const toggleIcon = document.createElement('i');
  toggleIcon.className = 'fa-solid fa-eye password-toggle';
  toggleIcon.style.cssText = 'position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #a0aec0; z-index: 10;';
  
  wrapper.appendChild(toggleIcon);
  
  toggleIcon.addEventListener('click', function() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
  });

  passwordInput.style.paddingRight = '40px';
}

// Handle Tambah User Baru
async function handleAddUserSubmit(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  console.log("Form submit triggered");

  if (!checkAuthentication()) {
    console.log("Authentication failed");
    return false;
  }

  const name = document.getElementById("user-crud-name").value.trim();
  const email = document.getElementById("user-crud-email").value.trim();
  const password = document.getElementById("user-crud-password").value;
  const role = document.getElementById("user-crud-role").value;
  const isActive = document.getElementById("user-crud-active").checked;

  // Validasi
  if (!name || !email || !role || !password) {
    Swal.fire({
      icon: "warning",
      title: "Data Tidak Lengkap",
      text: "Mohon lengkapi semua field yang wajib diisi",
    });
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    Swal.fire({
      icon: "warning",
      title: "Email Tidak Valid",
      text: "Mohon masukkan email yang valid",
    });
    return false;
  }

  if (password.length < 6) {
    Swal.fire({
      icon: "warning",
      title: "Password Terlalu Pendek",
      text: "Password minimal 6 karakter",
    });
    return false;
  }

  const userData = {
    name,
    email,
    password,
    role,
    is_active: isActive,
  };

  try {
    const token = getAuthToken();

    const response = await fetch("/api/auth/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });

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
        window.location.href = "/index.html";
      });
      return false;
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Terjadi kesalahan saat menambahkan user");
    }

    Swal.fire({
      icon: "success",
      title: "Berhasil!",
      text: "User berhasil ditambahkan",
      timer: 2000,
      showConfirmButton: false,
    });

    resetUserCrudForm();
    await loadUsersList();

    return false;

  } catch (error) {
    console.error("Error adding user:", error);
    Swal.fire({
      icon: "error",
      title: "Gagal!",
      text: error.message,
    });
    return false;
  }
}

// INISIALISASI
(function() {
  console.log("USER MANAGEMENT MODULE LOADING...");
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUserManagement);
  } else {
    initUserManagement();
  }
})();

function initUserManagement() {
  console.log("INITIALIZING USER MANAGEMENT");

  const userCrudForm = document.getElementById("user-crud-form");
  
  if (!userCrudForm) {
    console.warn("Form not found: user-crud-form - Will retry in 500ms");
    setTimeout(initUserManagement, 500);
    return;
  }

  console.log("Form found:", userCrudForm);
  
  userCrudForm.removeAttribute('action');
  userCrudForm.removeAttribute('method');
  
  userCrudForm.onsubmit = function(e) {
    return handleAddUserSubmit(e);
  };
  
  userCrudForm.addEventListener('submit', function(e) {
    return handleAddUserSubmit(e);
  }, true);
  
  console.log("Form handlers attached");
  
  setTimeout(initPasswordToggle, 100);

  const cancelBtn = document.getElementById("user-crud-cancel");
  if (cancelBtn) {
    cancelBtn.onclick = function(e) {
      e.preventDefault();
      resetUserCrudForm();
      return false;
    };
  }

  const userManagementBtn = document.querySelector('[data-form="user"]');
  if (userManagementBtn) {
    userManagementBtn.addEventListener("click", function () {
      setTimeout(() => loadUsersList(), 100);
    });
  }

  const userContainer = document.getElementById("userManagementMainContainer");
  if (userContainer && userContainer.style.display !== "none") {
    setTimeout(() => loadUsersList(), 100);
  }
}

// Buat fungsi tersedia secara global
window.loadUsersList = loadUsersList;
window.openEditUserModal = openEditUserModal;
window.closeEditUserModal = closeEditUserModal;
window.deleteUserCrud = deleteUserCrud;
window.resetUserCrudForm = resetUserCrudForm;
window.handleAddUserSubmit = handleAddUserSubmit;