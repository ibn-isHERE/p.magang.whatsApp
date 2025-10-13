// group-manager.js - Group Management Module with Edit Modal

import { 
  contacts, 
  fetchAndRenderContacts,
} from './contact-manager.js';

import {
  showEditGroupModal,
  closeEditGroupModal
} from './ui-helpers.js';

let groups = [];
export let selectedGroupMembers = new Set();
export let selectedEditGroupMembers = new Set(); // ✅ NEW: For edit modal

/**
 * Fetches groups from server and renders them
 */
export async function fetchAndRenderGroups() {
  try {
    const res = await fetch("/api/groups");
    const result = await res.json();

    if (!res.ok || !result.data) {
      throw new Error("Gagal memuat grup dari server.");
    }

    groups = result.data.sort((a, b) => a.name.localeCompare(b.name));
    renderGroupTable();
    renderGroupContactChecklist();
  } catch (error) {
    console.error("Error fetching groups:", error);
    Swal.fire("Error", error.message, "error");
  }
}

/**
 * Renders groups in the management table
 */
function renderGroupTable() {
  const tbody = document.getElementById("group-management-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  
  if (groups.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Belum ada grup</td></tr>';
    return;
  }

  groups.forEach((group) => {
    const row = document.createElement("tr");
    
    let memberCount = 0;
    try {
      const members = JSON.parse(group.members || '[]');
      memberCount = members.length;
    } catch (e) {
      console.error("Error parsing group members:", e);
    }
    
    row.innerHTML = `
      <td>${group.name}</td>
      <td style="text-align: center;">${memberCount}</td>
      <td class="action-buttons">
        <button class="edit-group-btn" onclick="window.groupModule.showEditGroupForm(${group.id})">
          <i class="fa-solid fa-edit"></i> Edit
        </button>
        <button class="delete-group-btn" onclick="window.groupModule.deleteGroup(${group.id})">
          <i class="fa-solid fa-trash"></i> Hapus
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * Renders contact checklist for group management form (Add)
 */
export function renderGroupContactChecklist(searchTerm = "") {
  const list = document.getElementById("groupContactList");
  if (!list || !contacts || contacts.length === 0) {
    if (list) list.innerHTML = "<p>Tidak ada kontak yang tersedia. Pastikan kontak sudah dimuat.</p>";
    return;
  }

  list.innerHTML = "";
  const lowerSearchTerm = searchTerm.toLowerCase().trim();

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(lowerSearchTerm) ||
      contact.number.includes(lowerSearchTerm)
  );

  if (filteredContacts.length === 0) {
    list.innerHTML = "<p>Tidak ada kontak ditemukan.</p>";
    return;
  }

  filteredContacts.forEach((contact) => {
    const label = document.createElement("label");
    const isChecked = selectedGroupMembers.has(contact.number) ? "checked" : "";
    label.innerHTML = `
      <input type="checkbox" class="group-contact-checkbox" value="${contact.number}" ${isChecked}> 
      <strong>${contact.name}</strong> — ${contact.number}
    `;
    list.appendChild(label);
  });
  
  attachGroupContactListeners();
  updateGroupMembersInput();
}

/**
 * ✅ NEW: Renders contact checklist for edit group modal
 */
function renderEditGroupContactChecklist(searchTerm = "") {
  const list = document.getElementById("editGroupContactList");
  if (!list || !contacts || contacts.length === 0) {
    if (list) list.innerHTML = "<p>Tidak ada kontak yang tersedia.</p>";
    return;
  }

  list.innerHTML = "";
  const lowerSearchTerm = searchTerm.toLowerCase().trim();

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(lowerSearchTerm) ||
      contact.number.includes(lowerSearchTerm)
  );

  if (filteredContacts.length === 0) {
    list.innerHTML = "<p>Tidak ada kontak ditemukan.</p>";
    return;
  }

  filteredContacts.forEach((contact) => {
    const label = document.createElement("label");
    const isChecked = selectedEditGroupMembers.has(contact.number) ? "checked" : "";
    label.innerHTML = `
      <input type="checkbox" class="edit-group-contact-checkbox" value="${contact.number}" ${isChecked}> 
      <strong>${contact.name}</strong> — ${contact.number}
    `;
    list.appendChild(label);
  });
  
  attachEditGroupContactListeners();
}

/**
 * Attaches event listeners to the group contact checkboxes (Add form)
 */
function attachGroupContactListeners() {
  document.querySelectorAll(".group-contact-checkbox").forEach((checkbox) => {
    checkbox.removeEventListener("change", handleGroupCheckboxChange);
    checkbox.addEventListener("change", handleGroupCheckboxChange);
  });
}

function handleGroupCheckboxChange() {
  if (this.checked) {
    selectedGroupMembers.add(this.value);
  } else {
    selectedGroupMembers.delete(this.value);
  }
  updateGroupMembersInput();
  updateSelectAllState();
}

/**
 * ✅ NEW: Attaches event listeners to edit group contact checkboxes
 */
function attachEditGroupContactListeners() {
  document.querySelectorAll(".edit-group-contact-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", function() {
      if (this.checked) {
        selectedEditGroupMembers.add(this.value);
      } else {
        selectedEditGroupMembers.delete(this.value);
      }
      updateEditSelectAllState();
    });
  });
}

/**
 * Updates the select all checkbox state (Add form)
 */
function updateSelectAllState() {
  const selectAllCheckbox = document.getElementById("selectAllGroupContacts");
  if (!selectAllCheckbox) return;
  
  const allCheckboxes = document.querySelectorAll(".group-contact-checkbox");
  const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
  selectAllCheckbox.checked = allChecked && allCheckboxes.length > 0;
}

/**
 * ✅ NEW: Updates the select all checkbox state (Edit modal)
 */
function updateEditSelectAllState() {
  const selectAllCheckbox = document.getElementById("selectAllEditGroupContacts");
  if (!selectAllCheckbox) return;
  
  const allCheckboxes = document.querySelectorAll(".edit-group-contact-checkbox");
  const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
  selectAllCheckbox.checked = allChecked && allCheckboxes.length > 0;
}

/**
 * Updates the hidden input field with current selected members (Add form)
 */
function updateGroupMembersInput() {
  const membersInput = document.getElementById("group-crud-members");
  if (membersInput) {
    membersInput.value = JSON.stringify(Array.from(selectedGroupMembers));
  }
}

/**
 * ✅ UPDATED: Shows the edit group form in MODAL instead of inline
 */
export async function showEditGroupForm(id) {
  const group = groups.find((g) => g.id === id);
  if (!group) {
    Swal.fire("Error", "Grup tidak ditemukan.", "error");
    return;
  }

  // Reset selection
  selectedEditGroupMembers.clear();
  
  // Populate selected members set from group data
  let membersArray = [];
  try {
    membersArray = JSON.parse(group.members || '[]');
    membersArray.forEach(number => selectedEditGroupMembers.add(number));
  } catch (e) {
    console.error("Error parsing group members:", e);
  }

  const modalBody = document.getElementById("editGroupModalBody");
  if (!modalBody) return;

  // ✅ Create edit form in modal
  modalBody.innerHTML = `
    <form id="editGroupForm">
      <input type="hidden" id="edit-group-id" value="${group.id}">
      
      <label for="edit-group-name">
        <i class="fa-solid fa-users"></i> Nama Grup:
      </label>
      <input 
        type="text" 
        id="edit-group-name" 
        class="phone-num-input" 
        value="${group.name}" 
        placeholder="Contoh: Tim TI, Semua Pegawai"
        required
      />

      <label for="editGroupContactSearch" style="margin-top: 16px;">
        <i class="fa-solid fa-search"></i> Cari Kontak:
      </label>
      <input
        type="text"
        id="editGroupContactSearch"
        placeholder="Cari kontak..."
        autocomplete="off"
        style="margin-bottom: 8px;"
      />
      
      <div class="select-all-container">
        <label for="selectAllEditGroupContacts">Pilih Semua Anggota</label>
        <input type="checkbox" id="selectAllEditGroupContacts" />
      </div>
      
      <div id="editGroupContactList" class="contact-checklist-box" style="max-height: 300px; overflow-y: auto;">
        <p style="text-align: center">Memuat daftar kontak...</p>
      </div>

      <button type="submit" id="updateGroupBtn">
        <i class="fa-solid fa-save"></i> Update Grup
      </button>
      <button type="button" id="cancelEditGroupBtn" style="background-color: #6c757d; margin-top: 10px;">
        <i class="fa-solid fa-times"></i> Batal
      </button>
    </form>
  `;

  // Show modal
  showEditGroupModal();

  // Render contact list with pre-selected members
  renderEditGroupContactChecklist();

  // ✅ Setup search functionality
  const searchInput = document.getElementById("editGroupContactSearch");
  if (searchInput) {
    searchInput.addEventListener("input", function() {
      renderEditGroupContactChecklist(this.value);
    });
  }

  // ✅ Setup "Select All" checkbox
  const selectAllCheckbox = document.getElementById("selectAllEditGroupContacts");
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", function() {
      const allCheckboxes = document.querySelectorAll(".edit-group-contact-checkbox");
      const isChecked = this.checked;
      
      allCheckboxes.forEach((checkbox) => {
        checkbox.checked = isChecked;
        if (isChecked) {
          selectedEditGroupMembers.add(checkbox.value);
        } else {
          selectedEditGroupMembers.delete(checkbox.value);
        }
      });
    });
  }

  // ✅ Setup form submit
  document.getElementById("editGroupForm").addEventListener("submit", handleEditGroupSubmit);
  document.getElementById("cancelEditGroupBtn").addEventListener("click", closeEditGroupModal);
}

/**
 * ✅ NEW: Handles edit group form submission
 */
async function handleEditGroupSubmit(e) {
  e.preventDefault();

  const id = document.getElementById("edit-group-id").value;
  const name = document.getElementById("edit-group-name").value.trim();
  const contactNumbers = JSON.stringify(Array.from(selectedEditGroupMembers));

  if (!name) {
    Swal.fire("Peringatan", "Nama grup wajib diisi.", "warning");
    return;
  }

  const submitBtn = document.getElementById("updateGroupBtn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Memproses...";
  }

  try {
    const res = await fetch(`/api/groups/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, contactNumbers }),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Gagal mengubah grup.');
    }
    
    await fetchAndRenderContacts();
    
    Swal.fire("Sukses", result.message || "Grup berhasil diubah.", "success");
    closeEditGroupModal();
    selectedEditGroupMembers.clear();
    fetchAndRenderGroups();
    
  } catch (error) {
    console.error("Error updating group:", error);
    Swal.fire("Error", error.message, "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Update Grup";
    }
  }
}

/**
 * Handles group form submission (ADD only - edit now uses modal)
 */
export async function handleGroupFormSubmit(e) {
  e.preventDefault();

  const form = document.getElementById("group-crud-form");
  const idInput = document.getElementById("group-crud-id");
  const nameInput = document.getElementById("group-crud-name");
  const membersInput = document.getElementById("group-crud-members");
  
  const name = nameInput.value.trim();
  const contactNumbers = membersInput.value;

  if (!name) {
    Swal.fire("Peringatan", "Nama grup wajib diisi.", "warning");
    return;
  }

  const submitBtn = document.getElementById("group-crud-submit");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Memproses...";
  }

  try {
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, contactNumbers }),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Gagal menambah grup.');
    }
    
    await fetchAndRenderContacts();
    
    Swal.fire("Sukses", result.message || "Grup berhasil ditambah.", "success");
    resetGroupForm();
    fetchAndRenderGroups();
    
  } catch (error) {
    console.error("Error submitting group form:", error);
    Swal.fire("Error", error.message, "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Tambah Grup";
    }
  }
}

/**
 * Deletes a group
 */
export async function deleteGroup(id) {
  const group = groups.find((g) => g.id === id);
  if (!group) return;

  const result = await Swal.fire({
    title: "Hapus Grup?",
    text: `Anda akan menghapus grup "${group.name}". Tindakan ini akan menghapus grup dari semua kontak yang menggunakannya!`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "Ya, hapus!",
    cancelButtonText: "Batal",
  });

  if (result.isConfirmed) {
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Gagal menghapus grup.");
      }

      await fetchAndRenderContacts();

      Swal.fire("Terhapus!", "Grup berhasil dihapus dan kontak disinkronkan.", "success");
      fetchAndRenderGroups();
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    }
  }
}

/**
 * Resets group form (Add form only)
 */
export function resetGroupForm() {
  const form = document.getElementById("group-crud-form");
  if (form) {
    form.reset();
    document.getElementById("group-crud-id").value = "";
    document.getElementById("group-crud-submit").textContent = "Tambah Grup";
    document.getElementById("group-crud-cancel").style.display = "none";
    
    selectedGroupMembers.clear();
    renderGroupContactChecklist();
  }
}

/**
 * Initializes group form listeners (Add form - Search and Select All)
 */
export function initGroupFormListeners() {
  const searchInput = document.getElementById("groupContactSearch");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      renderGroupContactChecklist(searchInput.value);
    });
  }
  
  const selectAll = document.getElementById("selectAllGroupContacts");
  if (selectAll) {
    selectAll.addEventListener("change", function () {
      const allCheckboxes = document.querySelectorAll(".group-contact-checkbox");
      const isChecked = this.checked;
      
      selectedGroupMembers.clear();

      allCheckboxes.forEach((checkbox) => {
        checkbox.checked = isChecked;
        if (isChecked) {
          selectedGroupMembers.add(checkbox.value);
        }
      });
      updateGroupMembersInput();
    });
  }

  // Cancel button - now just resets form since edit uses modal
  const cancelBtn = document.getElementById("group-crud-cancel");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", resetGroupForm);
  }

  // Initial render
  renderGroupContactChecklist();
}

/**
 * Get groups array
 */
export function getGroups() {
  return groups;
}
