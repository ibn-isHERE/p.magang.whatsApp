// contact-ui.js - Contact UI Rendering & Filters (FIXED)

let contacts = [];
let selectedNumbers = new Set();
let selectedMeetingNumbers = new Set();
let selectedContactsToDelete = new Set();

/**
 * Get fresh references before rendering
 */
export function getContactsRef() {
  if (window.contactManagerModule) {
    return window.contactManagerModule.contacts || [];
  }
  return contacts;
}

function getSelectedNumbersRef() {
  if (window.contactManagerModule) {
    return window.contactManagerModule.selectedNumbers || new Set();
  }
  return selectedNumbers;
}

function getSelectedMeetingNumbersRef() {
  if (window.contactManagerModule) {
    return window.contactManagerModule.selectedMeetingNumbers || new Set();
  }
  return selectedMeetingNumbers;
}

function getSelectedContactsToDeleteRef() {
  if (window.contactManagerModule) {
    return window.contactManagerModule.selectedContactsToDelete || new Set();
  }
  return selectedContactsToDelete;
}

/**
 * Renders contact list with checkboxes for message form
 */
export function renderContactList() {
  const list = document.getElementById("contactList");
  if (!list) return;

  list.innerHTML = "";

  const contacts = getContactsRef();
  const selectedNumbers = getSelectedNumbersRef();
  const filteredContacts = getFilteredContacts();

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
          <p style="color: #a0aec0; margin: 0; font-size: 14px;">Tidak ada kontak yang tersedia</p>
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
      <strong>${contact.name}</strong><small>${contact.number}</small>
    `;
    list.appendChild(label);
  });

  document.querySelectorAll(".contact-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      const selectedNumbers = getSelectedNumbersRef();
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
 *  NEW: Get filtered contacts for edit form
 */
export function getFilteredContactsForEdit() {
  const contacts = getContactsRef();
  const searchInput = document.getElementById("edit-contactSearch");

  if (!searchInput) {
    return contacts;
  }

  const query = searchInput.value.toLowerCase().trim();

  if (!query) {
    return contacts;
  }

  return contacts.filter(
    (c) => c.name.toLowerCase().includes(query) || c.number.includes(query)
  );
}

/**
 *  Get filtered meeting contacts for edit form
 */
export function getFilteredMeetingContactsForEdit() {
  const contacts = getContactsRef();
  const searchInput = document.getElementById("edit-meetingContactSearch");

  if (!searchInput) {
    return contacts;
  }

  const query = searchInput.value.toLowerCase().trim();

  if (!query) {
    return contacts;
  }

  return contacts.filter(
    (c) => c.name.toLowerCase().includes(query) || c.number.includes(query)
  );
}
/**
 * Renders meeting contact list with checkboxes
 */
export function renderMeetingContactList() {
  const list = document.getElementById("meetingContactList");
  if (!list) return;

  list.innerHTML = "";

  const contacts = getContactsRef();
  const selectedMeetingNumbers = getSelectedMeetingNumbersRef();
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
          <p style="color: #a0aec0; margin: 0; font-size: 14px;">Tidak ada kontak yang tersedia</p>
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
      <strong>${contact.name}</strong> – ${contact.number}
    `;
    list.appendChild(label);
  });

  document.querySelectorAll(".meeting-contact-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      const selectedMeetingNumbers = getSelectedMeetingNumbersRef();
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
 * Update contact selection info
 */
function updateContactSelectionInfo() {
  const infoDiv = document.getElementById("contactSelectionInfo");
  if (!infoDiv) return;

  const contacts = getContactsRef();
  const selectedNumbers = getSelectedNumbersRef();

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
 * Update meeting contact selection info
 */
function updateMeetingContactSelectionInfo() {
  const infoDiv = document.getElementById("meetingContactSelectionInfo");
  if (!infoDiv) return;

  const contacts = getContactsRef();
  const selectedMeetingNumbers = getSelectedMeetingNumbersRef();

  if (selectedMeetingNumbers.size === 0) {
    infoDiv.innerHTML = "<small>Tidak ada kontak dipilih</small>";
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
 * Get filtered contacts based on search
 *  EXPORTED untuk digunakan di event-handlers.js
 */
export function getFilteredContacts() {
  const contacts = getContactsRef();
  const searchInput = document.getElementById("contactSearch");

  if (!searchInput) {
    return contacts;
  }

  const query = searchInput.value.toLowerCase().trim();

  if (!query) {
    return contacts;
  }

  return contacts.filter(
    (c) => c.name.toLowerCase().includes(query) || c.number.includes(query)
  );
}

/**
 * Get filtered meeting contacts based on search
 *  EXPORTED untuk digunakan di event-handlers.js
 */
export function getFilteredMeetingContacts() {
  const contacts = getContactsRef();
  const searchInput = document.getElementById("meetingContactSearch");

  if (!searchInput) {
    return contacts;
  }

  const query = searchInput.value.toLowerCase().trim();

  if (!query) {
    return contacts;
  }

  return contacts.filter(
    (c) => c.name.toLowerCase().includes(query) || c.number.includes(query)
  );
}

/**
 * Get filtered contacts for contact management table
 *  EXPORTED untuk Select All/Deselect All di Contact Management
 */
export function getFilteredContactsForManagement() {
  const tbody = document.getElementById("contact-management-tbody");
  if (!tbody) return [];

  const contacts = getContactsRef();
  const visibleContactIds = [];

  const rows = tbody.querySelectorAll("tr");
  rows.forEach((row) => {
    // Hanya ambil row yang visible (tidak di-hide oleh filter)
    if (row.style.display !== "none" && row.cells.length > 1) {
      const checkbox = row.querySelector(".contact-delete-checkbox");
      if (checkbox) {
        visibleContactIds.push(parseInt(checkbox.value));
      }
    }
  });

  return contacts.filter((c) => visibleContactIds.includes(c.id));
}

/**
 * Renders contact list for edit form
 */
export function renderContactListForEdit() {
  const list = document.getElementById("edit-contactList");
  if (!list) return;

  const contacts = getContactsRef();
  const selectedNumbers = getSelectedNumbersRef();

  const searchInput = document.getElementById("edit-contactSearch");
  const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : "";

  const filteredContacts = searchQuery
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery) ||
          c.number.includes(searchQuery)
      )
    : contacts;

  list.innerHTML = "";

  if (filteredContacts.length === 0) {
    list.innerHTML = "<p>Tidak ada kontak ditemukan.</p>";
    return;
  }

  filteredContacts.forEach((contact) => {
    const label = document.createElement("label");
    //  Pastikan cek dari selectedNumbers yang benar
    const isChecked = selectedNumbers.has(contact.number) ? "checked" : "";

    label.innerHTML = `
      <input type="checkbox" class="contact-checkbox-edit" value="${contact.number}" ${isChecked}> 
      <strong>${contact.name}</strong> – ${contact.number}
    `;
    list.appendChild(label);
  });

  document.querySelectorAll(".contact-checkbox-edit").forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      const selectedNumbers = getSelectedNumbersRef();
      if (this.checked) {
        selectedNumbers.add(this.value);
      } else {
        selectedNumbers.delete(this.value);
      }

      //  Update info display
      updateContactSelectionInfoForEdit();
    });
  });

  updateContactSelectionInfoForEdit();
}

function updateContactSelectionInfoForEdit() {
  const infoDiv = document.getElementById("editContactSelectionInfo");
  if (!infoDiv) return;

  const contacts = getContactsRef();
  const selectedNumbers = getSelectedNumbersRef();

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
 * Renders meeting contact list for edit form
 */
export function renderMeetingContactListForEdit() {
  const list = document.getElementById("edit-meetingContactList");
  if (!list) return;

  list.innerHTML = "";

  const contacts = getContactsRef();
  const selectedMeetingNumbers = getSelectedMeetingNumbersRef();

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
    //  PERBAIKAN: Pastikan cek dari selectedMeetingNumbers yang benar
    const isChecked = selectedMeetingNumbers.has(contact.number)
      ? "checked"
      : "";

    label.innerHTML = `
      <input type="checkbox" class="meeting-contact-checkbox-edit" value="${contact.number}" ${isChecked}> 
      <strong>${contact.name}</strong> – ${contact.number}
    `;
    list.appendChild(label);
  });

  document
    .querySelectorAll(".meeting-contact-checkbox-edit")
    .forEach((checkbox) => {
      checkbox.addEventListener("change", function () {
        const selectedMeetingNumbers = getSelectedMeetingNumbersRef();
        if (this.checked) {
          selectedMeetingNumbers.add(this.value);
        } else {
          selectedMeetingNumbers.delete(this.value);
        }

        //  Update info display
        updateMeetingContactSelectionInfoForEdit();
      });
    });

  updateMeetingContactSelectionInfoForEdit();
}

function updateMeetingContactSelectionInfoForEdit() {
  const infoDiv = document.getElementById("editMeetingContactSelectionInfo");
  if (!infoDiv) return;

  const contacts = getContactsRef();
  const selectedMeetingNumbers = getSelectedMeetingNumbersRef();

  if (selectedMeetingNumbers.size === 0) {
    infoDiv.innerHTML = "<small>Tidak ada kontak dipilih</small>";
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
 * Renders contact management table
 */
export function renderContactManagementTable(
  contactsData,
  selectedContactsToDeleteRef
) {
  const tbody = document.getElementById("contact-management-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (contactsData.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align: center;"><div class="empty-state" style="padding: 40px 20px;"><i class="fa-solid fa-address-book" style="font-size: 48px; color: #cbd5e0; margin-bottom: 12px;"></i><p style="color: #a0aec0; margin: 0; font-size: 14px;">Tidak ada kontak yang tersedia</p></div></td></tr>';
    updateBulkDeleteButton(selectedContactsToDeleteRef);
    return;
  }

  contactsData.forEach((contact) => {
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

    const isChecked = selectedContactsToDeleteRef.has(contact.id)
      ? "checked"
      : "";

    row.setAttribute("data-contact-id", contact.id);

    row.innerHTML = `
  <td style="text-align: center; width: 40px;">
    <input 
      type="checkbox" 
      class="contact-delete-checkbox" 
      value="${contact.id}" 
      data-contact-number="${contact.number}"
      ${isChecked}
      style="cursor: pointer; width: 18px; height: 18px;"
    />
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

  attachDeleteCheckboxListeners(selectedContactsToDeleteRef);
  updateBulkDeleteButton(selectedContactsToDeleteRef);

  //  Re-initialize bulk delete listeners setiap kali tabel di-render
  setTimeout(() => {
    initContactManagementFilter();
    initBulkDeleteListeners();
  }, 100);
}

/**
 * Attach delete checkbox listeners
 */
function attachDeleteCheckboxListeners(selectedContactsToDeleteRef) {
  const checkboxes = document.querySelectorAll(".contact-delete-checkbox");
  checkboxes.forEach((cb) => {
    cb.addEventListener("change", function () {
      const contactId = parseInt(this.value);
      if (this.checked) {
        selectedContactsToDeleteRef.add(contactId);
      } else {
        selectedContactsToDeleteRef.delete(contactId);
      }
      updateBulkDeleteButton(selectedContactsToDeleteRef);
    });
  });
}

/**
 * Update bulk delete button
 */
function updateBulkDeleteButton(selectedContactsToDeleteRef) {
  const bulkDeleteBtn = document.getElementById("bulkDeleteContactBtn");
  const countSpan = document.getElementById("bulkDeleteCount");

  if (bulkDeleteBtn && countSpan) {
    const count = selectedContactsToDeleteRef.size;
    countSpan.textContent = ` ${count} `;
    bulkDeleteBtn.disabled = count === 0;

    if (count > 0) {
      bulkDeleteBtn.style.display = "inline-flex";
    } else {
      bulkDeleteBtn.style.display = "none";
    }
  }
}

/**
 * Initialize contact management filter
 */
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

  console.log(" Contact filter initialized successfully!");

  function performFilter() {
    const nameQuery = filterName ? filterName.value.toLowerCase().trim() : "";
    const numberQuery = filterNumber
      ? filterNumber.value.toLowerCase().trim()
      : "";
    const instansiQuery = filterInstansi
      ? filterInstansi.value.toLowerCase().trim()
      : "";
    const jabatanQuery = filterJabatan
      ? filterJabatan.value.toLowerCase().trim()
      : "";

    const rows = tbody.querySelectorAll("tr");
    let visibleCount = 0;
    const totalCount = rows.length;

    if (totalCount === 1 && rows[0].cells.length === 1) {
      if (filterInfo) filterInfo.innerHTML = "";
      if (noResults) noResults.style.display = "none";
      if (clearAllBtn) clearAllBtn.style.display = "none";
      return;
    }

    const hasActiveFilter =
      nameQuery || numberQuery || instansiQuery || jabatanQuery;

    if (clearAllBtn) {
      clearAllBtn.style.display = hasActiveFilter ? "inline-flex" : "none";
    }

    if (!hasActiveFilter) {
      rows.forEach((row) => {
        if (row.cells.length > 1) {
          row.style.display = "";
          visibleCount++;
        }
      });

      if (filterInfo) filterInfo.innerHTML = "";
      if (noResults) noResults.style.display = "none";
    } else {
      rows.forEach((row) => {
        if (row.cells.length <= 1) {
          row.style.display = "none";
          return;
        }

        const name = (row.cells[1].textContent || "").toLowerCase();
        const number = (row.cells[2].textContent || "").toLowerCase();
        const instansi = (row.cells[3].textContent || "").toLowerCase();
        const jabatan = (row.cells[4].textContent || "").toLowerCase();

        const matchName = !nameQuery || name.includes(nameQuery);
        const matchNumber = !numberQuery || number.includes(numberQuery);
        const matchInstansi =
          !instansiQuery || instansi.includes(instansiQuery);
        const matchJabatan = !jabatanQuery || jabatan.includes(jabatanQuery);

        const matchAll =
          matchName && matchNumber && matchInstansi && matchJabatan;

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

    updateFilterInputStyles();
  }

  function updateFilterInputStyles() {
    const inputs = [filterName, filterNumber, filterInstansi, filterJabatan];
    inputs.forEach((input) => {
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
 * Initialize bulk delete listeners
 * Tambah Select All/Deselect All untuk Contact Management
 */
export function initBulkDeleteListeners() {
  const bulkDeleteBtn = document.getElementById("bulkDeleteContactBtn");
  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener("click", async () => {
      const contactManager = await import("./contact-manager.js");
      contactManager.handleBulkDeleteContacts();
    });
  }

  // Select All / Deselect All untuk Contact Management
  const selectAllMgmtBtn = document.getElementById("selectAllContactsDelete");
  const deselectAllMgmtBtn = document.getElementById(
    "deselectAllContactsDelete"
  );

  if (selectAllMgmtBtn) {
    // Hapus event listener lama jika ada
    const newSelectAllBtn = selectAllMgmtBtn.cloneNode(true);
    selectAllMgmtBtn.parentNode.replaceChild(newSelectAllBtn, selectAllMgmtBtn);

    newSelectAllBtn.addEventListener("click", function () {
      const selectedContactsToDeleteRef = getSelectedContactsToDeleteRef();

      // Ambil hanya checkbox yang VISIBLE (setelah filter)
      const visibleCheckboxes = Array.from(
        document.querySelectorAll(".contact-delete-checkbox")
      ).filter((cb) => {
        const row = cb.closest("tr");
        return row && row.style.display !== "none";
      });

      visibleCheckboxes.forEach((checkbox) => {
        const contactId = parseInt(checkbox.value);
        selectedContactsToDeleteRef.add(contactId);
        checkbox.checked = true;
      });

      updateBulkDeleteButton(selectedContactsToDeleteRef);

      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }

  if (deselectAllMgmtBtn) {
    // Hapus event listener lama jika ada
    const newDeselectAllBtn = deselectAllMgmtBtn.cloneNode(true);
    deselectAllMgmtBtn.parentNode.replaceChild(
      newDeselectAllBtn,
      deselectAllMgmtBtn
    );

    newDeselectAllBtn.addEventListener("click", function () {
      const selectedContactsToDeleteRef = getSelectedContactsToDeleteRef();

      // Hilangkan hanya yang VISIBLE
      const visibleCheckboxes = Array.from(
        document.querySelectorAll(".contact-delete-checkbox")
      ).filter((cb) => {
        const row = cb.closest("tr");
        return row && row.style.display !== "none";
      });

      visibleCheckboxes.forEach((checkbox) => {
        const contactId = parseInt(checkbox.value);
        selectedContactsToDeleteRef.delete(contactId);
        checkbox.checked = false;
      });

      updateBulkDeleteButton(selectedContactsToDeleteRef);

      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }
}