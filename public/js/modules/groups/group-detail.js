// group-detail.js - Group Detail View & Member Management Module
// FIXED: Use dynamic imports to avoid circular dependencies

let currentGroupId = null;
let selectedMembersToRemove = new Set();
let selectedMembersToAdd = new Set();

/**
 * Show group detail modal with members table
 */
export async function showGroupDetail(id) {
  // Import dinamis untuk menghindari circular dependency
  const groupManager = await import('../groups/group-manager.js');
  const contactManager = await import('../contacts/contact-manager.js');
  
  const groups = groupManager.getGroups();
  const contacts = contactManager.contacts;
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

  groupMainContainer.innerHTML = `
    <div class="group-detail-view">
      <div class="group-detail-header">
        <button id="backToGroupListBtn" class="back-button">
          <i class="fa-solid fa-arrow-left"></i> Kembali
        </button>
        <h3><i class="fa-solid fa-users"></i> ${group.name}</h3>
        <span></span>
      </div>

      <div class="group-info-header">
        <p><i class="fa-solid fa-user-group"></i> Jumlah Anggota: <strong>${membersArray.length}</strong></p>
      </div>

      <div class="members-actions">
        <button class="btn-action btn-add-member" id="addMemberBtn">
          <i class="fa-solid fa-user-plus"></i> Tambah Anggota
        </button>
        <button class="btn-action btn-remove-members" id="removeMembersBtn" disabled>
          <i class="fa-solid fa-user-minus"></i> Hapus Anggota (<span id="removeCount">0</span>)
        </button>
      </div>

      <div class="members-table-header">
        <h4>Daftar Anggota</h4>
      </div>

      ${membersTableHTML}
    </div>
  `;

  attachDetailModalListeners();
}

/**
 * Back to group list
 */
export async function backToGroupList() {
  const groupMainContainer = document.getElementById("groupMainContainer");
  if (!groupMainContainer) return;
  
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
  
  const groupManager = await import('../groups/group-manager.js');
  groupManager.fetchAndRenderGroups();
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

  initMemberSearch();
}

/**
 * Initialize member search filter
 */
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

    const hasActiveFilter = nameQuery || numberQuery || instansiQuery || jabatanQuery;

    console.log("🔍 Filtering with:", { nameQuery, numberQuery, instansiQuery, jabatanQuery });

    if (clearAllBtn) {
      clearAllBtn.style.display = hasActiveFilter ? "inline-flex" : "none";
    }

    if (!hasActiveFilter) {
      rows.forEach(row => {
        row.style.display = "";
        visibleCount++;
      });
      
      if (filterInfo) filterInfo.innerHTML = "";
      if (noResults) noResults.style.display = "none";
    } else {
      rows.forEach(row => {
        const name = (row.dataset.name || "").toLowerCase();
        const number = (row.dataset.number || "").toLowerCase();
        const instansi = (row.dataset.instansi || "").toLowerCase();
        const jabatan = (row.dataset.jabatan || "").toLowerCase();
        
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

    if (selectAllCheck) {
      selectAllCheck.checked = false;
    }

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

  if (filterName) {
    filterName.addEventListener("input", performFilter);
  }
  if (filterNumber) {
    filterNumber.addEventListener("input", performFilter);
  }
  if (filterInstansi) {
    filterInstansi.addEventListener("input", performFilter);
  }
  if (filterJabatan) {
    filterJabatan.addEventListener("input", performFilter);
  }
  
  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", clearAllFilters);
  }

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
async function showAddMembersModal() {
  selectedMembersToAdd.clear();
  
  const modal = document.getElementById("addMembersModal");
  if (!modal) return;

  const groupManager = await import('../groups/group-manager.js');
  const contactManager = await import('../contacts/contact-manager.js');

  const groups = groupManager.getGroups();
  const contacts = contactManager.contacts;
  const group = groups.find(g => g.id === currentGroupId);
  
  let currentMembers = [];
  try {
    currentMembers = JSON.parse(group.members || '[]');
  } catch (e) {
    currentMembers = [];
  }

  const availableContacts = contacts.filter(c => !currentMembers.includes(c.number));

  renderAddMembersList(availableContacts);
  
  modal.style.display = "block";

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
      <strong>${contact.name}</strong> – ${contact.number}
      ${contact.instansi ? `<br><small style="color: #718096; margin-left: 26px;">${contact.instansi}</small>` : ''}
    </label>
  `).join('');

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

  const groupManager = await import('../groups/group-manager.js');
  const contactManager = await import('../contacts/contact-manager.js');

  const groups = groupManager.getGroups();
  const group = groups.find(g => g.id === currentGroupId);
  if (!group) return;

  let currentMembers = [];
  try {
    currentMembers = JSON.parse(group.members || '[]');
  } catch (e) {
    currentMembers = [];
  }

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

    await contactManager.fetchAndRenderContacts();
    await groupManager.fetchAndRenderGroups();
    
    Swal.fire({
      icon: "success",
      title: "Berhasil!",
      text: `${selectedMembersToAdd.size} anggota berhasil ditambahkan`,
      timer: 2000
    });
    
    closeAddMembersModal();
    showGroupDetail(currentGroupId);
    
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

  const groupManager = await import('../groups/group-manager.js');
  const contactManager = await import('../contacts/contact-manager.js');

  const groups = groupManager.getGroups();
  const group = groups.find(g => g.id === currentGroupId);
  if (!group) return;

  let currentMembers = [];
  try {
    currentMembers = JSON.parse(group.members || '[]');
  } catch (e) {
    currentMembers = [];
  }

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

    await contactManager.fetchAndRenderContacts();
    await groupManager.fetchAndRenderGroups();
    
    Swal.fire({
      icon: "success",
      title: "Berhasil!",
      text: `${selectedMembersToRemove.size} anggota berhasil dihapus`,
      timer: 2000
    });
    
    selectedMembersToRemove.clear();
    showGroupDetail(currentGroupId);
    
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