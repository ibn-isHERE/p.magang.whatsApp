// contact-manager.js - Contact Management Module dengan Enhanced Group Selection
import { showEditContactModal, closeEditContactModal } from "./ui-helpers.js";

export let contacts = []; 
let filteredContacts = [];
let groups = []; 
export let selectedNumbers = new Set();
export let selectedMeetingNumbers = new Set();
export let selectedGroups = new Set();
export let selectedMeetingGroups = new Set();

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
      updateAllGroupDropdowns();
      renderGroupSelectionList();
      renderMeetingGroupSelectionList();
    }
  } catch (error) {
    console.error("Error fetching groups:", error);
  }
}

/**
 * Updates all group dropdowns in the application
 */
export function updateAllGroupDropdowns() {
  const addContactDropdown = document.getElementById("contact-crud-grup");
  if (addContactDropdown) {
    updateSingleDropdown(addContactDropdown);
  }
}

/**
 * Updates a single dropdown with current groups
 */
function updateSingleDropdown(dropdown) {
  const currentValue = dropdown.value;
  dropdown.innerHTML = '<option value="">-- Pilih Grup --</option>';
  
  groups.forEach((group) => {
    const option = document.createElement("option");
    option.value = group.name;
    option.textContent = group.name;
    dropdown.appendChild(option);
  });

  if (currentValue && groups.some(g => g.name === currentValue)) {
    dropdown.value = currentValue;
  }
}

/**
 * Renders group selection list untuk message form dengan search
 */
/**
 * Renders group selection list untuk message form dengan search
 */
export function renderGroupSelectionList(searchQuery = '') {
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

  // Filter groups based on search query
  const filteredGroups = searchQuery 
    ? groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
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
      const members = JSON.parse(group.members || '[]');
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

  // Attach event listeners
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
/**
 * Renders group selection list untuk meeting form dengan search
 */
export function renderMeetingGroupSelectionList(searchQuery = '') {
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

  // Filter groups based on search query
  const filteredGroups = searchQuery 
    ? groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
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
      const members = JSON.parse(group.members || '[]');
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

  document.querySelectorAll(".meeting-group-selection-checkbox").forEach((checkbox) => {
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
  
  const selectedGroupNames = Array.from(selectedGroups).map(id => {
    const group = groups.find(g => g.id === id);
    return group ? group.name : '';
  }).filter(name => name);
  
  // Hitung total anggota
  let totalMembers = 0;
  selectedGroups.forEach(id => {
    const group = groups.find(g => g.id === id);
    if (group && group.members) {
      try {
        const members = JSON.parse(group.members);
        totalMembers += members.length;
      } catch (e) {}
    }
  });
  
  infoDiv.innerHTML = `
    <small>
      <strong>${selectedGroups.size} grup dipilih</strong> (${totalMembers} anggota)<br>
      ${selectedGroupNames.join(', ')}
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
  
  const selectedGroupNames = Array.from(selectedMeetingGroups).map(id => {
    const group = groups.find(g => g.id === id);
    return group ? group.name : '';
  }).filter(name => name);
  
  // Hitung total anggota
  let totalMembers = 0;
  selectedMeetingGroups.forEach(id => {
    const group = groups.find(g => g.id === id);
    if (group && group.members) {
      try {
        const members = JSON.parse(group.members);
        totalMembers += members.length;
      } catch (e) {}
    }
  });
  
  infoDiv.innerHTML = `
    <small>
      <strong>${selectedMeetingGroups.size} grup dipilih</strong> (${totalMembers} anggota)<br>
      ${selectedGroupNames.join(', ')}
    </small>
  `;
}

/**
 * Mendapatkan semua nomor dari grup yang dipilih
 */
export function getNumbersFromSelectedGroups(isForMeeting = false) {
  const selectedGroupSet = isForMeeting ? selectedMeetingGroups : selectedGroups;
  const numbers = new Set();
  
  selectedGroupSet.forEach(groupId => {
    const group = groups.find(g => g.id === groupId);
    if (group && group.members) {
      try {
        const members = JSON.parse(group.members);
        members.forEach(number => numbers.add(number));
      } catch (e) {
        console.error("Error parsing group members:", e);
      }
    }
  });
  
  return Array.from(numbers);
}

/**
 * Renders contacts in the management table
 */
function renderContactManagementTable() {
  const tbody = document.getElementById("contact-management-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  
  if (contacts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Belum ada kontak</td></tr>';
    return;
  }

  contacts.forEach((contact) => {
    const row = document.createElement("tr");
    
    let groupDisplay = '';
    try {
        let groupsArray = contact.grup ? JSON.parse(contact.grup) : [];
        if (Array.isArray(groupsArray) && groupsArray.length > 0) {
            groupDisplay = groupsArray.join(', ');
        } else {
            groupDisplay = '-';
        }
    } catch (e) {
        groupDisplay = contact.grup || '-';
    }

    row.innerHTML = `
      <td>${contact.name}</td>
      <td>${contact.number}</td>
      <td>${contact.instansi}</td>
      <td>${contact.jabatan}</td>
      <td>${groupDisplay}</td>
      <td class="action-buttons">
        <button class="edit-contact-btn" onclick="window.contactModule.showEditContactForm(${contact.id})">
          <i class="fa-solid fa-edit"></i> Edit
        </button>
        <button class="delete-contact-btn" onclick="window.contactModule.deleteContact(${contact.id}, '${contact.name}')">
          <i class="fa-solid fa-trash"></i> Hapus
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * Shows edit contact form with data
 */
export async function showEditContactForm(id, name, number, instansi, jabatan, grup) {
  const modalBody = document.getElementById("editContactModalBody");
  if (!modalBody) return;

  await fetchGroupsForDropdown();

  modalBody.innerHTML = `
    <form id="editContactForm">
      <input type="hidden" id="edit-contact-id" value="${id}">
      
      <label for="edit-contact-name">Nama Kontak:</label>
      <input type="text" id="edit-contact-name" class="phone-num-input" value="${name}" required>
      
      <label for="edit-contact-number">Nomor (contoh: 0812...):</label>
      <input type="tel" id="edit-contact-number" class="phone-num-input" value="${number}" required>

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

      <label for="edit-contact-grup">Grup:</label>
      <select id="edit-contact-grup" class="phone-num-input">
        <option value="">-- Pilih Grup --</option>
      </select>

      <button type="submit" id="updateContactBtn">Update Kontak</button>
      <button type="button" id="cancelEditContactBtn" style="background-color: #6c757d; margin-top: 10px;">Batal</button>
    </form>
  `;

  document.getElementById("edit-contact-instansi").value = instansi || "";
  document.getElementById("edit-contact-jabatan").value = jabatan || "";
  
  const grupDropdown = document.getElementById("edit-contact-grup");
  grupDropdown.innerHTML = '<option value="">-- Pilih Grup --</option>';
  groups.forEach((g) => {
    const option = document.createElement("option");
    option.value = g.name;
    option.textContent = g.name;
    grupDropdown.appendChild(option);
  });
  grupDropdown.value = grup || "";

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
  const grup = document.getElementById("edit-contact-grup").value;

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
    fetchAndRenderContacts();
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
      fetchAndRenderContacts();
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
  const grup = document.getElementById("contact-crud-grup").value;

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
/**
 * Renders contact list with checkboxes for message form
 */
export function renderContactList() {
  const list = document.getElementById("contactList");
  if (!list) return;

  list.innerHTML = "";
  
  if (filteredContacts.length === 0) {
    const hasSearchQuery = document.getElementById("contactSearch")?.value.trim();
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
    infoDiv.innerHTML = '<small>Belum ada kontak dipilih</small>';
    infoDiv.classList.add('empty');
    return;
  }
  
  const selectedNames = Array.from(selectedNumbers).map(number => {
    const contact = contacts.find(c => c.number === number);
    return contact ? contact.name : number;
  }).slice(0, 3);
  
  let infoText = `<strong>${selectedNumbers.size} kontak dipilih</strong>`;
  if (selectedNames.length > 0) {
    infoText += `<br><small>${selectedNames.join(', ')}${selectedNumbers.size > 3 ? ', ...' : ''}</small>`;
  }
  
  infoDiv.innerHTML = infoText;
  infoDiv.classList.remove('empty');
}

/**
 * Renders meeting contact list with checkboxes
 */
/**
 * Renders meeting contact list with checkboxes
 */
export function renderMeetingContactList() {
  const list = document.getElementById("meetingContactList");
  if (!list) return;

  list.innerHTML = "";
  const currentSearch = document
    .getElementById("meetingContactSearch")
    ?.value.toLowerCase().trim() || '';
    
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
      <input type="checkbox" class="meeting-contact-checkbox" value="${contact.number}" ${isChecked ? "checked" : ""} />
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
    infoDiv.innerHTML = '<small>Belum ada kontak dipilih</small>';
    infoDiv.classList.add('empty');
    return;
  }
  
  const selectedNames = Array.from(selectedMeetingNumbers).map(number => {
    const contact = contacts.find(c => c.number === number);
    return contact ? contact.name : number;
  }).slice(0, 3);
  
  let infoText = `<strong>${selectedMeetingNumbers.size} kontak dipilih</strong>`;
  if (selectedNames.length > 0) {
    infoText += `<br><small>${selectedNames.join(', ')}${selectedMeetingNumbers.size > 3 ? ', ...' : ''}</small>`;
  }
  
  infoDiv.innerHTML = infoText;
  infoDiv.classList.remove('empty');
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
  
  // Initialize group search
  const groupSearch = document.getElementById("groupSearch");
  if (groupSearch) {
    groupSearch.addEventListener("input", function() {
      renderGroupSelectionList(this.value);
    });
  }
  
  // Initialize quick actions for contacts
  const selectAllContactsBtn = document.getElementById("selectAllContactsBtn");
  if (selectAllContactsBtn) {
    selectAllContactsBtn.addEventListener("click", function() {
      contacts.forEach(contact => selectedNumbers.add(contact.number));
      renderContactList();
      this.classList.add('active');
      setTimeout(() => this.classList.remove('active'), 300);
    });
  }
  
  const deselectAllContactsBtn = document.getElementById("deselectAllContactsBtn");
  if (deselectAllContactsBtn) {
    deselectAllContactsBtn.addEventListener("click", function() {
      selectedNumbers.clear();
      renderContactList();
    });
  }
  
  // Initialize quick actions for groups
  const selectAllGroupsBtn = document.getElementById("selectAllGroupsBtn");
  if (selectAllGroupsBtn) {
    selectAllGroupsBtn.addEventListener("click", function() {
      groups.forEach(group => selectedGroups.add(group.id));
      renderGroupSelectionList();
      this.classList.add('active');
      setTimeout(() => this.classList.remove('active'), 300);
    });
  }
  
  const deselectAllGroupsBtn = document.getElementById("deselectAllGroupsBtn");
  if (deselectAllGroupsBtn) {
    deselectAllGroupsBtn.addEventListener("click", function() {
      selectedGroups.clear();
      renderGroupSelectionList();
    });
  }
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
  
  // Initialize meeting group search
  const meetingGroupSearch = document.getElementById("meetingGroupSearch");
  if (meetingGroupSearch) {
    meetingGroupSearch.addEventListener("input", function() {
      renderMeetingGroupSelectionList(this.value);
    });
  }
  
  // Initialize quick actions for meeting contacts
  const selectAllMeetingContactsBtn = document.getElementById("selectAllMeetingContactsBtn");
  if (selectAllMeetingContactsBtn) {
    selectAllMeetingContactsBtn.addEventListener("click", function() {
      contacts.forEach(contact => selectedMeetingNumbers.add(contact.number));
      renderMeetingContactList();
      this.classList.add('active');
      setTimeout(() => this.classList.remove('active'), 300);
    });
  }
  
  const deselectAllMeetingContactsBtn = document.getElementById("deselectAllMeetingContactsBtn");
  if (deselectAllMeetingContactsBtn) {
    deselectAllMeetingContactsBtn.addEventListener("click", function() {
      selectedMeetingNumbers.clear();
      renderMeetingContactList();
    });
  }
  
  // Initialize quick actions for meeting groups
  const selectAllMeetingGroupsBtn = document.getElementById("selectAllMeetingGroupsBtn");
  if (selectAllMeetingGroupsBtn) {
    selectAllMeetingGroupsBtn.addEventListener("click", function() {
      groups.forEach(group => selectedMeetingGroups.add(group.id));
      renderMeetingGroupSelectionList();
      this.classList.add('active');
      setTimeout(() => this.classList.remove('active'), 300);
    });
  }
  
  const deselectAllMeetingGroupsBtn = document.getElementById("deselectAllMeetingGroupsBtn");
  if (deselectAllMeetingGroupsBtn) {
    deselectAllMeetingGroupsBtn.addEventListener("click", function() {
      selectedMeetingGroups.clear();
      renderMeetingGroupSelectionList();
    });
  }
}

/**
 * Initialize tab system for message form
 */
export function initMessageFormTabs() {
  const tabs = document.querySelectorAll('#messageFormContainer .recipient-tab');
  const panels = document.querySelectorAll('#messageFormContainer .recipient-panel');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const targetTab = this.dataset.tab;
      
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      panels.forEach(p => p.classList.remove('active'));
      
      if (targetTab === 'contacts') {
        document.getElementById('contactsPanel').classList.add('active');
      } else if (targetTab === 'groups') {
        document.getElementById('groupsPanel').classList.add('active');
      }
    });
  });
}

/**
 * Initialize tab system for meeting form
 */
export function initMeetingFormTabs() {
  const tabs = document.querySelectorAll('#meetingFormContainer .recipient-tab');
  const panels = document.querySelectorAll('#meetingFormContainer .recipient-panel');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const targetTab = this.dataset.tab;
      
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      panels.forEach(p => p.classList.remove('active'));
      
      if (targetTab === 'meeting-contacts') {
        document.getElementById('meetingContactsPanel').classList.add('active');
      } else if (targetTab === 'meeting-groups') {
        document.getElementById('meetingGroupsPanel').classList.add('active');
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