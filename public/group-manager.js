// group-manager.js - Group Management Module with Detail View

import { 
  contacts, 
  fetchAndRenderContacts,
  fetchGroupsForDropdown
} from './contact-manager.js';

import {
  showEditGroupModal,
  closeEditGroupModal
} from './ui-helpers.js';

let groups = [];
export let selectedGroupMembers = new Set();
export let selectedEditGroupMembers = new Set();
let currentGroupId = null; // Track current group being viewed
let selectedMembersToRemove = new Set(); // Track members to remove
let selectedMembersToAdd = new Set(); // Track members to add

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
 * 🆕 Show group detail modal with members table
 */
export async function showGroupDetail(id) {
  const group = groups.find((g) => g.id === id);
  if (!group) {
    Swal.fire("Error", "Grup tidak ditemukan.", "error");
    return;
  }

  currentGroupId = id;
  selectedMembersToRemove.clear();

  let membersArray = [];
  try {
    membersArray = JSON.parse(group.members || '[]');
  } catch (e) {
    console.error("Error parsing group members:", e);
  }

  const groupMainContainer = document.getElementById("groupMainContainer");
  if (!groupMainContainer) return;

  // Build members table HTML
  let membersTableHTML = '';
  
  if (membersArray.length === 0) {
  membersTableHTML = `
    <div class="no-members">
      <i class="fa-solid fa-users-slash"></i>
      <p>Belum ada anggota dalam grup ini</p>
    </div>
  `;
} else {
  const memberDetails = membersArray.map(number => {
    const contact = contacts.find(c => c.number === number);
    return contact || { number, name: 'Tidak dikenal', instansi: '-', jabatan: '-' };
  });

  membersTableHTML = `
    <!-- 🔍 Advanced Filter untuk Anggota -->
    <div class="member-filter-container">
      <div class="filter-header">
        <h4><i class="fa-solid fa-filter"></i> Filter Anggota</h4>
        <button id="clearAllFilters" class="clear-all-filters-btn" style="display: none;">
          <i class="fa-solid fa-times"></i> Reset Semua Filter
        </button>
      </div>
      
      <div class="filter-grid">
        <div class="filter-item">
          <label><i class="fa-solid fa-user"></i> Nama</label>
          <input 
            type="text" 
            id="filterName" 
            placeholder="Cari nama..." 
            class="filter-input"
            autocomplete="off"
          />
        </div>
        
        <div class="filter-item">
          <label><i class="fa-solid fa-phone"></i> Nomor</label>
          <input 
            type="text" 
            id="filterNumber" 
            placeholder="Cari nomor..." 
            class="filter-input"
            autocomplete="off"
          />
        </div>
        
        <div class="filter-item">
          <label><i class="fa-solid fa-building"></i> Instansi</label>
          <input 
            type="text" 
            id="filterInstansi" 
            placeholder="Cari instansi..." 
            class="filter-input"
            autocomplete="off"
          />
        </div>
        
        <div class="filter-item">
          <label><i class="fa-solid fa-briefcase"></i> Jabatan</label>
          <input 
            type="text" 
            id="filterJabatan" 
            placeholder="Cari jabatan..." 
            class="filter-input"
            autocomplete="off"
          />
        </div>
      </div>
      
      <div id="filterResultInfo" class="filter-result-info"></div>
    </div>

    <div class="members-table-wrapper">
      <table class="members-table">
        <thead>
          <tr>
            <th style="width: 40px;">
              <input type="checkbox" id="selectAllMembersCheck" class="member-checkbox" />
            </th>
            <th>Nama</th>
            <th>Nomor</th>
            <th>Instansi</th>
            <th>Jabatan</th>
          </tr>
        </thead>
        <tbody id="membersTableBody">
          ${memberDetails.map(member => `
            <tr data-name="${member.name.toLowerCase()}" 
                data-number="${member.number}" 
                data-instansi="${(member.instansi || '').toLowerCase()}" 
                data-jabatan="${(member.jabatan || '').toLowerCase()}">
              <td>
                <input type="checkbox" class="member-remove-checkbox" value="${member.number}" />
              </td>
              <td><strong>${member.name}</strong></td>
              <td>${member.number}</td>
              <td>${member.instansi || '-'}</td>
              <td>${member.jabatan || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div id="noMemberResults" class="no-search-results" style="display: none;">
        <i class="fa-solid fa-search"></i>
        <p>Tidak ada anggota yang cocok dengan pencarian</p>
      </div>
    </div>
  `;
}

  // Ganti isi container dengan detail view
  groupMainContainer.innerHTML = `
    <div class="group-detail-view">
      <!-- Header dengan tombol kembali -->
      <div class="group-detail-header">
        <button id="backToGroupListBtn" class="back-button">
          <i class="fa-solid fa-arrow-left"></i> Kembali
        </button>
        <h3><i class="fa-solid fa-users"></i> ${group.name}</h3>
        <span></span> <!-- Spacer untuk flex -->
      </div>

      <!-- Info Grup -->
      <div class="group-info-header">
        <p><i class="fa-solid fa-user-group"></i> Jumlah Anggota: <strong>${membersArray.length}</strong></p>
      </div>

      <!-- Tombol Aksi -->
      <div class="members-actions">
        <button class="btn-action btn-add-member" id="addMemberBtn">
          <i class="fa-solid fa-user-plus"></i> Tambah Anggota
        </button>
        <button class="btn-action btn-remove-members" id="removeMembersBtn" disabled>
          <i class="fa-solid fa-user-minus"></i> Hapus Anggota (<span id="removeCount">0</span>)
        </button>
      </div>

      <!-- Daftar Anggota -->
      <div class="members-table-header">
        <h4>Daftar Anggota</h4>
      </div>

      ${membersTableHTML}
    </div>
  `;

  // Attach event listeners
  attachDetailModalListeners();
  const backBtn = document.getElementById("backToGroupListBtn");
  if (backBtn) {
    backBtn.removeEventListener("click", backToGroupList);
    backBtn.addEventListener("click", backToGroupList);
  }
}

export function backToGroupList() {
  const groupMainContainer = document.getElementById("groupMainContainer");
  if (!groupMainContainer) return;
  
  // Reset container HTML ke state awal (table view)
  groupMainContainer.innerHTML = `
    <div class="schedule-header">
      <h3>Daftar Grup Tersimpan</h3>
    </div>

    <div class="table-wrapper">
      <table id="group-management-table">
        <thead>
          <tr>
            <th>Nama Grup</th>
            <th>Jumlah Anggota</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody id="group-management-tbody"></tbody>
      </table>
    </div>
  `;
  
  // Render ulang table
  fetchAndRenderGroups();
}



/**
 * Attach event listeners for detail modal
 */
function attachDetailModalListeners() {
  const backBtn = document.getElementById("backToGroupListBtn");
  if (backBtn) {
    backBtn.addEventListener("click", backToGroupList);
  }
  
  const addBtn = document.getElementById("addMemberBtn");
  if (addBtn) {
    addBtn.addEventListener("click", showAddMembersModal);
  }

  const removeBtn = document.getElementById("removeMembersBtn");
  if (removeBtn) {
    removeBtn.addEventListener("click", handleRemoveMembers);
  }

  // Select all checkbox - UPDATED untuk hanya pilih yang visible
  const selectAllCheck = document.getElementById("selectAllMembersCheck");
  if (selectAllCheck) {
    selectAllCheck.addEventListener("change", function() {
      const visibleCheckboxes = Array.from(document.querySelectorAll(".member-remove-checkbox"))
        .filter(cb => cb.closest('tr').style.display !== 'none');
      
      visibleCheckboxes.forEach(cb => {
        cb.checked = this.checked;
        if (this.checked) {
          selectedMembersToRemove.add(cb.value);
        } else {
          selectedMembersToRemove.delete(cb.value);
        }
      });
      updateRemoveButton();
    });
  }

  const memberCheckboxes = document.querySelectorAll(".member-remove-checkbox");
  memberCheckboxes.forEach(cb => {
    cb.addEventListener("change", function() {
      if (this.checked) {
        selectedMembersToRemove.add(this.value);
      } else {
        selectedMembersToRemove.delete(this.value);
      }
      updateRemoveButton();
    });
  });

  // 🔍 Initialize Member Search
  initMemberSearch();
}
function initMemberSearch() {
  const filterName = document.getElementById("filterName");
  const filterNumber = document.getElementById("filterNumber");
  const filterInstansi = document.getElementById("filterInstansi");
  const filterJabatan = document.getElementById("filterJabatan");
  const clearAllBtn = document.getElementById("clearAllFilters");
  const filterInfo = document.getElementById("filterResultInfo");
  const tbody = document.getElementById("membersTableBody");
  const noResults = document.getElementById("noMemberResults");
  const selectAllCheck = document.getElementById("selectAllMembersCheck");

  if (!tbody) {
    console.error("Table body not found!");
    return;
  }

  console.log("✅ Filter initialized successfully!");

  function performFilter() {
    const nameQuery = filterName ? filterName.value.toLowerCase().trim() : "";
    const numberQuery = filterNumber ? filterNumber.value.toLowerCase().trim() : "";
    const instansiQuery = filterInstansi ? filterInstansi.value.toLowerCase().trim() : "";
    const jabatanQuery = filterJabatan ? filterJabatan.value.toLowerCase().trim() : "";
    
    const rows = tbody.querySelectorAll("tr");
    let visibleCount = 0;
    const totalCount = rows.length;

    // Check if any filter is active
    const hasActiveFilter = nameQuery || numberQuery || instansiQuery || jabatanQuery;

    console.log("🔍 Filtering with:", { nameQuery, numberQuery, instansiQuery, jabatanQuery });

    // Show/hide clear all button
    if (clearAllBtn) {
      clearAllBtn.style.display = hasActiveFilter ? "inline-flex" : "none";
    }

    if (!hasActiveFilter) {
      // No filters - show all
      rows.forEach(row => {
        row.style.display = "";
        visibleCount++;
      });
      
      if (filterInfo) filterInfo.innerHTML = "";
      if (noResults) noResults.style.display = "none";
    } else {
      // Apply ALL filters with AND logic
      rows.forEach(row => {
        const name = (row.dataset.name || "").toLowerCase();
        const number = (row.dataset.number || "").toLowerCase();
        const instansi = (row.dataset.instansi || "").toLowerCase();
        const jabatan = (row.dataset.jabatan || "").toLowerCase();
        
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
            Menampilkan semua ${totalCount} anggota
          `;
          filterInfo.style.color = "#48bb78";
        } else {
          filterInfo.innerHTML = `
            <i class="fa-solid fa-filter"></i> 
            <strong>${visibleCount}</strong> dari ${totalCount} anggota 
            <span style="color: #718096;">(${activeFilters.length} filter aktif)</span>
          `;
          filterInfo.style.color = "#4299e1";
        }
      }
      
      if (noResults) {
        noResults.style.display = visibleCount === 0 ? "block" : "none";
      }
    }

    // Reset select all checkbox when filtering
    if (selectAllCheck) {
      selectAllCheck.checked = false;
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
    console.log("✅ filterName listener attached");
  }
  if (filterNumber) {
    filterNumber.addEventListener("input", performFilter);
    console.log("✅ filterNumber listener attached");
  }
  if (filterInstansi) {
    filterInstansi.addEventListener("input", performFilter);
    console.log("✅ filterInstansi listener attached");
  }
  if (filterJabatan) {
    filterJabatan.addEventListener("input", performFilter);
    console.log("✅ filterJabatan listener attached");
  }
  
  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", clearAllFilters);
    console.log("✅ clearAllBtn listener attached");
  }

  // Initial render
  performFilter();
}
/**
 * Update remove button state
 */
function updateRemoveButton() {
  const removeBtn = document.getElementById("removeMembersBtn");
  const countSpan = document.getElementById("removeCount");
  
  if (removeBtn && countSpan) {
    const count = selectedMembersToRemove.size;
    countSpan.textContent = count;
    removeBtn.disabled = count === 0;
  }
}

/**
 * Show add members modal
 */
function showAddMembersModal() {
  selectedMembersToAdd.clear();
  
  const modal = document.getElementById("addMembersModal");
  if (!modal) return;

  // Get current group members
  const group = groups.find(g => g.id === currentGroupId);
  let currentMembers = [];
  try {
    currentMembers = JSON.parse(group.members || '[]');
  } catch (e) {
    currentMembers = [];
  }

  // Filter contacts not in group
  const availableContacts = contacts.filter(c => !currentMembers.includes(c.number));

  renderAddMembersList(availableContacts);
  
  modal.style.display = "block";

  // Setup search
  const searchInput = document.getElementById("addMemberSearch");
  if (searchInput) {
    searchInput.value = '';
    searchInput.addEventListener("input", function() {
      const searchTerm = this.value.toLowerCase();
      const filtered = availableContacts.filter(c => 
        c.name.toLowerCase().includes(searchTerm) || 
        c.number.includes(searchTerm)
      );
      renderAddMembersList(filtered);
    });
  }

  // Setup select all
  const selectAllCheck = document.getElementById("selectAllAddMembers");
  if (selectAllCheck) {
    selectAllCheck.checked = false;
    selectAllCheck.addEventListener("change", function() {
      const checkboxes = document.querySelectorAll(".add-member-checkbox");
      checkboxes.forEach(cb => {
        cb.checked = this.checked;
        if (this.checked) {
          selectedMembersToAdd.add(cb.value);
        } else {
          selectedMembersToAdd.delete(cb.value);
        }
      });
    });
  }

  // Setup confirm button
  const confirmBtn = document.getElementById("confirmAddMembersBtn");
  if (confirmBtn) {
    confirmBtn.onclick = handleAddMembers;
  }
}

/**
 * Render add members list
 */
function renderAddMembersList(contactsList) {
  const list = document.getElementById("addMembersList");
  if (!list) return;

  if (contactsList.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 20px;">Tidak ada kontak tersedia</p>';
    return;
  }

  list.innerHTML = contactsList.map(contact => `
    <label>
      <input type="checkbox" class="add-member-checkbox" value="${contact.number}" 
             ${selectedMembersToAdd.has(contact.number) ? 'checked' : ''}>
      <strong>${contact.name}</strong> — ${contact.number}
      ${contact.instansi ? `<br><small style="color: #718096; margin-left: 26px;">${contact.instansi}</small>` : ''}
    </label>
  `).join('');

  // Attach change listeners
  const checkboxes = list.querySelectorAll(".add-member-checkbox");
  checkboxes.forEach(cb => {
    cb.addEventListener("change", function() {
      if (this.checked) {
        selectedMembersToAdd.add(this.value);
      } else {
        selectedMembersToAdd.delete(this.value);
      }
    });
  });
}

/**
 * Handle add members
 */
async function handleAddMembers() {
  if (selectedMembersToAdd.size === 0) {
    Swal.fire("Peringatan", "Pilih minimal satu kontak untuk ditambahkan", "warning");
    return;
  }

  const group = groups.find(g => g.id === currentGroupId);
  if (!group) return;

  let currentMembers = [];
  try {
    currentMembers = JSON.parse(group.members || '[]');
  } catch (e) {
    currentMembers = [];
  }

  // Merge with new members
  const updatedMembers = [...new Set([...currentMembers, ...Array.from(selectedMembersToAdd)])];

  try {
    const res = await fetch(`/api/groups/${currentGroupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        name: group.name, 
        contactNumbers: JSON.stringify(updatedMembers) 
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Gagal menambah anggota.');
    }

    await fetchAndRenderContacts();
    await fetchAndRenderGroups();
    
    Swal.fire({
      icon: "success",
      title: "Berhasil!",
      text: `${selectedMembersToAdd.size} anggota berhasil ditambahkan`,
      timer: 2000
    });
    
    closeAddMembersModal();
    showGroupDetail(currentGroupId); // Refresh detail view
    
  } catch (error) {
    console.error("Error adding members:", error);
    Swal.fire("Error", error.message, "error");
  }
}

/**
 * Handle remove members
 */
async function handleRemoveMembers() {
  if (selectedMembersToRemove.size === 0) return;

  const result = await Swal.fire({
    title: "Hapus Anggota?",
    text: `Anda akan menghapus ${selectedMembersToRemove.size} anggota dari grup ini`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#f56565",
    confirmButtonText: "Ya, hapus!",
    cancelButtonText: "Batal",
  });

  if (!result.isConfirmed) return;

  const group = groups.find(g => g.id === currentGroupId);
  if (!group) return;

  let currentMembers = [];
  try {
    currentMembers = JSON.parse(group.members || '[]');
  } catch (e) {
    currentMembers = [];
  }

  // Remove selected members
  const updatedMembers = currentMembers.filter(m => !selectedMembersToRemove.has(m));

  try {
    const res = await fetch(`/api/groups/${currentGroupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        name: group.name, 
        contactNumbers: JSON.stringify(updatedMembers) 
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Gagal menghapus anggota.');
    }

    await fetchAndRenderContacts();
    await fetchAndRenderGroups();
    
    Swal.fire({
      icon: "success",
      title: "Berhasil!",
      text: `${selectedMembersToRemove.size} anggota berhasil dihapus`,
      timer: 2000
    });
    
    selectedMembersToRemove.clear();
    showGroupDetail(currentGroupId); // Refresh detail view
    
  } catch (error) {
    console.error("Error removing members:", error);
    Swal.fire("Error", error.message, "error");
  }
}

/**
 * Close add members modal
 */
export function closeAddMembersModal() {
  const modal = document.getElementById("addMembersModal");
  if (modal) {
    modal.style.display = "none";
  }
  selectedMembersToAdd.clear();
}

/**
 * Show/Close detail group modal
 */
export function showDetailGroupModal() {
  const modal = document.getElementById("detailGroupModal");
  if (modal) {
    modal.style.display = "block";
  }
}

export function closeDetailGroupModal() {
  const modal = document.getElementById("detailGroupModal");
  if (modal) {
    modal.style.display = "none";
  }
  currentGroupId = null;
  selectedMembersToRemove.clear();
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
    await fetchGroupsForDropdown(); 
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
      await fetchGroupsForDropdown(); 
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

  // Cancel button - now just resets form
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

/**
 * LEGACY: Show edit group form in modal (kept for backward compatibility)
 * This is the old edit function that's no longer used in the main flow
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

  // Create edit form in modal
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

  // Setup search functionality
  const searchInput = document.getElementById("editGroupContactSearch");
  if (searchInput) {
    searchInput.addEventListener("input", function() {
      renderEditGroupContactChecklist(this.value);
    });
  }

  // Setup "Select All" checkbox
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

  // Setup form submit
  document.getElementById("editGroupForm").addEventListener("submit", handleEditGroupSubmit);
  document.getElementById("cancelEditGroupBtn").addEventListener("click", closeEditGroupModal);
}

/**
 * Renders contact checklist for edit group modal
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
 * Attaches event listeners to edit group contact checkboxes
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
 * Updates the select all checkbox state (Edit modal)
 */
function updateEditSelectAllState() {
  const selectAllCheckbox = document.getElementById("selectAllEditGroupContacts");
  if (!selectAllCheckbox) return;
  
  const allCheckboxes = document.querySelectorAll(".edit-group-contact-checkbox");
  const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
  selectAllCheckbox.checked = allChecked && allCheckboxes.length > 0;
}

/**
 * Handles edit group form submission
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
    await fetchGroupsForDropdown(); 
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
