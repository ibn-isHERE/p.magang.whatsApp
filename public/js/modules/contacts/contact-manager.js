// contact-manager.js - Contact Management Module (FIXED - No Circular Dependencies)

import { showEditContactModal, closeEditContactModal } from "../ui/ui-helpers.js";

// ============================================
// STATE MANAGEMENT - EXPORTED
// ============================================
export let contacts = [];
let filteredContacts = [];
export let selectedNumbers = new Set();
export let selectedMeetingNumbers = new Set();
export let selectedContactGroups = new Set();
export let selectedEditContactGroups = new Set();
export let selectedContactsToDelete = new Set();

// ============================================
// CORE FUNCTIONS
// ============================================

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

    // Import dynamically to avoid circular dependency
    const contactUI = await import('./contact-ui.js');
    contactUI.renderContactManagementTable(contacts, selectedContactsToDelete);
    contactUI.renderContactList();
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
      const groups = result.data.sort((a, b) => a.name.localeCompare(b.name));
      
      // Import dynamically
      const contactGroups = await import('./contact-groups.js');
      contactGroups.setGroups(groups);
      contactGroups.renderGroupSelectionList();
      contactGroups.renderMeetingGroupSelectionList();
      contactGroups.renderContactCrudGroupList();
    }
  } catch (error) {
    console.error("Error fetching groups:", error);
  }
}

/**
 * Shows edit contact form with data
 */
export async function showEditContactForm(id) {
  const convertContactId = parseInt(id);
  const contact = contacts.find((c) => c.id === convertContactId);

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
      <input type="hidden" id="edit-contact-id" value="${contact.id}">
      
      <label for="edit-contact-name">Nama Kontak:</label>
      <input type="text" id="edit-contact-name" class="phone-num-input" value="${contact.name}" required>
      
      <label for="edit-contact-number">Nomor (contoh: 0812...):</label>
      <input type="tel" id="edit-contact-number" class="phone-num-input" value="${contact.number}" required>

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

  document.getElementById("edit-contact-instansi").value = contact.instansi;
  document.getElementById("edit-contact-jabatan").value = contact.jabatan;

  const contactGroups = await import('./contact-groups.js');
  contactGroups.renderEditContactGroupList();

  const searchInput = document.getElementById("editContactGroupSearch");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      contactGroups.renderEditContactGroupList(this.value);
    });
  }

  showEditContactModal();

  document.getElementById("editContactForm").addEventListener("submit", handleEditContactSubmit);
  document.getElementById("cancelEditContactBtn").addEventListener("click", closeEditContactModal);
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
export async function resetContactCrudForm() {
  document.getElementById("contact-crud-form").reset();
  document.getElementById("contact-crud-id").value = "";
  document.getElementById("contact-crud-submit").textContent = "Tambah Kontak";
  document.getElementById("contact-crud-cancel").style.display = "none";
  selectedContactGroups.clear();
  
  const contactGroups = await import('./contact-groups.js');
  contactGroups.renderContactCrudGroupList();
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
    .slice(0, 5);

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

    if (failCount === 0) {
      await Swal.fire({
        icon: "success",
        title: "✅ Berhasil!",
        html: `<p><strong>${successCount} kontak</strong> berhasil dihapus</p>`,
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
 * Get contacts array
 */
export function getContacts() {
  return contacts;
}

/**
 * Get filtered contacts
 */
export function getFilteredContacts() {
  return filteredContacts;
}

/**
 * Set filtered contacts
 */
export function setFilteredContacts(filtered) {
  filteredContacts = filtered;
}

/**
 * Initialize contact listeners
 */
export async function initContactListeners() {
  const contactSearch = document.getElementById("contactSearch");
  if (contactSearch) {
    contactSearch.addEventListener("input", async function () {
      const query = this.value.toLowerCase().trim();
      filteredContacts = contacts.filter(
        (c) => c.name.toLowerCase().includes(query) || c.number.includes(query)
      );
      const contactUI = await import('./contact-ui.js');
      contactUI.renderContactList();
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

  // Initialize contact CRUD group search
  const contactCrudGroupSearch = document.getElementById("contactCrudGroupSearch");
  if (contactCrudGroupSearch) {
    contactCrudGroupSearch.addEventListener("input", async function () {
      const contactGroups = await import('./contact-groups.js');
      contactGroups.renderContactCrudGroupList(this.value);
    });
  }

  // Initialize group selection listeners
  const contactGroups = await import('./contact-groups.js');
  contactGroups.initGroupSelectionListeners();

  // Initialize bulk delete
  const contactUI = await import('./contact-ui.js');
  contactUI.initBulkDeleteListeners();
}

/**
 * Initialize meeting contact listeners
 */
export async function initMeetingContactListeners() {
  const searchInput = document.getElementById("meetingContactSearch");
  if (searchInput) {
    searchInput.addEventListener("input", async () => {
      const contactUI = await import('./contact-ui.js');
      contactUI.renderMeetingContactList();
    });
  }

  // Initialize meeting group selection
  const contactGroups = await import('./contact-groups.js');
  contactGroups.initMeetingGroupSelectionListeners();
}

/**
 * Initialize tab system for message form
 */
export function initMessageFormTabs() {
  const tabs = document.querySelectorAll("#messageFormContainer .recipient-tab");
  const panels = document.querySelectorAll("#messageFormContainer .recipient-panel");

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
  const tabs = document.querySelectorAll("#meetingFormContainer .recipient-tab");
  const panels = document.querySelectorAll("#meetingFormContainer .recipient-panel");

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