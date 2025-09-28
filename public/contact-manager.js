// contact-manager.js - Contact Management Module

let contacts = [];
let filteredContacts = [];
export let selectedNumbers = new Set();
export let selectedMeetingNumbers = new Set();

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

    // Sort alphabetically by name
    result.data.sort((a, b) => a.name.localeCompare(b.name));
    contacts = result.data;
    filteredContacts = contacts;

    // Render to management table
    renderContactManagementTable();
    // Update checkbox lists
    renderContactList();
  } catch (error) {
    console.error("Error fetching contacts:", error);
    Swal.fire("Error", error.message, "error");
  }
}

/**
 * Renders contacts in the management table
 */
function renderContactManagementTable() {
  const managementTbody = document.getElementById("contact-management-tbody");
  if (!managementTbody) return;

  managementTbody.innerHTML = "";
  contacts.forEach((contact) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${contact.name}</td>
      <td>${contact.number}</td>
      <td class="action-buttons">
        <button class="edit-btn" onclick="window.showEditContactForm(${contact.id}, '${contact.name}', '${contact.number}')">
          <i class="material-icons">edit</i>
        </button>
        <button class="cancel-btn" onclick="window.deleteContact(${contact.id}, '${contact.name}')">
          <i class="material-icons">delete</i>
        </button>
      </td>
    `;
    managementTbody.appendChild(row);
  });
}

/**
 * Shows edit contact form with data
 */
export function showEditContactForm(id, name, number) {
  document.getElementById("contact-crud-id").value = id;
  document.getElementById("contact-crud-name").value = name;
  document.getElementById("contact-crud-number").value = number;
  document.getElementById("contact-crud-submit").textContent = "Update Kontak";
  document.getElementById("contact-crud-cancel").style.display = "inline-block";

  document.getElementById("contactsFormContainer").scrollIntoView({ behavior: "smooth" });
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
export async function handleContactFormSubmit(event) {
  event.preventDefault();

  const id = document.getElementById("contact-crud-id").value;
  const name = document.getElementById("contact-crud-name").value;
  const number = document.getElementById("contact-crud-number").value;

  const isEditing = !!id;
  const url = isEditing ? `/api/contacts/${id}` : "/api/contacts";
  const method = isEditing ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, number }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Terjadi kesalahan.");

    Swal.fire("Sukses!", `Kontak berhasil ${isEditing ? "diupdate" : "ditambahkan"}.`, "success");
    resetContactCrudForm();
    fetchAndRenderContacts();
  } catch (error) {
    Swal.fire("Error", error.message, "error");
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
    list.innerHTML = "<p>Tidak ada kontak ditemukan.</p>";
    return;
  }

  filteredContacts.forEach((contact) => {
    const label = document.createElement("label");
    const isChecked = selectedNumbers.has(contact.number) ? "checked" : "";
    label.innerHTML = `
      <input type="checkbox" class="contact-checkbox" name="selectedContacts" value="${contact.number}" ${isChecked} />
      <strong>${contact.name}</strong> – ${contact.number}
    `;
    list.appendChild(label);
  });

  document.querySelectorAll(".contact-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      if (this.checked) {
        selectedNumbers.add(this.value);
      } else {
        selectedNumbers.delete(this.value);
        document.getElementById("selectAllContacts").checked = false;
      }
      updateSelectAllCheckboxState();
    });
  });
  updateSelectAllCheckboxState();
}

/**
 * Updates select all checkbox state
 */
function updateSelectAllCheckboxState() {
  const selectAllCheckbox = document.getElementById("selectAllContacts");
  if (selectAllCheckbox) {
    const allChecked =
      filteredContacts.length > 0 &&
      filteredContacts.every((c) => selectedNumbers.has(c.number));
    selectAllCheckbox.checked = allChecked;
  }
}

/**
 * Renders meeting contact list with checkboxes
 */
export function renderMeetingContactList() {
  const list = document.getElementById("meetingContactList");
  if (!list) return;

  list.innerHTML = "";
  const currentSearch = document.getElementById("meetingContactSearch").value.toLowerCase().trim();
  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(currentSearch) ||
      c.number.includes(currentSearch)
  );

  if (filtered.length === 0) {
    list.innerHTML = "<p>Tidak ada kontak ditemukan.</p>";
    return;
  }

  filtered.forEach((contact) => {
    const label = document.createElement("label");
    const isChecked = selectedMeetingNumbers.has(contact.number);
    label.innerHTML = `
      <input type="checkbox" class="meeting-contact-checkbox" value="${contact.number}" ${isChecked ? "checked" : ""} />
      <strong>${contact.name}</strong> – ${contact.number}
    `;
    list.appendChild(label);
  });
}

/**
 * Initializes contact event listeners
 */
export function initContactListeners() {
  const selectAllCheckbox = document.getElementById("selectAllContacts");
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", function () {
      const isChecked = this.checked;
      filteredContacts.forEach((contact) => {
        if (isChecked) {
          selectedNumbers.add(contact.number);
        } else {
          selectedNumbers.delete(contact.number);
        }
      });
      renderContactList();
    });
  }

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
}

/**
 * Initializes meeting contact listeners
 */
export function initMeetingContactListeners() {
  const searchInput = document.getElementById("meetingContactSearch");
  const selectAllCheckbox = document.getElementById("selectAllMeetingContacts");
  const contactListDiv = document.getElementById("meetingContactList");

  if (searchInput) {
    searchInput.addEventListener("input", renderMeetingContactList);
  }

  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", function () {
      const checkboxes = contactListDiv.querySelectorAll(".meeting-contact-checkbox");
      checkboxes.forEach((checkbox) => {
        checkbox.checked = this.checked;
        if (this.checked) {
          selectedMeetingNumbers.add(checkbox.value);
        } else {
          selectedMeetingNumbers.delete(checkbox.value);
        }
      });
    });
  }

  if (contactListDiv) {
    contactListDiv.addEventListener("change", (event) => {
      if (event.target.classList.contains("meeting-contact-checkbox")) {
        if (event.target.checked) {
          selectedMeetingNumbers.add(event.target.value);
        } else {
          selectedMeetingNumbers.delete(event.target.value);
        }
      }
    });
  }
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
    label.innerHTML = `<input type="checkbox" class="contact-checkbox-edit" value="${contact.number}" ${isChecked}> <strong>${contact.name}</strong> – ${contact.number}`;
    list.appendChild(label);
  });
  document.querySelectorAll(".contact-checkbox-edit").forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      if (this.checked) selectedNumbers.add(this.value);
      else selectedNumbers.delete(this.value);
      document.getElementById("edit-manualNumbers").value = Array.from(selectedNumbers).join(", ");
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
    const isChecked = selectedMeetingNumbers.has(contact.number) ? "checked" : "";
    label.innerHTML = `
      <input type="checkbox" class="meeting-contact-checkbox-edit" value="${contact.number}" ${isChecked}> 
      <strong>${contact.name}</strong> – ${contact.number}
    `;
    list.appendChild(label);
  });

  document.querySelectorAll(".meeting-contact-checkbox-edit").forEach((checkbox) => {
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