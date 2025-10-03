// group-manager.js - Group Management Module

// Import contacts and rendering helper from contact-manager
import { 
  contacts, 
  fetchAndRenderContacts,
} from './contact-manager.js'; 

let groups = [];
// New Set to manage selected contact numbers for the group form
export let selectedGroupMembers = new Set();


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
    // Panggil render checklist untuk memastikan kontak grup siap dimuat saat tab grup dibuka
    renderGroupContactChecklist(); 
    updateGroupDropdowns(); // Untuk dropdown di form kontak
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
    tbody.innerHTML = '<tr><td colspan="2" style="text-align: center;">Belum ada grup</td></tr>';
    return;
  }

  groups.forEach((group) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${group.name}</td>
      <td class="action-buttons">
        <button class="edit-contact-btn" onclick="window.groupModule.showEditGroupForm(${group.id})">
          <i class="fa-solid fa-edit"></i> Edit
        </button>
        <button class="delete-contact-btn" onclick="window.groupModule.deleteGroup(${group.id})">
          <i class="fa-solid fa-trash"></i> Hapus
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * Placeholder for updating dropdowns (e.g., in contact-crud-form)
 * Assuming this function exists and is responsible for populating <select id="contact-crud-grup">
 */
function updateGroupDropdowns() {
  const select = document.getElementById("contact-crud-grup");
  if (!select) return;

  select.innerHTML = '<option value="">-- Pilih Grup --</option>';

  groups.forEach(group => {
    const option = document.createElement('option');
    option.value = group.name;
    option.textContent = group.name;
    select.appendChild(option);
  });
}


/**
 * Renders contact checklist for group management form
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
    const isChecked = selectedGroupMembers.has(contact.number)
      ? "checked"
      : "";
    label.innerHTML = `
      <input type="checkbox" class="group-contact-checkbox" value="${contact.number}" ${isChecked}> 
      <strong>${contact.name}</strong> – ${contact.number}
    `;
    list.appendChild(label);
  });
  
  // Re-attach listeners after rendering
  attachGroupContactListeners();
  updateGroupMembersInput();
}


/**
 * Attaches event listeners to the group contact checkboxes
 */
function attachGroupContactListeners() {
  document
    .querySelectorAll(".group-contact-checkbox")
    .forEach((checkbox) => {
      // Pastikan listener hanya ter-attach sekali
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
}


/**
 * Updates the hidden input field with the current selected members (as JSON string)
 */
function updateGroupMembersInput() {
    const membersInput = document.getElementById("group-crud-members");
    if (membersInput) {
        // Kirim contact numbers array sebagai JSON string ke backend
        membersInput.value = JSON.stringify(Array.from(selectedGroupMembers));
    }
}


/**
 * Shows the edit group form populated with data
 */
export function showEditGroupForm(id) {
  const group = groups.find((g) => g.id === id);
  if (!group) return;

  const form = document.getElementById("group-crud-form");
  const idInput = document.getElementById("group-crud-id");
  const nameInput = document.getElementById("group-crud-name");
  const submitButton = document.getElementById("group-crud-submit");
  const cancelButton = document.getElementById("group-crud-cancel");

  // 1. Reset selection
  selectedGroupMembers.clear();
  
  // 2. Populate selected members set from group data
  let membersArray = [];
  try {
    // group.members should be a JSON string of contact numbers from the backend
    membersArray = JSON.parse(group.members || '[]');
    membersArray.forEach(number => selectedGroupMembers.add(number));
  } catch (e) {
    console.error("Error parsing group members:", e);
  }

  // 3. Populate form fields
  idInput.value = group.id;
  nameInput.value = group.name;
  submitButton.textContent = "Ubah Grup";
  cancelButton.style.display = "inline-block";
  
  // 4. Re-render the contact list to show selections
  renderGroupContactChecklist(); 
  
  // Scroll to the form
  form.scrollIntoView({ behavior: "smooth" });
}

/**
 * Handles group form submission (ADD or EDIT)
 */
export async function handleGroupFormSubmit(e) {
  e.preventDefault();

  const form = document.getElementById("group-crud-form");
  const idInput = document.getElementById("group-crud-id");
  const nameInput = document.getElementById("group-crud-name");
  const membersInput = document.getElementById("group-crud-members");
  
  const id = idInput.value;
  const name = nameInput.value.trim();
  // Ambil JSON string dari hidden input
  const contactNumbers = membersInput.value; 

  if (!name) {
    Swal.fire("Peringatan", "Nama grup wajib diisi.", "warning");
    return;
  }

  const url = id ? `/api/groups/${id}` : "/api/groups";
  const method = id ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, contactNumbers }), 
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || `Gagal ${id ? 'mengubah' : 'menambah'} grup.`);
    }
    
    // PENTING: Refresh kontak untuk menampilkan keanggotaan grup yang baru
    await fetchAndRenderContacts(); 
    
    Swal.fire("Sukses", result.message || `Grup berhasil di${id ? 'ubah' : 'tambah'}.`, "success");
    resetGroupForm();
    fetchAndRenderGroups();
    
  } catch (error) {
    console.error("Error submitting group form:", error);
    Swal.fire("Error", error.message, "error");
  }
}

/**
 * Deletes a group
 */
export async function deleteGroup(id) {
  const group = groups.find((g) => g.id === id);
  if (!group) return;

  const result = await Swal.fire({
    title: "Yakin?",
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

      // PENTING: Refresh kontak setelah penghapusan untuk sinkronisasi
      await fetchAndRenderContacts(); 

      Swal.fire("Terhapus!", "Grup berhasil dihapus dan kontak disinkronkan.", "success");
      fetchAndRenderGroups();
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    }
  }
}

/**
 * Resets group form
 */
export function resetGroupForm() {
  const form = document.getElementById("group-crud-form");
  if (form) {
    form.reset();
    document.getElementById("group-crud-id").value = "";
    document.getElementById("group-crud-submit").textContent = "Tambah Grup";
    document.getElementById("group-crud-cancel").style.display = "none";
    
    // Hapus anggota terpilih dan render ulang checklist
    selectedGroupMembers.clear();
    renderGroupContactChecklist(); 
  }
}

/**
 * Initializes group form listeners (Search and Select All)
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
      
      // Clear all and then populate based on checked state
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

  // Render awal saat inisialisasi
  renderGroupContactChecklist();
}
