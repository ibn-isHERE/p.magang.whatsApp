// group-manager.js - Group Management Module (FIXED - Export semua functions)

let groups = [];
export let selectedGroupMembers = new Set();

/**
 * Get groups array
 */
export function getGroups() {
  return groups;
}

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
        <button class="edit-group-btn" onclick="window.groupModule.showGroupDetail(${group.id})" style="background: #4299e1;">
          <i class="fa-solid fa-eye"></i> Detail
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
  
  if (!list) {
    console.warn("groupContactList element not found");
    return;
  }

  if (!groups || groups.length === 0) {
    list.innerHTML = "<p>Tidak ada grup tersedia. Muat halaman grup terlebih dahulu.</p>";
    return;
  }

  // Import contacts dari contact-manager
  const getContacts = async () => {
    const contactManager = await import('../contacts/contact-manager.js');
    return contactManager.contacts || [];
  };

  getContacts().then(contacts => {
    if (!contacts || contacts.length === 0) {
      list.innerHTML = "<p>Tidak ada kontak yang tersedia. Pastikan kontak sudah dimuat.</p>";
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
        <strong>${contact.name}</strong> – ${contact.number}
      `;
      list.appendChild(label);
    });
    
    attachGroupContactListeners();
    updateGroupMembersInput();
  });
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
 * Updates the hidden input field with current selected members (Add form)
 */
function updateGroupMembersInput() {
  const membersInput = document.getElementById("group-crud-members");
  if (membersInput) {
    membersInput.value = JSON.stringify(Array.from(selectedGroupMembers));
  }
}

/**
 * Handles group form submission (ADD only)
 */
export async function handleGroupFormSubmit(e) {
  e.preventDefault();

  const form = document.getElementById("group-crud-form");
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
    
    const contactManager = await import('../contacts/contact-manager.js');
    await contactManager.fetchAndRenderContacts();
    
    Swal.fire("Sukses", result.message || "Grup berhasil ditambah.", "success");
    resetGroupForm();
    await contactManager.fetchGroupsForDropdown(); 
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

      const contactManager = await import('../contacts/contact-manager.js');
      await contactManager.fetchAndRenderContacts();

      Swal.fire("Terhapus!", "Grup berhasil dihapus dan kontak disinkronkan.", "success");
      await contactManager.fetchGroupsForDropdown(); 
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

  const cancelBtn = document.getElementById("group-crud-cancel");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", resetGroupForm);
  }

  renderGroupContactChecklist();
}