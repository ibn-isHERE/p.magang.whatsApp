// group-manager.js - Group Management Module (UPDATED dengan Auto-Sync)

let groups = [];
export let selectedGroupMembers = new Set();

import {getContactsRef} from '../contacts/contact-ui.js';

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

function getSelectedGroupNumbersRef() {
  if (window.groupManagerModule) {
    return window.groupManagerModule.selectedGroupMembers || new Set();
  }
  return selectedGroupMembers;
}

/**
 * Renders groups in the management table
 */
function renderGroupTable() {
  const tbody = document.getElementById("group-management-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  
  if (groups.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;"><div class="empty-state" style="padding: 40px 20px;"><i class="fa-solid fa-users" style="font-size: 48px; color: #cbd5e0; margin-bottom: 12px;"></i><p style="color: #a0aec0; margin: 0; font-size: 14px;">Tidak ada grup yang tersedia</p></div></td></tr>';
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
export async function renderGroupContactChecklist(searchTerm = "") {
  const list = document.getElementById("groupContactList");
  
  if (!list) {
    console.warn("groupContactList element not found");
    return;
  }

  // Import contacts dari contact-manager
  let contacts = [];
  try {
    const contactManager = await import('../contacts/contact-manager.js');
    contacts = contactManager.contacts || [];
  } catch (error) {
    console.error("Error importing contact manager:", error);
    list.innerHTML = "<p>Error memuat kontak. Coba refresh halaman.</p>";
    return;
  }

  if (!contacts || contacts.length === 0) {
    list.innerHTML = '<div class="empty-state" style="padding: 40px 20px;"><i class="fa-solid fa-address-book" style="font-size: 48px; color: #cbd5e0; margin-bottom: 12px;"></i><p style="color: #a0aec0; margin: 0; font-size: 14px;">Tidak ada kontak yang tersedia</p></div>';
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
  updateGroupMemberCount();
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
  updateGroupMemberCount();
}

/**
 * Updates the member count display
 */
function updateGroupMemberCount() {
  const infoDiv = document.getElementById("groupMemberCount");
    if (!infoDiv) return;
  
    const contacts = getContactsRef();
    const selectedNumbers = getSelectedGroupNumbersRef();
  
    if (selectedNumbers.size === 0) {
      infoDiv.innerHTML = "<small>Tidak ada kontak dipilih</small>";
      infoDiv.classList.add("empty");
      return;
    }
  
    const selectedNames = Array.from(selectedNumbers)
      .map((number) => {
        const contact = contacts.find((c) => c.number === number);
        return contact ? contact.name : number;
      })
      .slice(0, 3);
  
    let infoText = `<strong>${selectedNumbers.size} kontak dipilih</strong>`;
    if (selectedNames.length > 0) {
      infoText += `<br><small>${selectedNames.join(", ")}${
        selectedNumbers.size > 3 ? ", ..." : ""
      }</small>`;
    }
  
    infoDiv.innerHTML = infoText;
    infoDiv.classList.remove("empty");
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
 * AUTO-SYNC: Cari kontak yang punya grup name di field 'grup' mereka
 * Ini dipanggil saat grup baru dibuat
 */
async function autoSyncGroupMembers(groupName, selectedMembers) {
  try {
    console.log(`🔍 Auto-syncing grup "${groupName}"...`);
    
    // Fetch all contacts dari server
    const res = await fetch("/api/contacts");
    const result = await res.json();
    const allContacts = result.data || [];

    // Find kontak yang punya grup name ini di field 'grup' mereka
    const contactsWithThisGroup = allContacts.filter(contact => {
      try {
        let grupArray = [];
        if (contact.grup) {
          const parsed = JSON.parse(contact.grup);
          grupArray = Array.isArray(parsed) ? parsed : [contact.grup];
        }
        return grupArray.some(g => String(g).toLowerCase() === String(groupName).toLowerCase());
      } catch (e) {
        return String(contact.grup).toLowerCase() === String(groupName).toLowerCase();
      }
    });

    console.log(`📊 Found ${contactsWithThisGroup.length} contacts dengan grup "${groupName}"`);

    // Merge dengan selected members
    const membersSet = new Set(selectedMembers.map(String));
    
    contactsWithThisGroup.forEach(contact => {
      membersSet.add(String(contact.number));
    });

    const finalMembers = Array.from(membersSet);
    
    console.log(`✅ Final members untuk grup "${groupName}": ${finalMembers.length}`);
    console.log(`   Members:`, finalMembers);

    return finalMembers;

  } catch (error) {
    console.error(`❌ Error in autoSyncGroupMembers:`, error);
    return selectedMembers; // Fallback ke selected members saja
  }
}

/**
 * Handles group form submission (ADD only) - WITH AUTO-SYNC
 */
export async function handleGroupFormSubmit(e) {
  e.preventDefault();

  const form = document.getElementById("group-crud-form");
  const nameInput = document.getElementById("group-crud-name");
  const membersInput = document.getElementById("group-crud-members");
  
  const name = nameInput.value.trim();
  let selectedMembers = [];
  
  try {
    selectedMembers = membersInput.value ? JSON.parse(membersInput.value) : [];
  } catch (err) {
    selectedMembers = [];
  }

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
    // ✨ AUTO-SYNC: Cari kontak yang udah punya grup name ini di import sebelumnya
    const finalMembers = await autoSyncGroupMembers(name, selectedMembers);
    
    // Prepare payload dengan final members
    const payload = { 
      name, 
      contactNumbers: JSON.stringify(finalMembers)
    };

    console.log(`📤 Mengirim ke server:`, payload);

    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Gagal menambah grup.');
    }
    
    const contactManager = await import('../contacts/contact-manager.js');
    await contactManager.fetchAndRenderContacts();
    
    // Tampilkan pesan dengan detail sync
    const syncInfo = finalMembers.length > selectedMembers.length 
      ? `<br><small style="color: #48bb78;">✨ ${finalMembers.length - selectedMembers.length} kontak dari import sebelumnya ditambahkan otomatis</small>`
      : '';
    
    Swal.fire(
      "Sukses", 
      result.message + syncInfo || "Grup berhasil ditambah." + syncInfo, 
      "success"
    );
    
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
 * Initializes group form listeners (Add form - Search and Select/Deselect All)
 */
export function initGroupFormListeners() {
  const searchInput = document.getElementById("groupContactSearch");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      renderGroupContactChecklist(searchInput.value);
    });
  }
  
  // Select All Button
  const selectAllBtn = document.getElementById("selectAllGroupContacts");
  if (selectAllBtn) {
    selectAllBtn.addEventListener("click", function() {
      // Get contacts synchronously from the rendered checkboxes
      const allCheckboxes = document.querySelectorAll(".group-contact-checkbox");
      
      allCheckboxes.forEach((checkbox) => {
        checkbox.checked = true;
        selectedGroupMembers.add(checkbox.value);
      });
      
      updateGroupMembersInput();
      updateGroupMemberCount();
      
      // Add visual feedback
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }

  // Deselect All Button
  const deselectAllBtn = document.getElementById("deselectAllGroupContacts");
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener("click", function() {
      // Get contacts synchronously from the rendered checkboxes
      const allCheckboxes = document.querySelectorAll(".group-contact-checkbox");
      
      allCheckboxes.forEach((checkbox) => {
        checkbox.checked = false;
        selectedGroupMembers.delete(checkbox.value);
      });
      
      updateGroupMembersInput();
      updateGroupMemberCount();
      
      // Add visual feedback
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }

  const cancelBtn = document.getElementById("group-crud-cancel");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", resetGroupForm);
  }

  renderGroupContactChecklist();
}