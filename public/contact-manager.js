// contact-manager.js - Contact Management Module dengan Multi-Group Checkbox Support
import { showEditContactModal, closeEditContactModal } from "./ui-helpers.js";

export let contacts = [];
let filteredContacts = [];
let groups = [];
export let selectedNumbers = new Set();
export let selectedMeetingNumbers = new Set();
export let selectedGroups = new Set();
export let selectedMeetingGroups = new Set();
export let selectedContactGroups = new Set();
export let selectedEditContactGroups = new Set();

/**
 * Fetches contacts from server and renders them
 */
export async function fetchAndRenderContacts() {
  try {
    const res = await fetch("/api/contacts");
    const result = await res.json();

    if (!res.ok || !result.data) {
      throw new Error("Gagal memuat kontak dari server.");
    }

    result.data.sort((a, b) => a.name.localeCompare(b.name));
    contacts = result.data;
    filteredContacts = contacts;

    renderContactManagementTable();
    renderContactList();
  } catch (error) {
    console.error("Error fetching contacts:", error);
    Swal.fire("Error", error.message, "error");
  }
}

/**
 * Fetches groups and updates dropdown
 */
export async function fetchGroupsForDropdown() {
  try {
    const res = await fetch("/api/groups");
    const result = await res.json();

    if (res.ok && result.data) {
      groups = result.data.sort((a, b) => a.name.localeCompare(b.name));
      renderGroupSelectionList();
      renderMeetingGroupSelectionList();
      renderContactCrudGroupList();
    }
    
  } catch (error) {
    console.error("Error fetching groups:", error);
  }
}

/**
 * ✅ NEW: Render group checkbox list for Contact CRUD form (Add)
 */
export function renderContactCrudGroupList(searchQuery = "") {
  const list = document.getElementById("contactCrudGroupList");
  if (!list) return;

  list.innerHTML = "";

  if (groups.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <i class="fa-solid fa-users" style="font-size: 32px; color: #cbd5e0; margin-bottom: 8px;"></i>
        <p style="color: #a0aec0; margin: 0; font-size: 13px;">Belum ada grup tersedia</p>
      </div>
    `;
    return;
  }

  const filteredGroups = searchQuery
    ? groups.filter((g) =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : groups;

  if (filteredGroups.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <i class="fa-solid fa-search" style="font-size: 32px; color: #cbd5e0; margin-bottom: 8px;"></i>
        <p style="color: #a0aec0; margin: 0; font-size: 13px;">Tidak ada grup ditemukan</p>
      </div>
    `;
    return;
  }

  filteredGroups.forEach((group) => {
    const label = document.createElement("label");
    const isChecked = selectedContactGroups.has(group.name) ? "checked" : "";

    let memberCount = 0;
    try {
      const members = JSON.parse(group.members || "[]");
      memberCount = members.length;
    } catch (e) {
      console.error("Error parsing group members:", e);
    }

    label.innerHTML = `
      <input type="checkbox" class="contact-crud-group-checkbox" value="${group.name}" ${isChecked} />
      <strong>${group.name}</strong> <small>(${memberCount} anggota)</small>
    `;
    list.appendChild(label);
  });

  document
    .querySelectorAll(".contact-crud-group-checkbox")
    .forEach((checkbox) => {
      checkbox.addEventListener("change", function () {
        if (this.checked) {
          selectedContactGroups.add(this.value);
        } else {
          selectedContactGroups.delete(this.value);
        }
        updateContactCrudGroupInfo();
      });
    });

  updateContactCrudGroupInfo();
}

/**
 * ✅ NEW: Update selected group info for contact CRUD
 */
function updateContactCrudGroupInfo() {
  const infoDiv = document.getElementById("contactCrudGroupInfo");
  if (!infoDiv) return;

  if (selectedContactGroups.size === 0) {
    infoDiv.innerHTML =
      "<small style='color: #a0aec0;'>Belum ada grup dipilih</small>";
    return;
  }

  const groupNames = Array.from(selectedContactGroups).join(", ");
  infoDiv.innerHTML = `
    <small style='color: #2d3748;'>
      <strong>${selectedContactGroups.size} grup dipilih:</strong> ${groupNames}
    </small>
  `;
}

/**
 * ✅ NEW: Render group checkbox list for Edit Contact Modal
 */
export function renderEditContactGroupList(searchQuery = "") {
  const list = document.getElementById("editContactGroupList");
  if (!list) return;

  list.innerHTML = "";

  if (groups.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <i class="fa-solid fa-users" style="font-size: 32px; color: #cbd5e0; margin-bottom: 8px;"></i>
        <p style="color: #a0aec0; margin: 0; font-size: 13px;">Belum ada grup tersedia</p>
      </div>
    `;
    return;
  }

  const filteredGroups = searchQuery
    ? groups.filter((g) =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : groups;

  if (filteredGroups.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <i class="fa-solid fa-search" style="font-size: 32px; color: #cbd5e0; margin-bottom: 8px;"></i>
        <p style="color: #a0aec0; margin: 0; font-size: 13px;">Tidak ada grup ditemukan</p>
      </div>
    `;
    return;
  }

  filteredGroups.forEach((group) => {
    const label = document.createElement("label");
    const isChecked = selectedEditContactGroups.has(group.name)
      ? "checked"
      : "";

    let memberCount = 0;
    try {
      const members = JSON.parse(group.members || "[]");
      memberCount = members.length;
    } catch (e) {
      console.error("Error parsing group members:", e);
    }

    label.innerHTML = `
      <input type="checkbox" class="edit-contact-group-checkbox" value="${group.name}" ${isChecked} />
      <strong>${group.name}</strong> <small>(${memberCount} anggota)</small>
    `;
    list.appendChild(label);
  });

  document
    .querySelectorAll(".edit-contact-group-checkbox")
    .forEach((checkbox) => {
      checkbox.addEventListener("change", function () {
        if (this.checked) {
          selectedEditContactGroups.add(this.value);
        } else {
          selectedEditContactGroups.delete(this.value);
        }
        updateEditContactGroupInfo();
      });
    });

  updateEditContactGroupInfo();
}

/**
 * ✅ NEW: Update selected group info for edit contact
 */
function updateEditContactGroupInfo() {
  const infoDiv = document.getElementById("editContactGroupInfo");
  if (!infoDiv) return;

  if (selectedEditContactGroups.size === 0) {
    infoDiv.innerHTML =
      "<small style='color: #a0aec0;'>Belum ada grup dipilih</small>";
    return;
  }

  const groupNames = Array.from(selectedEditContactGroups).join(", ");
  infoDiv.innerHTML = `
    <small style='color: #2d3748;'>
      <strong>${selectedEditContactGroups.size} grup dipilih:</strong> ${groupNames}
    </small>
  `;
}

/**
 * Renders group selection list untuk message form dengan search
 */
export function renderGroupSelectionList(searchQuery = "") {
  const list = document.getElementById("groupSelectionList");
  if (!list) return;

  list.innerHTML = "";

  if (groups.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding: 40px 20px;">
        <i class="fa-solid fa-users" style="font-size: 48px; color: #cbd5e0; margin-bottom: 12px;"></i>
        <p style="color: #a0aec0; margin: 0; font-size: 14px;">Belum ada grup tersedia</p>
      </div>
    `;
    return;
  }

  const filteredGroups = searchQuery
    ? groups.filter((g) =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : groups;

  if (filteredGroups.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding: 40px 20px;">
        <i class="fa-solid fa-search" style="font-size: 48px; color: #cbd5e0; margin-bottom: 12px;"></i>
        <p style="color: #a0aec0; margin: 0; font-size: 14px;">Tidak ada grup ditemukan dengan kata kunci "${searchQuery}"</p>
      </div>
    `;
    return;
  }

  filteredGroups.forEach((group) => {
    const label = document.createElement("label");
    const isChecked = selectedGroups.has(group.id) ? "checked" : "";

    let memberCount = 0;
    try {
      const members = JSON.parse(group.members || "[]");
      memberCount = members.length;
    } catch (e) {
      console.error("Error parsing group members:", e);
    }

    label.innerHTML = `
      <input type="checkbox" class="group-selection-checkbox" value="${group.id}" data-group-name="${group.name}" ${isChecked} />
      <strong>${group.name}</strong> <small>${memberCount} anggota</small>
    `;
    list.appendChild(label);
  });

  document.querySelectorAll(".group-selection-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      if (this.checked) {
        selectedGroups.add(parseInt(this.value));
      } else {
        selectedGroups.delete(parseInt(this.value));
      }
      updateGroupSelectionInfo();
    });
  });

  updateGroupSelectionInfo();
}

/**
 * Renders group selection list untuk meeting form dengan search
 */
export function renderMeetingGroupSelectionList(searchQuery = "") {
  const list = document.getElementById("meetingGroupSelectionList");
  if (!list) return;

  list.innerHTML = "";

  if (groups.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding: 40px 20px;">
        <i class="fa-solid fa-users" style="font-size: 48px; color: #cbd5e0; margin-bottom: 12px;"></i>
        <p style="color: #a0aec0; margin: 0; font-size: 14px;">Belum ada grup tersedia</p>
      </div>
    `;
    return;
  }

  const filteredGroups = searchQuery
    ? groups.filter((g) =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : groups;

  if (filteredGroups.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding: 40px 20px;">
        <i class="fa-solid fa-search" style="font-size: 48px; color: #cbd5e0; margin-bottom: 12px;"></i>
        <p style="color: #a0aec0; margin: 0; font-size: 14px;">Tidak ada grup ditemukan dengan kata kunci "${searchQuery}"</p>
      </div>
    `;
    return;
  }

  filteredGroups.forEach((group) => {
    const label = document.createElement("label");
    const isChecked = selectedMeetingGroups.has(group.id) ? "checked" : "";

    let memberCount = 0;
    try {
      const members = JSON.parse(group.members || "[]");
      memberCount = members.length;
    } catch (e) {
      console.error("Error parsing group members:", e);
    }

    label.innerHTML = `
      <input type="checkbox" class="meeting-group-selection-checkbox" value="${group.id}" data-group-name="${group.name}" ${isChecked} />
      <strong>${group.name}</strong> <small>${memberCount} anggota</small>
    `;
    list.appendChild(label);
  });

  document
    .querySelectorAll(".meeting-group-selection-checkbox")
    .forEach((checkbox) => {
      checkbox.addEventListener("change", function () {
        if (this.checked) {
          selectedMeetingGroups.add(parseInt(this.value));
        } else {
          selectedMeetingGroups.delete(parseInt(this.value));
        }
        updateMeetingGroupSelectionInfo();
      });
    });

  updateMeetingGroupSelectionInfo();
}

/**
 * Update info grup yang dipilih untuk message form
 */
function updateGroupSelectionInfo() {
  const infoDiv = document.getElementById("groupSelectionInfo");
  if (!infoDiv) return;

  if (selectedGroups.size === 0) {
    infoDiv.innerHTML = "<small>Belum ada grup dipilih</small>";
    return;
  }

  const selectedGroupNames = Array.from(selectedGroups)
    .map((id) => {
      const group = groups.find((g) => g.id === id);
      return group ? group.name : "";
    })
    .filter((name) => name);

  let totalMembers = 0;
  selectedGroups.forEach((id) => {
    const group = groups.find((g) => g.id === id);
    if (group && group.members) {
      try {
        const members = JSON.parse(group.members);
        totalMembers += members.length;
      } catch (e) {}
    }
  });

  infoDiv.innerHTML = `
    <small>
      <strong>${
        selectedGroups.size
      } grup dipilih</strong> (${totalMembers} anggota)<br>
      ${selectedGroupNames.join(", ")}
    </small>
  `;
}

/**
 * Update info grup yang dipilih untuk meeting form
 */
function updateMeetingGroupSelectionInfo() {
  const infoDiv = document.getElementById("meetingGroupSelectionInfo");
  if (!infoDiv) return;

  if (selectedMeetingGroups.size === 0) {
    infoDiv.innerHTML = "<small>Belum ada grup dipilih</small>";
    return;
  }

  const selectedGroupNames = Array.from(selectedMeetingGroups)
    .map((id) => {
      const group = groups.find((g) => g.id === id);
      return group ? group.name : "";
    })
    .filter((name) => name);

  let totalMembers = 0;
  selectedMeetingGroups.forEach((id) => {
    const group = groups.find((g) => g.id === id);
    if (group && group.members) {
      try {
        const members = JSON.parse(group.members);
        totalMembers += members.length;
      } catch (e) {}
    }
  });

  infoDiv.innerHTML = `
    <small>
      <strong>${
        selectedMeetingGroups.size
      } grup dipilih</strong> (${totalMembers} anggota)<br>
      ${selectedGroupNames.join(", ")}
    </small>
  `;
}

/**
 * Mendapatkan semua nomor dari grup yang dipilih
 */
export function getNumbersFromSelectedGroups(isForMeeting = false) {
  const selectedGroupSet = isForMeeting
    ? selectedMeetingGroups
    : selectedGroups;
  const numbers = new Set();

  selectedGroupSet.forEach((groupId) => {
    const group = groups.find((g) => g.id === groupId);
    if (group && group.members) {
      try {
        const members = JSON.parse(group.members);
        members.forEach((number) => numbers.add(number));
      } catch (e) {
        console.error("Error parsing group members:", e);
      }
    }
  });

  return Array.from(numbers);
}

let selectedContactsToDelete = new Set();


function renderContactManagementTable() {
  const tbody = document.getElementById("contact-management-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (contacts.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align: center;">Belum ada kontak</td></tr>';
    
    updateBulkDeleteButton();
    return;
  }

  contacts.forEach((contact) => {
    const row = document.createElement("tr");

    let groupDisplay = "";
    try {
      let groupsArray = contact.grup ? JSON.parse(contact.grup) : [];
      if (Array.isArray(groupsArray) && groupsArray.length > 0) {
        groupDisplay = groupsArray.join(", ");
      } else {
        groupDisplay = "-";
      }
    } catch (e) {
      groupDisplay = contact.grup || "-";
    }

    // ✅ Tambah checkbox untuk select
    const isChecked = selectedContactsToDelete.has(contact.id) ? "checked" : "";
    
    row.innerHTML = `
      <td style="text-align: center; width: 40px;">
        <input type="checkbox" class="contact-delete-checkbox" value="${contact.id}" ${isChecked} />
      </td>
      <td>${contact.name}</td>
      <td>${contact.number}</td>
      <td>${contact.instansi}</td>
      <td>${contact.jabatan}</td>
      <td>${groupDisplay}</td>
      <td class="action-buttons">
        <button class="edit-contact-btn" onclick="window.contactModule.showEditContactForm('${contact.id}')">
          <i class="fa-solid fa-edit"></i> Edit
        </button>
        <button class="delete-contact-btn" onclick="window.contactModule.deleteContact('${contact.id}', '${contact.name}')">
          <i class="fa-solid fa-trash"></i> Hapus
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });

  // ✅ PENTING: Attach checkbox listeners SEBELUM init filter
  attachDeleteCheckboxListeners();
  updateBulkDeleteButton();
  
  // ✅ Init filter SETELAH semua row di-render dengan delay
  setTimeout(() => {
    initContactManagementFilter();
  }, 100);
}

function attachDeleteCheckboxListeners() {
  const checkboxes = document.querySelectorAll(".contact-delete-checkbox");
  checkboxes.forEach(cb => {
    cb.addEventListener("change", function() {
      const contactId = parseInt(this.value);
      if (this.checked) {
        selectedContactsToDelete.add(contactId);
      } else {
        selectedContactsToDelete.delete(contactId);
      }
      updateBulkDeleteButton();
      updateSelectAllCheckbox();
    });
  });
}

function updateBulkDeleteButton() {
  const bulkDeleteBtn = document.getElementById("bulkDeleteContactBtn");
  const countSpan = document.getElementById("bulkDeleteCount");
  
  if (bulkDeleteBtn && countSpan) {
    const count = selectedContactsToDelete.size;
    countSpan.textContent = count;
    bulkDeleteBtn.disabled = count === 0;
    
    if (count > 0) {
      bulkDeleteBtn.style.display = "inline-flex";
    } else {
      bulkDeleteBtn.style.display = "none";
    }
  }
}

function updateSelectAllCheckbox() {
  const selectAllCheck = document.getElementById("selectAllContactsDelete");
  if (!selectAllCheck) return;
  
  const allCheckboxes = document.querySelectorAll(".contact-delete-checkbox");
  const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
  selectAllCheck.checked = allChecked && allCheckboxes.length > 0;
}

/**
 * Handle bulk delete contacts
 */
export async function handleBulkDeleteContacts() {
  if (selectedContactsToDelete.size === 0) {
    Swal.fire("Peringatan", "Pilih minimal satu kontak untuk dihapus", "warning");
    return;
  }

  const contactNames = Array.from(selectedContactsToDelete)
    .map(id => {
      const contact = contacts.find(c => c.id === id);
      return contact ? contact.name : "";
    })
    .filter(name => name)
    .slice(0, 5); // Tampilkan max 5 nama

  const displayNames = contactNames.join(", ") + (selectedContactsToDelete.size > 5 ? ", ..." : "");

  const result = await Swal.fire({
    title: `Hapus ${selectedContactsToDelete.size} Kontak?`,
    html: `
      <div style="text-align: left; padding: 10px;">
        <p><strong>Kontak yang akan dihapus:</strong></p>
        <p style="color: #718096;">${displayNames}</p>
        <p style="color: #f56565; margin-top: 16px;">
          <i class="fa-solid fa-warning"></i> 
          Tindakan ini tidak dapat dibatalkan!
        </p>
      </div>
    `,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#f56565",
    cancelButtonColor: "#718096",
    confirmButtonText: `<i class="fa-solid fa-trash"></i> Ya, Hapus ${selectedContactsToDelete.size} Kontak`,
    cancelButtonText: "Batal",
  });

  if (!result.isConfirmed) return;

  // Show loading
  Swal.fire({
    title: '<i class="fa-solid fa-spinner fa-spin"></i> Menghapus...',
    html: '<p style="color: #718096;">Mohon tunggu, sedang menghapus kontak...</p>',
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    // Hapus satu per satu
    for (const contactId of selectedContactsToDelete) {
      try {
        const res = await fetch(`/api/contacts/${contactId}`, { method: "DELETE" });
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
          const contact = contacts.find(c => c.id === contactId);
          errors.push(contact ? contact.name : `ID: ${contactId}`);
        }
      } catch (error) {
        failCount++;
        const contact = contacts.find(c => c.id === contactId);
        errors.push(contact ? contact.name : `ID: ${contactId}`);
      }
    }

    Swal.close();

    // Show result
    if (failCount === 0) {
      await Swal.fire({
        icon: "success",
        title: "✅ Berhasil!",
        html: `
          <p><strong>${successCount} kontak</strong> berhasil dihapus</p>
        `,
        confirmButtonColor: "#48bb78",
      });
    } else {
      await Swal.fire({
        icon: "warning",
        title: "⚠️ Selesai dengan Error",
        html: `
          <div style="text-align: left; padding: 10px;">
            <p>✅ <strong>${successCount} kontak berhasil dihapus</strong></p>
            <p>❌ <strong>${failCount} kontak gagal dihapus:</strong></p>
            <p style="color: #f56565;">${errors.join(", ")}</p>
          </div>
        `,
        confirmButtonColor: "#ed8936",
      });
    }

    // Clear selection dan refresh
    selectedContactsToDelete.clear();
    await fetchAndRenderContacts();
    await fetchGroupsForDropdown();

  } catch (error) {
    Swal.close();
    Swal.fire({
      icon: "error",
      title: "❌ Gagal",
      text: error.message || "Terjadi kesalahan saat menghapus kontak",
      confirmButtonColor: "#f56565",
    });
  }
}

/**
 * Initialize bulk delete listeners
 * Panggil fungsi ini di initContactListeners()
 */
export function initBulkDeleteListeners() {
  // Select All checkbox
  const selectAllCheck = document.getElementById("selectAllContactsDelete");
  if (selectAllCheck) {
    selectAllCheck.addEventListener("change", function() {
      const checkboxes = document.querySelectorAll(".contact-delete-checkbox");
      checkboxes.forEach(cb => {
        cb.checked = this.checked;
        const contactId = parseInt(cb.value);
        if (this.checked) {
          selectedContactsToDelete.add(contactId);
        } else {
          selectedContactsToDelete.delete(contactId);
        }
      });
      updateBulkDeleteButton();
    });
  }

  // Bulk delete button
  const bulkDeleteBtn = document.getElementById("bulkDeleteContactBtn");
  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener("click", handleBulkDeleteContacts);
  }
}

/**
 * Shows edit contact form with data
 */
export async function showEditContactForm(id) {
  const convertContactId = parseInt(id);
  const contact = contacts.find((c) => c.id === convertContactId);

  const contactId = contact.id;
  const contactName = contact.name || "";
  const contactNumber = contact.number || "";
  const contactInstansi = contact.instansi || "";
  const contactJabatan = contact.jabatan || "";

  if (!contact) {
    Swal.fire("Error", "Kontak tidak ditemukan.", "error");
    return;
  }

  selectedEditContactGroups.clear();
  if (contact.grup) {
    try {
      const groupsArray = JSON.parse(contact.grup);
      if (Array.isArray(groupsArray)) {
        groupsArray.forEach((g) => selectedEditContactGroups.add(g));
      }
    } catch (e) {
      console.error("Error parsing contact groups:", e);
    }
  }

  await fetchGroupsForDropdown();

  const modalBody = document.getElementById("editContactModalBody");
  if (!modalBody) return;

  modalBody.innerHTML = `
    <form id="editContactForm">
      <input type="hidden" id="edit-contact-id" value="${contactId}">
      
      <label for="edit-contact-name">Nama Kontak:</label>
      <input type="text" id="edit-contact-name" class="phone-num-input" value="${contactName}" required>
      
      <label for="edit-contact-number">Nomor (contoh: 0812...):</label>
      <input type="tel" id="edit-contact-number" class="phone-num-input" value="${contactNumber}" required>

      <label for="edit-contact-instansi">Instansi:</label>
      <select id="edit-contact-instansi" class="phone-num-input" required>
        <option value="">-- Pilih Instansi --</option>
        <option value="Tim ZI">Tim ZI</option>
        <option value="Tim Umum">Tim Umum</option>
        <option value="Tim Statistik Sosial">Tim Statistik Sosial</option>
        <option value="Tim Statistik Distribusi">Tim Statistik Distribusi</option>
        <option value="Tim Neraca Wilayah dan Analisis Statistik">Tim Neraca Wilayah dan Analisis Statistik</option>
        <option value="Tim Statistik Produksi">Tim Statistik Produksi</option>
        <option value="Tim IPDS (TI)">Tim IPDS (TI)</option>
        <option value="Tim IPDS (DLS)">Tim IPDS (DLS)</option>
        <option value="Tim Administrasi">Tim Administrasi</option>
        <option value="Tim Humas dan UKK">Tim Humas dan UKK</option>
        <option value="Tim Statistik Sektoral">Tim Statistik Sektoral</option>
        <option value="Tim Manajemen dan Tata Kelola">Tim Manajemen dan Tata Kelola</option>
      </select>

      <label for="edit-contact-jabatan">Jabatan:</label>
      <select id="edit-contact-jabatan" class="phone-num-input" required>
        <option value="">-- Pilih Jabatan --</option>
        <option value="Kepala Bagian Umum">Kepala Bagian Umum</option>
        <option value="Pegawai">Pegawai</option>
      </select>

      <label for="editContactGroupSearch">Grup (pilih satu atau lebih):</label>
      <div class="search-box-wrapper" style="margin-bottom: 8px;">
        <i class="fa-solid fa-search"></i>
        <input type="text" id="editContactGroupSearch" placeholder="Cari grup..." autocomplete="off" />
      </div>
      <div id="editContactGroupList" class="contact-checklist-box" style="max-height: 200px; overflow-y: auto; margin-bottom: 8px;"></div>
      <div id="editContactGroupInfo" style="margin-bottom: 16px; padding: 8px; background: #f7fafc; border-radius: 4px;">
        <small style='color: #a0aec0;'>Belum ada grup dipilih</small>
      </div>

      <button type="submit" id="updateContactBtn">Update Kontak</button>
      <button type="button" id="cancelEditContactBtn" style="background-color: #6c757d; margin-top: 10px;">Batal</button>
    </form>
  `;

  document.getElementById("edit-contact-instansi").value = contactInstansi;
  document.getElementById("edit-contact-jabatan").value = contactJabatan;

  renderEditContactGroupList();

  // ✅ Search functionality
  const searchInput = document.getElementById("editContactGroupSearch");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      renderEditContactGroupList(this.value);
    });
  }

  showEditContactModal();

  document
    .getElementById("editContactForm")
    .addEventListener("submit", handleEditContactSubmit);
  document
    .getElementById("cancelEditContactBtn")
    .addEventListener("click", closeEditContactModal);
}

/**
 * Handles edit contact form submission
 */
async function handleEditContactSubmit(event) {
  event.preventDefault();

  const id = document.getElementById("edit-contact-id").value;
  const name = document.getElementById("edit-contact-name").value;
  const number = document.getElementById("edit-contact-number").value;
  const instansi = document.getElementById("edit-contact-instansi").value;
  const jabatan = document.getElementById("edit-contact-jabatan").value;

  // ✅ Send multiple groups as JSON array
  const grupArray = Array.from(selectedEditContactGroups);
  const grup = grupArray.length > 0 ? JSON.stringify(grupArray) : null;

  try {
    const res = await fetch(`/api/contacts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, number, instansi, jabatan, grup }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Terjadi kesalahan.");

    Swal.fire("Sukses!", `Kontak berhasil diupdate.`, "success");
    closeEditContactModal();
    selectedEditContactGroups.clear();
    await fetchGroupsForDropdown();
    await fetchAndRenderContacts();
  } catch (error) {
    Swal.fire("Error", error.message, "error");
  }
}

/**
 * Resets contact CRUD form
 */
export function resetContactCrudForm() {
  document.getElementById("contact-crud-form").reset();
  document.getElementById("contact-crud-id").value = "";
  document.getElementById("contact-crud-submit").textContent = "Tambah Kontak";
  document.getElementById("contact-crud-cancel").style.display = "none";
  selectedContactGroups.clear();
  renderContactCrudGroupList();
}

/**
 * Deletes a contact
 */
export async function deleteContact(id, name) {
  const result = await Swal.fire({
    title: `Hapus Kontak ${name}?`,
    text: "Anda tidak akan bisa mengembalikan ini!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "Ya, hapus!",
    cancelButtonText: "Batal",
  });

  if (result.isConfirmed) {
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus kontak.");

      Swal.fire("Terhapus!", "Kontak berhasil dihapus.", "success");
      await fetchAndRenderContacts();
      await fetchGroupsForDropdown(); 
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    }
  }
}

/**
 * Handles contact form submission (add/edit)
 */
let isSubmittingContact = false;

export async function handleContactFormSubmit(event) {
  event.preventDefault();

  if (isSubmittingContact) {
    console.log("Request sedang diproses, mengabaikan submit duplikat");
    return;
  }

  const id = document.getElementById("contact-crud-id").value;
  const name = document.getElementById("contact-crud-name").value;
  const number = document.getElementById("contact-crud-number").value;
  const instansi = document.getElementById("contact-crud-instansi").value;
  const jabatan = document.getElementById("contact-crud-jabatan").value;

  // ✅ Get multiple selected groups
  const grupArray = Array.from(selectedContactGroups);
  const grup = grupArray.length > 0 ? JSON.stringify(grupArray) : null;

  const isEditing = !!id;
  const url = isEditing ? `/api/contacts/${id}` : "/api/contacts";
  const method = isEditing ? "PUT" : "POST";

  const submitBtn = document.getElementById("contact-crud-submit");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Memproses...";
  }

  isSubmittingContact = true;

  try {
    const res = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, number, instansi, jabatan, grup }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Terjadi kesalahan.");

    Swal.fire(
      "Sukses!",
      `Kontak berhasil ${isEditing ? "diupdate" : "ditambahkan"}.`,
      "success"
    );
    resetContactCrudForm();
    fetchAndRenderContacts();
  } catch (error) {
    Swal.fire("Error", error.message, "error");
  } finally {
    isSubmittingContact = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = isEditing ? "Update Kontak" : "Tambah Kontak";
    }
  }
}

/**
 * Renders contact list with checkboxes for message form
 */
export function renderContactList() {
  const list = document.getElementById("contactList");
  if (!list) return;

  list.innerHTML = "";

  if (filteredContacts.length === 0) {
    const hasSearchQuery = document
      .getElementById("contactSearch")
      ?.value.trim();
    if (hasSearchQuery) {
      list.innerHTML = `
        <div class="empty-state" style="padding: 40px 20px;">
          <i class="fa-solid fa-search" style="font-size: 48px; color: #cbd5e0; margin-bottom: 12px;"></i>
          <p style="color: #a0aec0; margin: 0; font-size: 14px;">Tidak ada kontak ditemukan dengan kata kunci "${hasSearchQuery}"</p>
        </div>
      `;
    } else {
      list.innerHTML = `
        <div class="empty-state" style="padding: 40px 20px;">
          <i class="fa-solid fa-address-book" style="font-size: 48px; color: #cbd5e0; margin-bottom: 12px;"></i>
          <p style="color: #a0aec0; margin: 0; font-size: 14px;">Belum ada kontak tersedia</p>
        </div>
      `;
    }
    return;
  }

  filteredContacts.forEach((contact) => {
    const label = document.createElement("label");
    const isChecked = selectedNumbers.has(contact.number) ? "checked" : "";
    label.innerHTML = `
      <input type="checkbox" class="contact-checkbox" name="selectedContacts" value="${contact.number}" ${isChecked} />
      <strong>${contact.name}</strong> — ${contact.number}
    `;
    list.appendChild(label);
  });

  document.querySelectorAll(".contact-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      if (this.checked) {
        selectedNumbers.add(this.value);
      } else {
        selectedNumbers.delete(this.value);
      }
      updateContactSelectionInfo();
    });
  });

  updateContactSelectionInfo();
}

/**
 * Update contact selection info
 */
function updateContactSelectionInfo() {
  const infoDiv = document.getElementById("contactSelectionInfo");
  if (!infoDiv) return;

  if (selectedNumbers.size === 0) {
    infoDiv.innerHTML = "<small>Belum ada kontak dipilih</small>";
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
 * Renders meeting contact list with checkboxes
 */
export function renderMeetingContactList() {
  const list = document.getElementById("meetingContactList");
  if (!list) return;

  list.innerHTML = "";
  const currentSearch =
    document
      .getElementById("meetingContactSearch")
      ?.value.toLowerCase()
      .trim() || "";

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(currentSearch) ||
      c.number.includes(currentSearch)
  );

  if (filtered.length === 0) {
    if (currentSearch) {
      list.innerHTML = `
        <div class="empty-state" style="padding: 40px 20px;">
          <i class="fa-solid fa-search" style="font-size: 48px; color: #cbd5e0; margin-bottom: 12px;"></i>
          <p style="color: #a0aec0; margin: 0; font-size: 14px;">Tidak ada kontak ditemukan dengan kata kunci "${currentSearch}"</p>
        </div>
      `;
    } else {
      list.innerHTML = `
        <div class="empty-state" style="padding: 40px 20px;">
          <i class="fa-solid fa-address-book" style="font-size: 48px; color: #cbd5e0; margin-bottom: 12px;"></i>
          <p style="color: #a0aec0; margin: 0; font-size: 14px;">Belum ada kontak tersedia</p>
        </div>
      `;
    }
    return;
  }

  filtered.forEach((contact) => {
    const label = document.createElement("label");
    const isChecked = selectedMeetingNumbers.has(contact.number);
    label.innerHTML = `
      <input type="checkbox" class="meeting-contact-checkbox" value="${
        contact.number
      }" ${isChecked ? "checked" : ""} />
      <strong>${contact.name}</strong> — ${contact.number}
    `;
    list.appendChild(label);
  });

  document.querySelectorAll(".meeting-contact-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      if (this.checked) {
        selectedMeetingNumbers.add(this.value);
      } else {
        selectedMeetingNumbers.delete(this.value);
      }
      updateMeetingContactSelectionInfo();
    });
  });

  updateMeetingContactSelectionInfo();
}

/**
 * Update meeting contact selection info
 */
function updateMeetingContactSelectionInfo() {
  const infoDiv = document.getElementById("meetingContactSelectionInfo");
  if (!infoDiv) return;

  if (selectedMeetingNumbers.size === 0) {
    infoDiv.innerHTML = "<small>Belum ada kontak dipilih</small>";
    infoDiv.classList.add("empty");
    return;
  }

  const selectedNames = Array.from(selectedMeetingNumbers)
    .map((number) => {
      const contact = contacts.find((c) => c.number === number);
      return contact ? contact.name : number;
    })
    .slice(0, 3);

  let infoText = `<strong>${selectedMeetingNumbers.size} kontak dipilih</strong>`;
  if (selectedNames.length > 0) {
    infoText += `<br><small>${selectedNames.join(", ")}${
      selectedMeetingNumbers.size > 3 ? ", ..." : ""
    }</small>`;
  }

  infoDiv.innerHTML = infoText;
  infoDiv.classList.remove("empty");
}

/**
 * Initializes contact event listeners
 */
export function initContactListeners() {
  const contactSearch = document.getElementById("contactSearch");
  if (contactSearch) {
    contactSearch.addEventListener("input", function () {
      const query = this.value.toLowerCase().trim();
      filteredContacts = contacts.filter(
        (c) => c.name.toLowerCase().includes(query) || c.number.includes(query)
      );
      renderContactList();
    });
  }

  const contactForm = document.getElementById("contact-crud-form");
  if (contactForm) {
    contactForm.addEventListener("submit", handleContactFormSubmit);
  }

  const cancelBtn = document.getElementById("contact-crud-cancel");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", resetContactCrudForm);
  }

  // ✅ Initialize contact CRUD group search
  const contactCrudGroupSearch = document.getElementById(
    "contactCrudGroupSearch"
  );
  if (contactCrudGroupSearch) {
    contactCrudGroupSearch.addEventListener("input", function () {
      renderContactCrudGroupList(this.value);
    });
  }

  // Initialize group search for message form
  const groupSearch = document.getElementById("groupSearch");
  if (groupSearch) {
    groupSearch.addEventListener("input", function () {
      renderGroupSelectionList(this.value);
    });
  }

  const selectAllContactsBtn = document.getElementById("selectAllContactsBtn");
  if (selectAllContactsBtn) {
    selectAllContactsBtn.addEventListener("click", function () {
      filteredContacts.forEach((contact) =>
        selectedNumbers.add(contact.number)
      );
      renderContactList();
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }

  const deselectAllContactsBtn = document.getElementById(
    "deselectAllContactsBtn"
  );
  if (deselectAllContactsBtn) {
    deselectAllContactsBtn.addEventListener("click", function () {
      filteredContacts.forEach((contact) =>
        selectedNumbers.delete(contact.number)
      );
      renderContactList();
    });
  }

  const selectAllGroupsBtn = document.getElementById("selectAllGroupsBtn");
  if (selectAllGroupsBtn) {
    selectAllGroupsBtn.addEventListener("click", function () {
      const groupSearch = document.getElementById("groupSearch");
      const searchQuery = groupSearch
        ? groupSearch.value.toLowerCase().trim()
        : "";

      const filteredGroups = searchQuery
        ? groups.filter((g) => g.name.toLowerCase().includes(searchQuery))
        : groups;

      filteredGroups.forEach((group) => selectedGroups.add(group.id));
      renderGroupSelectionList(searchQuery);
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }

  const deselectAllGroupsBtn = document.getElementById("deselectAllGroupsBtn");
  if (deselectAllGroupsBtn) {
    deselectAllGroupsBtn.addEventListener("click", function () {
      const groupSearch = document.getElementById("groupSearch");
      const searchQuery = groupSearch
        ? groupSearch.value.toLowerCase().trim()
        : "";

      const filteredGroups = searchQuery
        ? groups.filter((g) => g.name.toLowerCase().includes(searchQuery))
        : groups;

      filteredGroups.forEach((group) => selectedGroups.delete(group.id));
      renderGroupSelectionList(searchQuery);
    });
  }
  
  // ✅ CRITICAL: Initialize bulk delete listeners
  console.log("🎯 Initializing bulk delete listeners...");
  initBulkDeleteListeners();
}

/**
 * Initializes meeting contact listeners
 */
export function initMeetingContactListeners() {
  const searchInput = document.getElementById("meetingContactSearch");
  if (searchInput) {
    searchInput.addEventListener("input", renderMeetingContactList);
  }

  const contactListDiv = document.getElementById("meetingContactList");
  if (contactListDiv) {
    contactListDiv.addEventListener("change", (event) => {
      if (event.target.classList.contains("meeting-contact-checkbox")) {
        if (event.target.checked) {
          selectedMeetingNumbers.add(event.target.value);
        } else {
          selectedMeetingNumbers.delete(event.target.value);
        }
        updateMeetingContactSelectionInfo();
      }
    });
  }

  const meetingGroupSearch = document.getElementById("meetingGroupSearch");
  if (meetingGroupSearch) {
    meetingGroupSearch.addEventListener("input", function () {
      renderMeetingGroupSelectionList(this.value);
    });
  }

  const selectAllMeetingContactsBtn = document.getElementById(
    "selectAllMeetingContactsBtn"
  );
  if (selectAllMeetingContactsBtn) {
    selectAllMeetingContactsBtn.addEventListener("click", function () {
      const searchInput = document.getElementById("meetingContactSearch");
      const currentSearch = searchInput
        ? searchInput.value.toLowerCase().trim()
        : "";

      const filtered = contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(currentSearch) ||
          c.number.includes(currentSearch)
      );

      filtered.forEach((contact) => selectedMeetingNumbers.add(contact.number));
      renderMeetingContactList();
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }

  const deselectAllMeetingContactsBtn = document.getElementById(
    "deselectAllMeetingContactsBtn"
  );
  if (deselectAllMeetingContactsBtn) {
    deselectAllMeetingContactsBtn.addEventListener("click", function () {
      const searchInput = document.getElementById("meetingContactSearch");
      const currentSearch = searchInput
        ? searchInput.value.toLowerCase().trim()
        : "";

      const filtered = contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(currentSearch) ||
          c.number.includes(currentSearch)
      );

      filtered.forEach((contact) =>
        selectedMeetingNumbers.delete(contact.number)
      );
      renderMeetingContactList();
    });
  }

  const selectAllMeetingGroupsBtn = document.getElementById(
    "selectAllMeetingGroupsBtn"
  );
  if (selectAllMeetingGroupsBtn) {
    selectAllMeetingGroupsBtn.addEventListener("click", function () {
      const groupSearch = document.getElementById("meetingGroupSearch");
      const searchQuery = groupSearch
        ? groupSearch.value.toLowerCase().trim()
        : "";

      const filteredGroups = searchQuery
        ? groups.filter((g) => g.name.toLowerCase().includes(searchQuery))
        : groups;

      filteredGroups.forEach((group) => selectedMeetingGroups.add(group.id));
      renderMeetingGroupSelectionList(searchQuery);
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }

  const deselectAllMeetingGroupsBtn = document.getElementById(
    "deselectAllMeetingGroupsBtn"
  );
  if (deselectAllMeetingGroupsBtn) {
    deselectAllMeetingGroupsBtn.addEventListener("click", function () {
      const groupSearch = document.getElementById("meetingGroupSearch");
      const searchQuery = groupSearch
        ? groupSearch.value.toLowerCase().trim()
        : "";

      const filteredGroups = searchQuery
        ? groups.filter((g) => g.name.toLowerCase().includes(searchQuery))
        : groups;

      filteredGroups.forEach((group) => selectedMeetingGroups.delete(group.id));
      renderMeetingGroupSelectionList(searchQuery);
    });
  }
}

/**
 * Initialize tab system for message form
 */
export function initMessageFormTabs() {
  const tabs = document.querySelectorAll(
    "#messageFormContainer .recipient-tab"
  );
  const panels = document.querySelectorAll(
    "#messageFormContainer .recipient-panel"
  );

  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      const targetTab = this.dataset.tab;

      tabs.forEach((t) => t.classList.remove("active"));
      this.classList.add("active");

      panels.forEach((p) => p.classList.remove("active"));

      if (targetTab === "contacts") {
        document.getElementById("contactsPanel").classList.add("active");
      } else if (targetTab === "groups") {
        document.getElementById("groupsPanel").classList.add("active");
      }
    });
  });
}

/**
 * Initialize tab system for meeting form
 */
export function initMeetingFormTabs() {
  const tabs = document.querySelectorAll(
    "#meetingFormContainer .recipient-tab"
  );
  const panels = document.querySelectorAll(
    "#meetingFormContainer .recipient-panel"
  );

  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      const targetTab = this.dataset.tab;

      tabs.forEach((t) => t.classList.remove("active"));
      this.classList.add("active");

      panels.forEach((p) => p.classList.remove("active"));

      if (targetTab === "meeting-contacts") {
        document.getElementById("meetingContactsPanel").classList.add("active");
      } else if (targetTab === "meeting-groups") {
        document.getElementById("meetingGroupsPanel").classList.add("active");
      }
    });
  });
}

/**
 * Renders contact list for edit form
 */
export function renderContactListForEdit() {
  const list = document.getElementById("edit-contactList");
  if (!list) return;
  list.innerHTML = "";
  contacts.forEach((contact) => {
    const label = document.createElement("label");
    const isChecked = selectedNumbers.has(contact.number) ? "checked" : "";
    label.innerHTML = `<input type="checkbox" class="contact-checkbox-edit" value="${contact.number}" ${isChecked}> <strong>${contact.name}</strong> — ${contact.number}`;
    list.appendChild(label);
  });
  document.querySelectorAll(".contact-checkbox-edit").forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      if (this.checked) selectedNumbers.add(this.value);
      else selectedNumbers.delete(this.value);
      document.getElementById("edit-manualNumbers").value =
        Array.from(selectedNumbers).join(", ");
    });
  });
}

/**
 * Renders meeting contact list for edit form
 */
export function renderMeetingContactListForEdit() {
  const list = document.getElementById("edit-meetingContactList");
  if (!list) return;

  list.innerHTML = "";

  const searchInput = document.getElementById("edit-meetingContactSearch");
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchTerm) ||
      contact.number.includes(searchTerm)
  );

  if (filteredContacts.length === 0) {
    list.innerHTML = "<p>Tidak ada kontak ditemukan.</p>";
    return;
  }

  filteredContacts.forEach((contact) => {
    const label = document.createElement("label");
    const isChecked = selectedMeetingNumbers.has(contact.number)
      ? "checked"
      : "";
    label.innerHTML = `
      <input type="checkbox" class="meeting-contact-checkbox-edit" value="${contact.number}" ${isChecked}> 
      <strong>${contact.name}</strong> — ${contact.number}
    `;
    list.appendChild(label);
  });

  document
    .querySelectorAll(".meeting-contact-checkbox-edit")
    .forEach((checkbox) => {
      checkbox.addEventListener("change", function () {
        if (this.checked) {
          selectedMeetingNumbers.add(this.value);
        } else {
          selectedMeetingNumbers.delete(this.value);
        }
        const numbersInput = document.getElementById("edit-meetingNumbers");
        if (numbersInput) {
          numbersInput.value = Array.from(selectedMeetingNumbers).join(", ");
        }
      });
    });
}

/**
 * Get contacts array
 */
export function getContacts() {
  return contacts;
}

/**
 * Get groups array
 */
export function getGroups() {
  return groups;
}
export function initContactManagementFilter() {
  const filterName = document.getElementById("filterContactName");
  const filterNumber = document.getElementById("filterContactNumber");
  const filterInstansi = document.getElementById("filterContactInstansi");
  const filterJabatan = document.getElementById("filterContactJabatan");
  const clearAllBtn = document.getElementById("clearAllContactFilters");
  const filterInfo = document.getElementById("filterContactResultInfo");
  const tbody = document.getElementById("contact-management-tbody");
  const noResults = document.getElementById("noContactResults");

  if (!tbody) {
    console.error("Contact table body not found!");
    return;
  }

  console.log("✅ Contact filter initialized successfully!");

  function performFilter() {
    const nameQuery = filterName ? filterName.value.toLowerCase().trim() : "";
    const numberQuery = filterNumber ? filterNumber.value.toLowerCase().trim() : "";
    const instansiQuery = filterInstansi ? filterInstansi.value.toLowerCase().trim() : "";
    const jabatanQuery = filterJabatan ? filterJabatan.value.toLowerCase().trim() : "";
    
    const rows = tbody.querySelectorAll("tr");
    let visibleCount = 0;
    const totalCount = rows.length;

    // Check jika ada pesan "Belum ada kontak"
    if (totalCount === 1 && rows[0].cells.length === 1) {
      if (filterInfo) filterInfo.innerHTML = "";
      if (noResults) noResults.style.display = "none";
      if (clearAllBtn) clearAllBtn.style.display = "none";
      return;
    }

    // Check if any filter is active
    const hasActiveFilter = nameQuery || numberQuery || instansiQuery || jabatanQuery;

    console.log("🔍 Filtering contacts with:", { nameQuery, numberQuery, instansiQuery, jabatanQuery });

    // Show/hide clear all button
    if (clearAllBtn) {
      clearAllBtn.style.display = hasActiveFilter ? "inline-flex" : "none";
    }

    if (!hasActiveFilter) {
      // No filters - show all
      rows.forEach(row => {
        if (row.cells.length > 1) {
          row.style.display = "";
          visibleCount++;
        }
      });
      
      if (filterInfo) filterInfo.innerHTML = "";
      if (noResults) noResults.style.display = "none";
    } else {
      // Apply ALL filters with AND logic
      rows.forEach(row => {
        // Skip jika row hanya punya 1 cell (empty state message)
        if (row.cells.length <= 1) {
          row.style.display = "none";
          return;
        }

        const name = (row.cells[1].textContent || "").toLowerCase();
        const number = (row.cells[2].textContent || "").toLowerCase();
        const instansi = (row.cells[3].textContent || "").toLowerCase();
        const jabatan = (row.cells[4].textContent || "").toLowerCase();
        
        // Check if row matches ALL active filters
        const matchName = !nameQuery || name.includes(nameQuery);
        const matchNumber = !numberQuery || number.includes(numberQuery);
        const matchInstansi = !instansiQuery || instansi.includes(instansiQuery);
        const matchJabatan = !jabatanQuery || jabatan.includes(jabatanQuery);
        
        const matchAll = matchName && matchNumber && matchInstansi && matchJabatan;
        
        if (matchAll) {
          row.style.display = "";
          visibleCount++;
        } else {
          row.style.display = "none";
        }
      });
      
      // Update filter info
      if (filterInfo) {
        const activeFilters = [];
        if (nameQuery) activeFilters.push(`Nama: "${nameQuery}"`);
        if (numberQuery) activeFilters.push(`Nomor: "${numberQuery}"`);
        if (instansiQuery) activeFilters.push(`Instansi: "${instansiQuery}"`);
        if (jabatanQuery) activeFilters.push(`Jabatan: "${jabatanQuery}"`);
        
        if (visibleCount === 0) {
          filterInfo.innerHTML = `
            <i class="fa-solid fa-circle-exclamation"></i> 
            Tidak ada hasil untuk filter: ${activeFilters.join(", ")}
          `;
          filterInfo.style.color = "#f56565";
        } else if (visibleCount === totalCount) {
          filterInfo.innerHTML = `
            <i class="fa-solid fa-check-circle"></i> 
            Menampilkan semua ${totalCount} kontak
          `;
          filterInfo.style.color = "#48bb78";
        } else {
          filterInfo.innerHTML = `
            <i class="fa-solid fa-filter"></i> 
            <strong>${visibleCount}</strong> dari ${totalCount} kontak 
            <span style="color: #718096;">(${activeFilters.length} filter aktif)</span>
          `;
          filterInfo.style.color = "#4299e1";
        }
      }
      
      if (noResults) {
        noResults.style.display = visibleCount === 0 ? "block" : "none";
      }
    }

    // Add visual feedback to active filters
    updateFilterInputStyles();
  }

  function updateFilterInputStyles() {
    const inputs = [filterName, filterNumber, filterInstansi, filterJabatan];
    inputs.forEach(input => {
      if (!input) return;
      if (input.value.trim()) {
        input.style.borderColor = "#4299e1";
        input.style.background = "#ebf8ff";
      } else {
        input.style.borderColor = "#cbd5e0";
        input.style.background = "white";
      }
    });
  }

  function clearAllFilters() {
    if (filterName) filterName.value = "";
    if (filterNumber) filterNumber.value = "";
    if (filterInstansi) filterInstansi.value = "";
    if (filterJabatan) filterJabatan.value = "";
    performFilter();
  }

  // Attach event listeners
  if (filterName) {
    filterName.addEventListener("input", performFilter);
    console.log("✅ filterContactName listener attached");
  }
  if (filterNumber) {
    filterNumber.addEventListener("input", performFilter);
    console.log("✅ filterContactNumber listener attached");
  }
  if (filterInstansi) {
    filterInstansi.addEventListener("input", performFilter);
    console.log("✅ filterContactInstansi listener attached");
  }
  if (filterJabatan) {
    filterJabatan.addEventListener("input", performFilter);
    console.log("✅ filterContactJabatan listener attached");
  }
  
  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", clearAllFilters);
    console.log("✅ clearAllContactFilters listener attached");
  }

  // Initial render
  performFilter();
}
