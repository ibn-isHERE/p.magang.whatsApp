let contacts = [];
let filteredContacts = [];
let selectedNumbers = new Set();
let currentFilter = "all";
let schedules = [];
let selectedMeetingNumbers = new Set();
const schedulesContainer = document.querySelector("#scheduleTable tbody");
let socket;
let currentChatNumber = null;
let chatConversations = [];
let unreadCount = 0;
let activeChatTab = "active";

// --- Bagian 1: Fungsi untuk Mengelola Tab ---
function showForm(formId) {
  // Sembunyikan semua form
  document.querySelectorAll(".form-content").forEach((form) => {
    form.style.display = "none";
  });

  // Hapus active dari tab buttons
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.remove("active");
  });

  const scheduleContainer = document.getElementById("scheduleContainer");
  const chatMainContainer = document.getElementById("chatMainContainer");

  if (formId === "chat") {
    const chatSidebarContainer = document.getElementById(
      "chatSidebarContainer"
    );
    if (chatSidebarContainer) {
      chatSidebarContainer.style.display = "block";
    }
    if (scheduleContainer) {
      scheduleContainer.style.display = "none";
    }
    if (chatMainContainer) {
      chatMainContainer.style.display = "flex";
    }
    loadChatConversations(activeChatTab);
    updateUnreadCount();
  } else {
    // Tampilkan form yang dipilih
    const selectedForm = document.getElementById(formId + "FormContainer");
    if (selectedForm) {
      selectedForm.style.display = "block";
    }
    if (scheduleContainer) {
      scheduleContainer.style.display = "block";
    }
    if (chatMainContainer) {
      chatMainContainer.style.display = "none";
    }
  }

  // Set active tab
  const selectedTab = document.querySelector(
    `[onclick="showForm('${formId}')"]`
  );
  if (selectedTab) {
    selectedTab.classList.add("active");
  }

  if (formId === "contacts") {
    fetchAndRenderContacts();
  }
  if (formId === "meeting") {
    renderMeetingContactList();
  }
}
function closeEditModal() {
  const modal = document.getElementById("editModal");
  modal.style.display = "none";

  // Reset form content
  document.getElementById("editModalBody").innerHTML = "";

  // Clear selected numbers
  selectedNumbers.clear();
  selectedMeetingNumbers.clear();
}

function showEditModal(title) {
  const modal = document.getElementById("editModal");
  document.getElementById("editModalTitle").textContent = title;
  modal.style.display = "block";
}

async function fetchAndRenderContacts() {
  try {
    const res = await fetch("/api/contacts");
    const result = await res.json();

    if (!res.ok || !result.data)
      throw new Error("Gagal memuat kontak dari server.");

    // --- PERBAIKAN DI SINI ---
    // Urutkan data berdasarkan nama secara alfabetis sebelum ditampilkan
    result.data.sort((a, b) => a.name.localeCompare(b.name));
    // -------------------------

    contacts = result.data; // Update variabel global `contacts`
    filteredContacts = contacts;

    // 1. Render tabel di halaman Manajemen Kontak
    const managementTbody = document.getElementById("contact-management-tbody");
    if (managementTbody) {
      managementTbody.innerHTML = ""; // Kosongkan tabel
      contacts.forEach((contact) => {
        const row = document.createElement("tr");
        row.innerHTML = `
                    <td>${contact.name}</td>
                    <td>${contact.number}</td>
                    <td class="action-buttons">
                        <button class="edit-btn" onclick="showEditContactForm(${contact.id}, '${contact.name}', '${contact.number}')">
                            <i class="material-icons">edit</i>
                        </button>
                        <button class="cancel-btn" onclick="deleteContact(${contact.id}, '${contact.name}')">
                            <i class="material-icons">delete</i>
                        </button>
                    </td>
                `;
        managementTbody.appendChild(row);
      });
    }

    // 2. Perbarui juga daftar checkbox di form kirim pesan
    renderContactList();
  } catch (error) {
    console.error("Error fetching contacts:", error);
    Swal.fire("Error", error.message, "error");
  }
}

// FUNGSI BARU: Menampilkan data kontak ke form untuk diedit
function showEditContactForm(id, name, number) {
  document.getElementById("contact-crud-id").value = id;
  document.getElementById("contact-crud-name").value = name;
  document.getElementById("contact-crud-number").value = number;
  document.getElementById("contact-crud-submit").textContent = "Update Kontak";
  document.getElementById("contact-crud-cancel").style.display = "inline-block";

  document
    .getElementById("contactsFormContainer")
    .scrollIntoView({ behavior: "smooth" });
}

// FUNGSI BARU: Mereset form CRUD kontak
function resetContactCrudForm() {
  document.getElementById("contact-crud-form").reset();
  document.getElementById("contact-crud-id").value = "";
  document.getElementById("contact-crud-submit").textContent = "Tambah Kontak";
  document.getElementById("contact-crud-cancel").style.display = "none";
}
function renderMeetingContactList() {
  const list = document.getElementById("meetingContactList");
  if (!list) return;

  list.innerHTML = "";
  const currentSearch = document
    .getElementById("meetingContactSearch")
    .value.toLowerCase()
    .trim();
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
            <input type="checkbox" class="meeting-contact-checkbox" value="${
              contact.number
            }" ${isChecked ? "checked" : ""} />
            <strong>${contact.name}</strong> — ${contact.number}
        `;
    list.appendChild(label);
  });
}
function initMeetingContactListeners() {
  const searchInput = document.getElementById("meetingContactSearch");
  const selectAllCheckbox = document.getElementById("selectAllMeetingContacts");
  const contactListDiv = document.getElementById("meetingContactList");

  if (searchInput) {
    searchInput.addEventListener("input", renderMeetingContactList);
  }

  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", function () {
      const checkboxes = contactListDiv.querySelectorAll(
        ".meeting-contact-checkbox"
      );
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
 * Mengatur event listener KHUSUS untuk input file di form rapat.
 */
function initMeetingFileUploadListener() {
  const fileUpload = document.getElementById("meetingFileUpload");
  const fileNamesDisplay = document.getElementById("meetingFileNames");
  if (fileNamesDisplay) {
    fileNamesDisplay.textContent =
      fileNamesDisplay.textContent || "Belum ada file terpilih";
  } else {
    fileNamesDisplay.textContent = "Belum ada file terpilih";
  }
}
// FUNGSI BARU: Menghapus kontak berdasarkan ID
async function deleteContact(id, name) {
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
      fetchAndRenderContacts(); // Refresh daftar kontak
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    }
  }
}

// FUNGSI BARU: Menangani submit form untuk menambah atau mengedit kontak
async function handleContactFormSubmit(event) {
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

    Swal.fire(
      "Sukses!",
      `Kontak berhasil ${isEditing ? "diupdate" : "ditambahkan"}.`,
      "success"
    );
    resetContactCrudForm();
    fetchAndRenderContacts(); // Refresh daftar kontak
  } catch (error) {
    Swal.fire("Error", error.message, "error");
  }
}

// Fungsi untuk merender daftar kontak yang bisa dipilih
function renderContactList() {
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
        document.getElementById("selectAllContacts").checked = false;
      }
      updateSelectAllCheckboxState();
    });
  });
  updateSelectAllCheckboxState();
}

function updateSelectAllCheckboxState() {
  const selectAllCheckbox = document.getElementById("selectAllContacts");
  if (selectAllCheckbox) {
    const allChecked =
      filteredContacts.length > 0 &&
      filteredContacts.every((c) => selectedNumbers.has(c.number));
    selectAllCheckbox.checked = allChecked;
  }
}

// Inisialisasi event listeners untuk kontak
function initContactListeners() {
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

async function loadContacts() {
  await fetchAndRenderContacts();
}

// Event listener untuk file upload
function initFileUploadListener() {
  const fileUpload = document.getElementById("fileUpload");
  if (fileUpload) {
    fileUpload.addEventListener("change", function () {
      const fileNamesDisplay = document.getElementById("fileNames");
      if (!fileNamesDisplay) return;

      if (this.files.length > 0) {
        let fileNames = [];
        for (let i = 0; i < this.files.length; i++) {
          fileNames.push(this.files[i].name);
        }
        fileNamesDisplay.innerHTML = `**File terpilih:**<br>${fileNames.join(
          "<br>"
        )}`;
      } else {
        fileNamesDisplay.textContent = "Belum ada file terpilih";
      }
    });
  }
}

// Fungsi untuk menghitung dan menampilkan countdown
function formatTimeDifference(scheduledTimeStr) {
  const scheduledTime = new Date(scheduledTimeStr);
  const now = new Date();
  const diffMs = scheduledTime.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Telah Lewat";
  }

  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  const startOfDayScheduled = new Date(
    scheduledTime.getFullYear(),
    scheduledTime.getMonth(),
    scheduledTime.getDate()
  );
  const startOfDayNow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const diffDaysFull = Math.round(
    (startOfDayScheduled.getTime() - startOfDayNow.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const timeOptions = { hour: "2-digit", minute: "2-digit", hour12: false };
  const dateOptionsFull = { day: "numeric", month: "short", year: "numeric" };

  if (diffSeconds < 60) {
    return `${diffSeconds} detik lagi`;
  } else if (diffMinutes < 60) {
    return `${diffMinutes} menit lagi`;
  } else if (diffHours < 24 && diffDaysFull === 0) {
    return `${diffHours} jam lagi (${scheduledTime.toLocaleTimeString(
      "id-ID",
      timeOptions
    )})`;
  } else if (diffDaysFull === 0) {
    return `Hari ini (${scheduledTime.toLocaleTimeString(
      "id-ID",
      timeOptions
    )})`;
  } else if (diffDaysFull === 1) {
    return `Besok (${scheduledTime.toLocaleTimeString("id-ID", timeOptions)})`;
  } else if (diffDaysFull === 2) {
    return `Lusa (${scheduledTime.toLocaleTimeString("id-ID", timeOptions)})`;
  } else if (diffDaysFull > 2 && diffDaysFull < 7) {
    const dayName = scheduledTime.toLocaleDateString("id-ID", {
      weekday: "long",
    });
    return `${diffDaysFull} hari lagi (${dayName}) (${scheduledTime.toLocaleDateString(
      "id-ID",
      dateOptionsFull
    )})`;
  } else if (diffDaysFull >= 7 && diffDaysFull < 30) {
    const diffWeeks = Math.floor(diffDaysFull / 7);
    const remainingDays = diffDaysFull % 7;

    let weekText = `${diffWeeks} minggu`;
    let dayText = remainingDays > 0 ? ` ${remainingDays} hari` : "";
    let totalDaysText = `(total ${diffDaysFull} hari)`;
    let scheduledDateFormatted = scheduledTime.toLocaleDateString(
      "id-ID",
      dateOptionsFull
    );

    let finalString = `${weekText}${dayText} lagi ${totalDaysText} (${scheduledDateFormatted})`;

    if (diffWeeks === 1 && remainingDays === 0) {
      finalString = `Seminggu lagi ${totalDaysText} (${scheduledDateFormatted})`;
    } else if (diffWeeks > 0 && remainingDays === 0) {
      finalString = `${weekText} lagi ${totalDaysText} (${scheduledDateFormatted})`;
    }
    return finalString;
  } else if (diffDaysFull < 365) {
    const diffMonths = Math.floor(diffDaysFull / 30);
    return `${diffMonths} bulan lagi (total ${diffDaysFull} hari) (${scheduledTime.toLocaleDateString(
      "id-ID",
      dateOptionsFull
    )})`;
  } else {
    const diffYears = Math.floor(diffDaysFull / 365);
    return `${diffYears} tahun lagi (total ${diffDaysFull} hari) (${scheduledTime.toLocaleDateString(
      "id-ID",
      { dateStyle: "medium" }
    )})`;
  }
}

function updateCountdownTimers() {
  if (schedules.length === 0) return;

  document
    .querySelectorAll("#scheduleTable tbody tr[data-id]")
    .forEach((row) => {
      const scheduleId = row.dataset.id;
      const scheduleData = schedules.find((s) => s.id == scheduleId);

      if (scheduleData && scheduleData.status === "terjadwal") {
        const timeCell = row.cells[0];
        let smallElement = timeCell.querySelector("small.countdown-timer");

        // Logika baru: hitung countdown dari waktu pengiriman notifikasi jika itu rapat
        const scheduledTime = new Date(scheduleData.scheduledTime);
        const countdownBaseTime = scheduleData.meetingRoom
          ? new Date(scheduledTime.getTime() - 60 * 60 * 1000)
          : scheduledTime;

        const newCountdownText = `(${formatTimeDifference(countdownBaseTime)})`;

        if (!smallElement) {
          smallElement = document.createElement("small");
          smallElement.className = "countdown-timer";
          timeCell.appendChild(smallElement);
        }

        if (smallElement.textContent.trim() !== newCountdownText.trim()) {
          smallElement.textContent = newCountdownText;
        }
      } else {
        const timeCell = row.cells[0];
        const smallElement = timeCell.querySelector("small.countdown-timer");
        if (smallElement) {
          smallElement.remove();
        }
      }
    });
}

// --- Bagian 2: Fungsi Pembantu untuk Render Baris Rapat ---
// Update the createScheduleRowHtml function in script.js

function createScheduleRowHtml(schedule) {
  if (schedule.type === "meeting" || schedule.meetingRoom) {
    console.log("DATA MEETING DITERIMA:", JSON.stringify(schedule, null, 2));
  }
  const scheduledTimeFull = new Date(schedule.scheduledTime);
  const scheduledTimeFormatted = scheduledTimeFull.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // PASTIKAN MENGGUNAKAN originalNumbers UNTUK DITAMPILKAN
  let numbersArray = [];
  try {
    // Prioritaskan originalNumbers untuk tampilan
    if (schedule.originalNumbers) {
      if (Array.isArray(schedule.originalNumbers)) {
        numbersArray = schedule.originalNumbers;
      } else if (typeof schedule.originalNumbers === "string") {
        numbersArray = JSON.parse(schedule.originalNumbers || "[]");
      }
    }
    // Fallback ke numbers jika originalNumbers tidak ada
    else if (schedule.numbers) {
      if (Array.isArray(schedule.numbers)) {
        numbersArray = schedule.numbers;
      } else if (typeof schedule.numbers === "string") {
        numbersArray = JSON.parse(schedule.numbers || "[]");
      }
    }
  } catch (e) {
    console.error("Error parsing numbers:", e);
    numbersArray = [];
  }

  // KONVERSI 62 ke 08 untuk tampilan
  numbersArray = numbersArray.map((num) => {
    if (typeof num === "string") {
      // Hapus suffix @c.us jika ada
      let cleanNum = num.replace("@c.us", "");

      // Konversi 62... ke 08...
      if (cleanNum.startsWith("62")) {
        cleanNum = "0" + cleanNum.slice(2);
      }

      return cleanNum;
    }
    return num;
  });

  const numberOfRecipients = numbersArray.length;

  let statusClass = "";
  let statusText = "";
  let statusIcon = "";
  let countdownText = "";
  let messageDisplay = "";
  let fileDisplay = "-";

  // Tentukan apakah ini meeting atau message
  const isMeeting = schedule.type === "meeting" || schedule.meetingRoom;

  // Hitung waktu kirim untuk rapat (1 jam sebelum meeting)
  let sendTime = null;
  let sendTimeFormatted = "";
  if (isMeeting) {
    sendTime = new Date(scheduledTimeFull.getTime() - 60 * 60 * 1000);
    sendTimeFormatted = sendTime.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  if (schedule.status === "terjadwal") {
    countdownText = `<br><small class="countdown-timer" id="countdown-${schedule.id}"></small>`;
  }

  switch (schedule.status) {
    case "terkirim":
      statusClass = "status-terkirim";
      statusText = "Terkirim";
      statusIcon =
        '<i class="material-icons" title="Terkirim">check_circle</i>';
      break;
    case "gagal":
      statusClass = "status-gagal";
      statusText = "Gagal";
      statusIcon = '<i class="material-icons" title="Gagal">cancel</i>';
      break;
    case "dibatalkan":
      statusClass = "status-dibatalkan";
      statusText = "Dibatalkan";
      statusIcon = '<i class="material-icons" title="Dibatalkan">block</i>';
      break;
    case "selesai":
      statusClass = "status-selesai";
      statusText = "Selesai";
      statusIcon = '<i class="material-icons" title="Selesai">done_all</i>';
      break;
    default: // 'terjadwal'
      statusClass = "status-terjadwal";
      statusText = "Terjadwal";
      statusIcon =
        '<i class="material-icons" title="Terjadwal">hourglass_empty</i>';
  }

  if (isMeeting) {
    if (schedule.filesData && schedule.filesData.length > 0) {
      fileDisplay = schedule.filesData
        .map((file) => {
          const fileName = file.name || file.filename || "File";
          return fileName.replace(/^\d+-/, "");
        })
        .join("<br>");
    } else if (schedule.file) {
      fileDisplay = schedule.file.replace(/^\d+-/, "");
    } else if (schedule.meetingFile) {
      fileDisplay = schedule.meetingFile.replace(/^\d+-/, "");
    } else {
      fileDisplay = "-";
    }
  } else {
    // Untuk Pesan Biasa
    if (schedule.filesData && schedule.filesData.length > 0) {
      fileDisplay = schedule.filesData
        .map((file) => {
          const fileName = file.name || file.filename || "File";
          return fileName.replace(/^\d+-/, "");
        })
        .join("<br>");
    } else {
      fileDisplay = "-";
    }
  }

  // Menentukan tampilan pesan/judul berdasarkan tipe jadwal
  if (isMeeting) {
    // Ini adalah rapat - tampilkan informasi rapat
    let meetingTimeInfo = `<strong>Rapat:</strong> ${
      schedule.meetingTitle || schedule.message || "-"
    }<br>`;
    meetingTimeInfo += `<small>Ruangan: ${schedule.meetingRoom}</small>`;

    // Jika ada meetingEndTime atau endTime, tampilkan rentang waktu
    if (schedule.meetingEndTime) {
      const endTime = new Date(schedule.meetingEndTime);
      const endTimeFormatted = endTime.toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      meetingTimeInfo += `<br><small>Durasi: ${scheduledTimeFormatted} - ${endTimeFormatted}</small>`;
    } else if (schedule.endTime) {
      // Format baru dengan endTime
      meetingTimeInfo += `<br><small>Durasi: ${scheduledTimeFull.toLocaleString(
        "id-ID",
        { timeStyle: "short" }
      )} - ${schedule.endTime}</small>`;
    }

    messageDisplay = meetingTimeInfo;
  } else {
    // Ini adalah pesan biasa
    messageDisplay = schedule.message || "-";
  }

  let timeCellContent = "";
  if (isMeeting) {
    // Format waktu selesai rapat
    let endTimeDisplay = "";
    if (schedule.meetingEndTime) {
      // Jika ada meetingEndTime (format datetime lengkap)
      const endTime = new Date(schedule.meetingEndTime);
      endTimeDisplay = endTime.toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } else if (schedule.endTime) {
      // Jika ada endTime (format waktu saja), gabungkan dengan tanggal dari scheduledTime
      const meetingDate = scheduledTimeFull.toLocaleDateString("id-ID", {
        dateStyle: "medium",
      });
      endTimeDisplay = `${meetingDate}, ${schedule.endTime}`;
    }

    // Tampilan khusus untuk rapat dengan waktu selesai
    timeCellContent = `
            <strong>Waktu Rapat:</strong><br>
            ${scheduledTimeFormatted}<br>
            <strong>Rapat Selesai:</strong><br>
            ${endTimeDisplay}<br>
            <small>Pengingat dikirim:<br>${sendTimeFormatted}</small>
            ${countdownText}
        `;
  } else {
    // Tampilan untuk pesan biasa
    timeCellContent = `${scheduledTimeFormatted}${countdownText}`;
  }

  // PERBAIKAN: Tentukan button actions dengan data yang kompatibel
  let actionButtons = "";

  if (isMeeting) {
    // Logika Tombol Khusus untuk RAPAT
    switch (schedule.status) {
      case "terjadwal":
        // Support untuk kedua format (filesData array dan file string)
        const fileData =
          schedule.filesData && schedule.filesData.length > 0
            ? JSON.stringify(schedule.filesData)
            : schedule.file || schedule.meetingFile || "";

        actionButtons = `
                    <button class="edit-btn" data-id="${schedule.id}" 
                            data-type="meeting" 
                            data-meetingroom="${schedule.meetingRoom}"
                            data-meetingtitle="${
                              schedule.meetingTitle || schedule.message || ""
                            }"
                            data-starttime="${schedule.scheduledTime}"
                            data-endtime="${
                              schedule.meetingEndTime || schedule.endTime || ""
                            }"
                            data-numbers="${escape(
                              JSON.stringify(
                                schedule.numbers ||
                                  schedule.originalNumbers ||
                                  []
                              )
                            )}"
                            data-filesdata="${escape(fileData)}">
                        <i class="material-icons">edit</i> Edit
                    </button>
                    <button class="cancel-meeting-btn" data-id="${schedule.id}">
                        <i class="material-icons">cancel</i> Batal
                    </button>
                `;
        break;
      case "terkirim":
        actionButtons = `
                    <button class="cancel-meeting-btn" data-id="${schedule.id}">
                        <i class="material-icons">cancel</i> Batalkan Rapat
                    </button>
                    <button class="finish-meeting-btn" data-id="${schedule.id}">
                        <i class="material-icons">done</i> Selesaikan
                    </button>
                `;
        break;
      case "selesai":
      case "dibatalkan":
        actionButtons = `
                    <button class="delete-meeting-btn" data-id="${schedule.id}">
                        <i class="material-icons">delete_forever</i> Hapus Riwayat
                    </button>
                `;
        break;
      default:
        actionButtons = "-";
    }
  } else {
    // Logika Tombol untuk PESAN (tidak berubah)
    switch (schedule.status) {
      case "terjadwal":
        actionButtons = `
                    <button class="edit-btn" data-id="${schedule.id}" 
                            data-type="message"
                            data-message="${escape(schedule.message || "")}"
                            data-datetime="${schedule.scheduledTime}"
                            data-filesdata="${escape(
                              JSON.stringify(schedule.filesData || [])
                            )}">
                        <i class="material-icons">edit</i> Edit
                    </button>
                    <button class="cancel-btn" data-id="${schedule.id}">
                        <i class="material-icons">delete</i> Batal
                    </button>
                `;
        break;
      case "terkirim":
      case "gagal":
      case "dibatalkan": // Status pesan yang sudah final
        actionButtons = `
                    <button class="delete-history-btn" data-id="${schedule.id}">
                        <i class="material-icons">delete_forever</i> Hapus Riwayat
                    </button>
                `;
        break;
      default:
        actionButtons = "-";
    }
  }

  return `
        <td data-scheduled-time="${
          schedule.scheduledTime
        }">${timeCellContent}</td>
        <td>${
          numbersArray.join(", ") || "-"
        } <br> <small>(${numberOfRecipients} nomor)</small></td>
        <td>${messageDisplay}</td>
        <td>${fileDisplay}</td>
        <td class="${statusClass}">${statusIcon} ${statusText}</td>
        <td class="action-buttons">
            ${actionButtons}
        </td>
    `;
}

// GANTI FUNGSI INI SECARA KESELURUHAN
// GANTI FUNGSI INI SECARA KESELURUHAN (VERSI FINAL)
async function renderScheduleTable() {
  if (!schedulesContainer) return;

  try {
    // 1. Ambil SEMUA data terbaru dari server
    const res = await fetch("/get-all-schedules");
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Server error: ${res.status} - ${errorText}`);
    }

    const allSchedulesData = await res.json();

    if (!Array.isArray(allSchedulesData)) {
      throw new Error("Data yang diterima dari server bukan array");
    }

    schedules = allSchedulesData;

    // 2. Filter data berdasarkan `currentFilter` yang aktif
    let filteredSchedules;
    if (currentFilter === "all") {
      filteredSchedules = schedules;
    } else if (currentFilter === "meeting") {
      filteredSchedules = schedules.filter(
        (s) => s.type === "meeting" || s.meetingRoom
      );
    } else {
      filteredSchedules = schedules.filter((s) => s.status === currentFilter);
    }

    // 3. (LOGIKA SORTING FINAL) Urutkan dengan membedakan Rapat Aktif dan lainnya
    filteredSchedules.sort((a, b) => {
      // Helper untuk mengidentifikasi Rapat Aktif (prioritas tertinggi)
      const isActiveMeeting = (schedule) => {
        const isMeeting = schedule.type === "meeting" || !!schedule.meetingRoom;
        return (
          isMeeting &&
          (schedule.status === "terjadwal" || schedule.status === "terkirim")
        );
      };

      const aIsActiveMeeting = isActiveMeeting(a);
      const bIsActiveMeeting = isActiveMeeting(b);

      // --- Langkah 1: Pisahkan Rapat Aktif dari semua item lainnya ---
      if (aIsActiveMeeting && !bIsActiveMeeting) {
        return -1; // Rapat Aktif 'a' selalu di atas
      }
      if (!aIsActiveMeeting && bIsActiveMeeting) {
        return 1; // Rapat Aktif 'b' selalu di atas
      }

      // --- Langkah 2: Tentukan cara mengurutkan di dalam grup masing-masing ---

      // Jika KEDUANYA adalah Rapat Aktif, gunakan logika prioritas status
      if (aIsActiveMeeting && bIsActiveMeeting) {
        const getStatusRank = (status) => (status === "terjadwal" ? 1 : 2);
        const rankA = getStatusRank(a.status);
        const rankB = getStatusRank(b.status);

        if (rankA !== rankB) {
          return rankA - rankB; // 'terjadwal' (1) di atas 'terkirim' (2)
        }

        // Jika status sama-sama 'terjadwal'
        if (rankA === 1) {
          return new Date(a.scheduledTime) - new Date(b.scheduledTime); // Ascending (paling dekat)
        }
        // Jika status sama-sama 'terkirim'
        else {
          const endTimeA = a.meetingEndTime || a.scheduledTime;
          const endTimeB = b.meetingEndTime || b.scheduledTime;
          return new Date(endTimeA) - new Date(endTimeB); // Ascending (paling cepat selesai)
        }
      }

      // Jika BUKAN Rapat Aktif (ini adalah riwayat rapat ATAU SEMUA pesan biasa)
      else {
        // Urutkan semua berdasarkan waktu terbaru di atas
        return new Date(b.scheduledTime) - new Date(a.scheduledTime); // Descending
      }
    });

    // 4. (LANGKAH KUNCI) Kosongkan tabel sebelum render ulang
    schedulesContainer.innerHTML = "";

    // 5. Render ulang tabel dengan data yang sudah bersih dan terurut
    if (filteredSchedules.length === 0) {
      schedulesContainer.innerHTML =
        '<tr><td colspan="6" class="text-center">Belum ada jadwal untuk filter ini.</td></tr>';
    } else {
      filteredSchedules.forEach((schedule) => {
        const newRow = document.createElement("tr");
        newRow.dataset.id = schedule.id;
        newRow.innerHTML = createScheduleRowHtml(schedule);
        schedulesContainer.appendChild(newRow);
      });
    }

    updateCountdownTimers();
    attachScheduleActionListeners();
  } catch (error) {
    console.error("Error rendering schedule table:", error);
    schedulesContainer.innerHTML = `
            <tr><td colspan="6" class="text-center error-message">${error.message}</td></tr>
        `;
  }
}

// Add these event listeners to the attachScheduleActionListeners function in script.js

async function attachScheduleActionListeners() {
  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.onclick = async function () {
      const id = this.dataset.id;
      const type = this.dataset.type;
      const isMeeting = type === "meeting";

      const scheduleToEdit = schedules.find((s) => s.id == id);
      if (!scheduleToEdit) {
        Swal.fire("Error", "Data jadwal tidak ditemukan", "error");
        return;
      }

      // Tampilkan modal edit
      const modalBody = document.getElementById("editModalBody");

      if (isMeeting) {
        showEditModal("Edit Jadwal Rapat");
        modalBody.innerHTML = createMeetingEditFormHtml(scheduleToEdit);
        afterEditMeetingModalOpen();

        try {
          await populateMeetingEditForm(scheduleToEdit);
        } catch (error) {
          console.error("Error saat mengisi form meeting:", error);
          Swal.fire("Error", "Gagal memuat data ruangan rapat", "error");
        }

        document
          .getElementById("editMeetingForm")
          .addEventListener("submit", handleMeetingFormSubmit);
        document
          .getElementById("cancel-edit-meeting-btn")
          .addEventListener("click", closeEditModal);
        initEditMeetingContactListeners();
      } else {
        showEditModal("Edit Jadwal Pesan");
        modalBody.innerHTML = createMessageEditFormHtml(scheduleToEdit);
        populateMessageEditForm(scheduleToEdit);

        document
          .getElementById("editReminderForm")
          .addEventListener("submit", handleReminderFormSubmit);
        document
          .getElementById("cancel-edit-message-btn")
          .addEventListener("click", closeEditModal);
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  });

  // Cancel meeting button listener
  document.querySelectorAll(".cancel-meeting-btn").forEach((button) => {
    button.onclick = async function () {
      const id = this.dataset.id;
      Swal.fire({
        title: "Anda yakin?",
        text: "Rapat ini akan dibatalkan!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Ya, batalkan!",
        cancelButtonText: "Tidak",
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            const res = await fetch(`/cancel-meeting/${id}`, {
              method: "PUT",
            });
            const result = await res.json();
            if (res.ok && result.success) {
              Swal.fire("Dibatalkan!", result.message, "success");
              renderScheduleTable();
            } else {
              Swal.fire(
                "Gagal!",
                result.message || "Gagal membatalkan rapat",
                "error"
              );
            }
          } catch (error) {
            console.error("Error canceling meeting:", error);
            Swal.fire(
              "Gagal!",
              "Terjadi kesalahan saat membatalkan rapat.",
              "error"
            );
          }
        }
      });
    };
  });

  // Finish meeting button listener
  document.querySelectorAll(".finish-meeting-btn").forEach((button) => {
    button.onclick = async function () {
      const id = this.dataset.id;
      Swal.fire({
        title: "Tandai Rapat Selesai?",
        text: "Rapat ini akan ditandai sebagai selesai",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#28a745",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Ya, selesai!",
        cancelButtonText: "Batal",
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            const res = await fetch(`/finish-meeting/${id}`, {
              method: "PUT",
            });
            const result = await res.json();
            if (res.ok && result.success) {
              Swal.fire("Selesai!", result.message, "success");
              renderScheduleTable();
            } else {
              Swal.fire(
                "Gagal!",
                result.message || "Gagal menandai rapat selesai",
                "error"
              );
            }
          } catch (error) {
            console.error("Error finishing meeting:", error);
            Swal.fire(
              "Gagal!",
              "Terjadi kesalahan saat menandai rapat selesai.",
              "error"
            );
          }
        }
      });
    };
  });

  // Delete meeting button listener
  document.querySelectorAll(".delete-meeting-btn").forEach((button) => {
    button.onclick = async function () {
      const id = this.dataset.id;
      Swal.fire({
        title: "Anda yakin?",
        text: "Data rapat ini akan dihapus permanen dan tidak bisa dikembalikan!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Ya, hapus!",
        cancelButtonText: "Tidak",
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            const res = await fetch(`/delete-meeting/${id}`, {
              method: "DELETE",
            });
            const result = await res.json();
            if (res.ok && result.success) {
              Swal.fire("Dihapus!", result.message, "success");
              renderScheduleTable();
            } else {
              Swal.fire(
                "Gagal!",
                result.message || "Gagal menghapus rapat",
                "error"
              );
            }
          } catch (error) {
            console.error("Error deleting meeting:", error);
            Swal.fire(
              "Gagal!",
              "Terjadi kesalahan saat menghapus rapat.",
              "error"
            );
          }
        }
      });
    };
  });

  // Existing message cancel and delete listeners remain the same
  document.querySelectorAll(".cancel-btn").forEach((button) => {
    button.onclick = async function () {
      const id = this.dataset.id;
      Swal.fire({
        title: "Anda yakin?",
        text: "Jadwal pesan ini akan dibatalkan dan dihapus permanen!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Ya, batalkan!",
        cancelButtonText: "Tidak",
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            const res = await fetch(`/cancel-schedule/${id}`, {
              method: "DELETE",
            });
            const text = await res.text();
            if (res.ok) {
              Swal.fire("Dibatalkan!", text, "success");
              renderScheduleTable();
            } else {
              Swal.fire("Gagal!", text, "error");
            }
          } catch (error) {
            console.error("Error canceling schedule:", error);
            Swal.fire(
              "Gagal!",
              "Terjadi kesalahan saat membatalkan jadwal.",
              "error"
            );
          }
        }
      });
    };
  });

  document.querySelectorAll(".delete-history-btn").forEach((button) => {
    button.onclick = async function () {
      const id = this.dataset.id;
      Swal.fire({
        title: "Anda yakin?",
        text: "Riwayat pesan ini akan dihapus permanen dan tidak bisa dikembalikan!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Ya, hapus!",
        cancelButtonText: "Tidak",
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            const res = await fetch(`/delete-history/${id}`, {
              method: "DELETE",
            });
            const text = await res.text();
            if (res.ok) {
              Swal.fire("Dihapus!", text, "success");
              renderScheduleTable();
            } else {
              Swal.fire("Gagal!", text, "error");
            }
          } catch (error) {
            console.error("Error deleting history:", error);
            Swal.fire(
              "Gagal!",
              "Terjadi kesalahan saat menghapus riwayat.",
              "error"
            );
          }
        }
      });
    };
  });
}

function initEditMeetingContactListeners() {
  const searchInput = document.getElementById("edit-meetingContactSearch");
  if (searchInput) {
    searchInput.addEventListener("input", renderMeetingContactListForEdit);
  }
}

function createMessageEditFormHtml(schedule) {
  return `
        <h2>Edit Jadwal Pesan</h2>
        <form id="editReminderForm" enctype="multipart/form-data">
            <input type="hidden" id="edit-id" name="id" value="${schedule.id}">
            <label for="edit-contactSearch">Pilih Kontak:</label>
            <input type="text" id="edit-contactSearch" placeholder="Cari kontak...">
            <div id="edit-contactList" class="contact-checklist-box"></div>
            <label for="edit-manualNumbers">Nomor Manual (pisahkan koma):</label>
            <input type="text" id="edit-manualNumbers" name="manualNumbers" placeholder="0812...">
            <div class="file-upload-section">
                <label>File:</label>
                <div class="file-upload-container">
                    <input type="file" id="edit-fileUpload" name="files" multiple accept="image/*,video/*,application/pdf">
                    <span class="file-upload-label" data-input="edit-fileUpload">Klik untuk ganti/tambah file</span>
                    <div id="edit-fileNames" class="customFilePreview">Tidak ada file terpilih</div>
                </div>
                <button type="button" id="clearAllEditFilesBtn" style="display: none; background-color: #dc3545; margin-top: 6px;">Hapus Seluruh File</button>
            </div>

            <label for="edit-message">Pesan:</label>
            <textarea id="edit-message" name="message" rows="4"></textarea>
            <label for="edit-datetime">Waktu Kirim:</label>
            <input type="datetime-local" id="edit-datetime" name="datetime" required>
            <button type="submit">Update Pesan</button>
            <button type="button" id="cancel-edit-message-btn" style="background-color: #6c757d; margin-top: 10px;">Batal</button>
        </form>
    `;
}

let selectedEditFiles = [];
let existingEditFiles = [];          // objects from schedule.filesData for edit-message
let removedExistingEditFiles = [];   // names/ids marked for deletion

let existingEditMeetingFiles = [];          // objects from schedule.filesData for edit-meeting
let removedExistingEditMeetingFiles = [];   // names/ids marked for deletion

// Render preview for edit-message modal (edit-fileNames) — show existing then newly added
function renderEditFilePreview() {
  const editPreview = document.getElementById("edit-fileNames");
  const clearBtn = document.getElementById("clearAllEditFilesBtn");
  if (!editPreview) return;
  editPreview.innerHTML = "";

  const total = (existingEditFiles ? existingEditFiles.length : 0) + (selectedEditFiles ? selectedEditFiles.length : 0);
  if (total === 0) {
    editPreview.innerHTML = "<span>Tidak ada file terpilih</span>";
    if (clearBtn) clearBtn.style.display = "none";
    return;
  }

  // render existing files first (mark data-existing="true")
  existingEditFiles.forEach((ef, idx) => {
    const div = document.createElement("div");
    div.className = "file-chip existing";
    const nameSpan = document.createElement("span");
    nameSpan.className = "file-name-text";
    nameSpan.textContent = ef.name || ef.filename || ef;
    const sizeSpan = document.createElement("span");
    sizeSpan.className = "file-size-text";
    sizeSpan.textContent = ef.size ? ` (${Math.round(ef.size / 1024)} KB)` : "";
    div.appendChild(nameSpan);
    div.appendChild(sizeSpan);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remove-file-btn";
    btn.dataset.idx = idx;
    btn.dataset.existing = "true";
    btn.textContent = "×";
    div.appendChild(btn);

    editPreview.appendChild(div);
  });

  // then render newly selected files
  selectedEditFiles.forEach((file, idx) => {
    const div = document.createElement("div");
    div.className = "file-chip";
    const nameSpan = document.createElement("span");
    nameSpan.className = "file-name-text";
    nameSpan.textContent = file.name;
    const sizeSpan = document.createElement("span");
    sizeSpan.className = "file-size-text";
    sizeSpan.textContent = ` (${Math.round(file.size / 1024)} KB)`;
    div.appendChild(nameSpan);
    div.appendChild(sizeSpan);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remove-file-btn";
    btn.dataset.idx = idx;
    btn.dataset.existing = "false";
    btn.textContent = "×";
    div.appendChild(btn);

    editPreview.appendChild(div);
  });

  if (clearBtn) clearBtn.style.display = "inline-block";
}


function populateMessageEditForm(schedule) {
  document.getElementById("edit-message").value = schedule.message || "";
  const scheduledTime = new Date(schedule.scheduledTime);
  const localDateTime = new Date(
    scheduledTime.getTime() - scheduledTime.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, 16);
  document.getElementById("edit-datetime").value = localDateTime;

  let numbers = schedule.originalNumbers || schedule.numbers || [];
  const plainNumbers = numbers.map((num) =>
    String(num).replace("@c.us", "").replace(/^62/, "0")
  );

  document.getElementById("edit-manualNumbers").value = plainNumbers.join(", ");
  selectedNumbers.clear();
  plainNumbers.forEach((num) => selectedNumbers.add(num));

  renderContactListForEdit();

  const fileUpload = document.getElementById("edit-fileUpload");
  const fileNamesDisplay = document.getElementById("edit-fileNames");

  // Prepare existing files (for display) and reset edit buffers
  existingEditFiles = [];
  removedExistingEditFiles = [];
  selectedEditFiles = [];

  if (schedule.filesData && schedule.filesData.length > 0) {
    existingEditFiles = schedule.filesData.map((f) => ({ name: f.name || f.filename || f, size: f.size || 0, meta: f }));
    fileNamesDisplay.innerHTML = ""; // will be rendered by renderEditFilePreview
  } else if (schedule.file) {
    existingEditFiles = [{ name: schedule.file.replace(/^\d+-/, ""), size: 0 }];
    fileNamesDisplay.innerHTML = "";
  } else {
    existingEditFiles = [];
    fileNamesDisplay.innerHTML = "Tidak ada file yang dilampirkan.";
  }

  if (fileUpload) {
    fileUpload.addEventListener("change", function () {
      if (this.files && this.files.length > 0) {
        for (const f of this.files) {
          if (!selectedEditFiles.some((sf) => sf.name === f.name && sf.size === f.size)) {
            selectedEditFiles.push(f);
          }
        }
        this.value = "";
        renderEditFilePreview();
      }
    });
  }

  const clearAllEditBtn = document.getElementById("clearAllEditFilesBtn");
  if (clearAllEditBtn) {
    clearAllEditBtn.onclick = function () {
      // mark existing as removed and clear new selections
      removedExistingEditFiles = existingEditFiles.map((e) => e.name || e.filename || e);
      existingEditFiles = [];
      selectedEditFiles = [];
      renderEditFilePreview();
    };
  }

  renderEditFilePreview();
}

// FUNGSI BARU (Tambahkan ini di bawah populateMessageEditForm)
function renderContactListForEdit() {
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

// GANTI FUNGSI LAMA ANDA DENGAN VERSI BARU INI
async function populateMeetingEditForm(schedule) {
  document.getElementById("edit-meetingTitle").value =
    schedule.meetingTitle || schedule.message || "";

  const roomSelect = document.getElementById("edit-meetingRoom");
  if (roomSelect) {
    await loadMeetingRooms(roomSelect, schedule.meetingRoom);
  }

  const startTime = new Date(schedule.scheduledTime);
  const startTimeInput = document.getElementById("edit-meetingStartTime");
  if (startTimeInput) {
    startTimeInput.value = new Date(
      startTime.getTime() - startTime.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);
  }

  if (schedule.meetingEndTime) {
    const endTime = new Date(schedule.meetingEndTime);
    const endTimeInput = document.getElementById("edit-meetingEndTime");
    if (endTimeInput) {
      endTimeInput.value = new Date(
        endTime.getTime() - endTime.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16);
    }
  }

  let numbers = schedule.originalNumbers || schedule.numbers || [];
  const plainNumbers = numbers.map((num) =>
    String(num).replace("@c.us", "").replace(/^62/, "0")
  );

  const numbersInput = document.getElementById("edit-meetingNumbers");
  if (numbersInput) {
    numbersInput.value = plainNumbers.join(", ");
  }

  selectedMeetingNumbers.clear();
  plainNumbers.forEach((num) => selectedMeetingNumbers.add(num));
  renderMeetingContactListForEdit();

  const fileNamesDisplay = document.getElementById("edit-meetingFileNames");

  existingEditMeetingFiles = [];
  removedExistingEditMeetingFiles = [];
  selectedEditMeetingFiles = [];

  if (schedule.filesData && schedule.filesData.length > 0) {
    existingEditMeetingFiles = schedule.filesData.map((f) => ({ name: f.name || f.filename || f, size: f.size || 0, meta: f }));
    fileNamesDisplay.innerHTML = "";
  } else if (schedule.file || schedule.meetingFile) {
    const fileName = (schedule.filesData && schedule.filesData[0] && (schedule.filesData[0].name || schedule.filesData[0].filename)) || (schedule.file || schedule.meetingFile).replace(/^\d+-/, "");
    existingEditMeetingFiles = [{ name: fileName, size: 0 }];
    fileNamesDisplay.innerHTML = "";
  } else {
    existingEditMeetingFiles = [];
    fileNamesDisplay.innerHTML = "Tidak ada file yang dilampirkan.";
  }

  const clearAllEditBtn = document.getElementById("clearAllEditMeetingFilesBtn");
  if (clearAllEditBtn) {
    clearAllEditBtn.onclick = function () {
      removedExistingEditMeetingFiles = existingEditMeetingFiles.map((e) => e.name || e.filename || e);
      existingEditMeetingFiles = [];
      selectedEditMeetingFiles = [];
      renderEditMeetingFilePreview();
    };
  }

  const fileUpload = document.getElementById("edit-meetingFileUpload");
  if (fileUpload) {
    fileUpload.addEventListener("change", function () {
      if (this.files && this.files.length > 0) {
        for (const f of this.files) {
          if (!selectedEditMeetingFiles.some((sf) => sf.name === f.name && sf.size === f.size)) {
            selectedEditMeetingFiles.push(f);
          }
        }
        this.value = "";
        renderEditMeetingFilePreview();
      }
    });
  }

  renderEditMeetingFilePreview();
}

// FUNGSI BARU (Tambahkan ini di bawah populateMeetingEditForm)
function renderMeetingContactListForEdit() {
  const list = document.getElementById("edit-meetingContactList");
  if (!list) return;

  list.innerHTML = "";

  const searchInput = document.getElementById("edit-meetingContactSearch");
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";

  // Filter kontak berdasarkan pencarian
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

  // Add event listeners untuk checkbox yang baru dibuat
  document
    .querySelectorAll(".meeting-contact-checkbox-edit")
    .forEach((checkbox) => {
      checkbox.addEventListener("change", function () {
        if (this.checked) {
          selectedMeetingNumbers.add(this.value);
        } else {
          selectedMeetingNumbers.delete(this.value);
        }
        // Update manual numbers input
        const numbersInput = document.getElementById("edit-meetingNumbers");
        if (numbersInput) {
          numbersInput.value = Array.from(selectedMeetingNumbers).join(", ");
        }
      });
    });
}

// MODIFIKASI KECIL pada fungsi loadMeetingRooms
async function loadMeetingRooms(selectElement = null, selectedValue = null) {
  try {
    const res = await fetch("/meeting-rooms");
    if (!res.ok) throw new Error("Gagal mengambil daftar ruangan.");

    const rooms = await res.json();

    // Tentukan element yang akan digunakan
    const roomSelect = selectElement || document.getElementById("meetingRoom");

    if (roomSelect) {
      roomSelect.innerHTML = '<option value="">Pilih Ruangan</option>';

      rooms.forEach((room) => {
        const option = document.createElement("option");
        option.value = room;
        option.textContent = room;

        // Set sebagai selected jika cocok dengan selectedValue
        if (room === selectedValue) {
          option.selected = true;
        }

        roomSelect.appendChild(option);
      });

      console.log(`Berhasil memuat ${rooms.length} ruangan rapat`);
    } else {
      console.error("Element select untuk meeting room tidak ditemukan!");
    }
  } catch (error) {
    console.error("Error loading meeting rooms:", error);
    Swal.fire("Error", "Gagal memuat daftar ruangan rapat", "error");
  }
}

function createMeetingEditFormHtml(schedule) {
  return `
        <h2>Edit Jadwal Rapat</h2>
        <form id="editMeetingForm" enctype="multipart/form-data">
            <input type="hidden" name="id" value="${schedule.id}">
            <label for="edit-meetingTitle">Judul Rapat:</label>
            <input type="text" id="edit-meetingTitle" name="meetingTitle" required>
            <label for="edit-meetingContactSearch">Pilih Kontak:</label>
            <input type="text" id="edit-meetingContactSearch" placeholder="Cari kontak...">
            <div id="edit-meetingContactList" class="contact-checklist-box"></div>
            <label for="edit-meetingNumbers">Nomor Manual (pisahkan koma):</label>
            <input type="text" id="edit-meetingNumbers" name="manualNumbers" placeholder="0812...">
            <div class="file-upload-section">
                <label>File untuk Rapat:</label>
                <div class="file-upload-container">
                    <input type="file" id="edit-meetingFileUpload" name="files" multiple accept="image/*,video/*,application/pdf">
                    <span class="file-upload-label" data-input="edit-meetingFileUpload">Klik untuk ganti/tambah file</span>
                    <div id="edit-meetingFileNames" class="customFilePreview">Tidak ada file terpilih</div>
                </div>
                <button type="button" id="clearAllEditMeetingFilesBtn" style="display: none; background-color: #dc3545; margin-top: 6px;">Hapus Seluruh File</button>
            </div>
            <label for="edit-meetingRoom">Ruangan:</label>
            <select id="edit-meetingRoom" name="meetingRoom" required>
                <option value="">Pilih Ruangan</option>
            </select>
            <label for="edit-meetingStartTime">Waktu Mulai:</label>
            <input type="datetime-local" id="edit-meetingStartTime" name="startTime" required>
            <label for="edit-meetingEndTime">Waktu Selesai:</label>
            <input type="datetime-local" id="edit-meetingEndTime" name="endTime" required>
            <button type="submit">Update Rapat</button>
            <button type="button" id="cancel-edit-meeting-btn" style="background-color: #6c757d; margin-top: 10px;">Batal</button>
        </form>
    `;
}

// Event listeners for filter buttons
function initFilterButtons() {
  document.querySelectorAll(".filter-button").forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      currentFilter = filter;

      // Update UI
      document.querySelectorAll(".filter-button").forEach((btn) => {
        btn.classList.remove("active");
      });
      button.classList.add("active");

      // Render table dengan filter baru
      renderScheduleTable();
    });
  });
}

function updateFilterButtonActiveState(activeFilter) {
  document.querySelectorAll(".filter-button").forEach((button) => {
    if (button.dataset.filter === activeFilter) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });

  // Tambahkan logika untuk menampilkan hanya rapat jika filter meeting dipilih
  if (activeFilter === "meeting") {
    document.querySelectorAll("#scheduleTable tbody tr").forEach((row) => {
      const scheduleId = row.dataset.id;
      const scheduleData = schedules.find((s) => s.id == scheduleId);
      if (scheduleData && scheduleData.meetingRoom) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    });
  }
}

// Event Listener untuk Form Kirim Pesan
function initReminderForm() {
  const reminderForm = document.getElementById("reminderForm");
  if (!reminderForm) return;

  reminderForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const message = document.getElementById("message").value.trim();
    const datetime = document.getElementById("datetime").value;
    const manualInput = document.getElementById("manualNumbers").value;
    const fileInput = document.getElementById("fileUpload");
    const uploadedFiles = fileInput.files;

    const selectedContactNumbers = Array.from(selectedNumbers);
    const manualNumbers = manualInput
      .split(",")
      .map((num) => num.trim())
      .filter((num) => num !== "");

    const allNumbersSet = new Set([
      ...selectedContactNumbers,
      ...manualNumbers,
    ]);
    const finalNumbers = Array.from(allNumbersSet)
      .map((num) => num.replace(/\D/g, "").trim())
      .filter((num) => num !== "");

    const submitButton = document.querySelector(
      '#reminderForm button[type="submit"]'
    );
    const editId = submitButton ? submitButton.dataset.editId : null;
    const isEditing = !!editId;

    const hasFilesUploaded = uploadedFiles.length > 0;
    const hasMessage = message.length > 0;
    let hasExistingFiles = false;

    if (isEditing) {
      const currentSchedule = schedules.find((s) => s.id == editId);
      hasExistingFiles =
        currentSchedule &&
        currentSchedule.filesData &&
        currentSchedule.filesData.length > 0;
    }

    if (!hasFilesUploaded && !hasMessage && !hasExistingFiles) {
      Swal.fire(
        "Error",
        "Mohon isi pesan atau pilih minimal satu file yang ingin dikirim.",
        "error"
      );
      return;
    }

    const regexPattern = /^(0|62)\d{8,13}$/;
    const invalidNumbersFrontend = finalNumbers.filter(
      (n) => !regexPattern.test(n)
    );

    if (invalidNumbersFrontend.length > 0) {
      Swal.fire(
        "Error",
        `Format nomor tidak valid: ${invalidNumbersFrontend.join(
          ", "
        )}. Pastikan format 08xxxxxxxxxx atau 628xxxxxxxxxx.`,
        "error"
      );
      return;
    }

    const formData = new FormData();
    formData.append("numbers", JSON.stringify(finalNumbers));
    formData.append("datetime", datetime);

    if (message) {
      formData.append("message", message);
    }

    if (selectedFiles.length > 0) {
      selectedFiles.forEach((f) => formData.append("files", f));
    }

    let url = "/add-reminder";
    let method = "POST";

    if (isEditing) {
      url = `/edit-schedule/${editId}`;
      method = "PUT";
    }

    try {
      Swal.fire({
        title: "Memproses...",
        text: "Mohon tunggu",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const res = await fetch(url, {
        method: method,
        body: formData,
      });

      const text = await res.text();
      Swal.close();

      // ...existing code...
      if (res.ok) {
        Swal.fire({
          title: isEditing ? "Jadwal Diupdate!" : "Pesan Terjadwal!",
          html: `
      <b>Kontak:</b> ${finalNumbers.join(", ")}<br>
      <b>Pesan:</b> ${message ? message : "(Tanpa Pesan Teks)"}<br>
      <b>Waktu Kirim:</b> ${new Date(datetime).toLocaleString("id-ID")}
    `,
          icon: "success",
        });

        // reset form UI + internal selected files
        this.reset();
        selectedNumbers.clear();
        renderContactList();

        // clear selectedFiles array and preview + file input element
        selectedFiles = [];
        const fileInputEl = document.getElementById("fileUpload");
        if (fileInputEl) fileInputEl.value = "";
        if (typeof renderFilePreview === "function") renderFilePreview();

        const fileNamesDisplay = document.getElementById("fileNames");
        if (fileNamesDisplay) {
          fileNamesDisplay.textContent = "Belum ada file terpilih";
        }
        if (submitButton) {
          delete submitButton.dataset.editId;
          submitButton.textContent = "Kirim";
        }
        const manualNumbersInput = document.getElementById("manualNumbers");
        if (manualNumbersInput) {
          manualNumbersInput.value = "";
        }

        renderScheduleTable();

        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        Swal.fire("Gagal", text, "error");
      }
    } catch (err) {
      Swal.close();
      Swal.fire("Gagal koneksi ke server", "", "error");
      console.error(err);
    }
  });
}

function showEditMeetingForm(
  id,
  meetingRoom,
  meetingTitle,
  startTime,
  endTime,
  numbers
) {
  // Isi form dengan data meeting
  document.getElementById("meetingTitle").value = meetingTitle || "";
  document.getElementById("meetingRoom").value = meetingRoom || "";

  // Format tanggal dan waktu untuk input datetime-local
  const formatDateTimeForInput = (dateTimeStr) => {
    if (!dateTimeStr) return "";
    const date = new Date(dateTimeStr);
    // Adjust for timezone offset
    const localDateTime = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);
    return localDateTime;
  };

  document.getElementById("meetingStartTime").value =
    formatDateTimeForInput(startTime);
  document.getElementById("meetingEndTime").value =
    formatDateTimeForInput(endTime);

  // Format numbers untuk ditampilkan (konversi 62 ke 0)
  const formatNumbersForDisplay = (numbersArray) => {
    if (!numbersArray) return "";
    return numbersArray
      .map((num) => {
        let cleanNum = String(num).replace("@c.us", "");
        if (cleanNum.startsWith("62")) {
          cleanNum = "0" + cleanNum.slice(2);
        }
        return cleanNum;
      })
      .join(", ");
  };

  document.getElementById("meetingNumbers").value =
    formatNumbersForDisplay(numbers);

  // Set selected numbers untuk checkbox
  selectedMeetingNumbers.clear();
  if (numbers && Array.isArray(numbers)) {
    numbers.forEach((num) => {
      let cleanNum = String(num).replace("@c.us", "");
      if (cleanNum.startsWith("62")) {
        cleanNum = "0" + cleanNum.slice(2);
      }
      selectedMeetingNumbers.add(cleanNum);
    });
  }

  // Render ulang daftar kontak dengan checkbox terpilih
  renderMeetingContactList();

  // Update tombol submit
  const submitButton = document.querySelector(
    '#addMeetingForm button[type="submit"]'
  );
  if (submitButton) {
    submitButton.textContent = "Update Jadwal Rapat";
    submitButton.dataset.editId = id;
  }
}

// --- Fungsi untuk validasi bentrok waktu rapat ---
async function checkMeetingRoomAvailability(
  roomId,
  startTime,
  endTime,
  excludeId = null
) {
  try {
    const res = await fetch("/check-room-availability", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomId,
        startTime,
        endTime,
        excludeId,
      }),
    });

    const result = await res.json();
    return result;
  } catch (error) {
    console.error("Error checking room availability:", error);
    return {
      available: false,
      message: "Gagal memeriksa ketersediaan ruangan",
    };
  }
}

// --- Bagian 4: Event Listener untuk Formulir Rapat (DIMODIFIKASI) ---
function initMeetingForm() {
  const meetingForm = document.getElementById("addMeetingForm");
  if (!meetingForm) return;

  meetingForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitButton = document.querySelector(
      '#addMeetingForm button[type="submit"]'
    );

    const title = document.getElementById("meetingTitle").value.trim();
    const room = document.getElementById("meetingRoom").value;
    const startTime = document.getElementById("meetingStartTime").value;
    const endTime = document.getElementById("meetingEndTime").value;
    const fileInput = document.getElementById("meetingFileUpload");
    const manualInput = document.getElementById("meetingNumbers").value;

    // --- PERBAIKAN KUNCI UNTUK MASALAH KONTAK ---
    // 1. Ambil nomor dari checkbox yang dipilih
    const selectedContactNumbers = Array.from(selectedMeetingNumbers);

    // 2. Ambil nomor dari input manual

    const manualNumbers = manualInput
      .split(",")
      .map((num) => num.trim())
      .filter((num) => num);

    // 3. Gabungkan keduanya dan hapus duplikat
    const allNumbers = [
      ...new Set([...selectedContactNumbers, ...manualNumbers]),
    ];
    // --- AKHIR PERBAIKAN KONTAK ---

    // Validasi dasar
    if (!title || allNumbers.length === 0 || !room || !startTime || !endTime) {
      Swal.fire(
        "Error",
        "Judul, Peserta, Ruangan, dan Waktu harus diisi.",
        "error"
      );
      return;
    }

    // ... (Validasi waktu lainnya tetap sama)
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);
    if (endDateTime <= startDateTime) {
      Swal.fire(
        "Error",
        "Waktu selesai harus lebih besar dari waktu mulai.",
        "error"
      );
      return;
    }

    const editId = submitButton ? submitButton.dataset.editId : null;
    const isEditing = !!editId;

    // --- PERBAIKAN KUNCI UNTUK MASALAH FILE ---
    // 1. Gunakan FormData, bukan JSON
    const formData = new FormData();
    formData.append("meetingTitle", title);
    formData.append("meetingRoom", room);
    formData.append("startTime", startTime);
    formData.append("endTime", endTime);

    // 2. Kirim `allNumbers` yang sudah digabung, bukan hanya dari manual input
    formData.append("numbers", JSON.stringify(allNumbers));

    // 3. Tambahkan file ke FormData
    for (const file of selectedMeetingFiles) {
      formData.append("files", file); // 'files' harus cocok dengan nama di backend multer
    }
    // --- AKHIR PERBAIKAN FILE ---

    let url = isEditing ? `/edit-meeting/${editId}` : "/add-meeting";
    let method = isEditing ? "PUT" : "POST";

    try {
      Swal.fire({
        title: isEditing ? "Mengupdate Rapat..." : "Menjadwalkan Rapat...",
        text: "Mohon tunggu",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const res = await fetch(url, {
        method: method,
        body: formData, // Kirim sebagai FormData, jangan set header Content-Type
      });

      const result = await res.json();
      Swal.close();

      // ...existing code...
      if (res.ok && result.success) {
        Swal.fire({
          title: isEditing ? "Jadwal Rapat Diupdate!" : "Jadwal Rapat Terbuat!",
          icon: "success",
        });

        // reset form UI + internal arrays
        this.reset();
        if (submitButton) {
          delete submitButton.dataset.editId;
          submitButton.textContent = "Jadwalkan Rapat";
        }
        selectedMeetingNumbers.clear();

        // clear selected meeting files and preview + input element
        selectedMeetingFiles = [];
        const meetingFileInputEl = document.getElementById("meetingFileUpload");
        if (meetingFileInputEl) meetingFileInputEl.value = "";
        if (typeof renderMeetingFilePreview === "function")
          renderMeetingFilePreview();

        // also clear displayed names fallback
        const meetingFileNamesEl = document.getElementById("meetingFileNames");
        if (meetingFileNamesEl) meetingFileNamesEl.innerHTML = "";

        renderScheduleTable();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        Swal.fire("Gagal", result.message || "Terjadi kesalahan", "error");
      }
    } catch (err) {
      Swal.close();
      Swal.fire("Gagal koneksi ke server", "", "error");
      console.error(err);
    } finally {
      // --- TAMBAHKAN BLOK FINALLY INI ---
      // Apapun yang terjadi (sukses atau gagal), aktifkan kembali tombolnya
      submitButton.disabled = false;
      // Kembalikan teks tombol ke keadaan semula
      const isStillEditing = !!(submitButton
        ? submitButton.dataset.editId
        : null);
      submitButton.textContent = isStillEditing
        ? "Update Jadwal Rapat"
        : "Jadwalkan Rapat";
      // -----------------------------------
    }
  });
}

// Fungsi untuk memuat data meetings dari server
async function loadMeetings() {
  try {
    const res = await fetch("/meetings");
    if (res.ok) {
      const meetingsData = await res.json();
      // Gabungkan dengan schedules yang ada atau proses sesuai kebutuhan
      console.log("Meetings loaded:", meetingsData);
    }
  } catch (error) {
    console.error("Error loading meetings:", error);
  }
}
console.log("🔍 Checking Socket.IO availability:", typeof io);
function initSocketConnection() {
  console.log("🚀 Initializing Socket connection...");

  if (typeof io === "undefined") {
    console.error("❌ Socket.IO not loaded!");
    return;
  }

  socket = io();

  socket.on("connect", () => {
    console.log("✅ Socket connected successfully! ID:", socket.id);
    socket.emit("test", { message: "Frontend connected" });
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected");
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Socket connection error:", error);
  });

  // ===== INI YANG PENTING: Event listeners untuk chat =====
  socket.on("newIncomingMessage", (data) => {
    console.log("🔔 RECEIVED newIncomingMessage:", data);

    // Langsung update UI
    handleNewIncomingMessage(data);
  });

  socket.on("updateUnreadCount", () => {
    console.log("🔄 Received updateUnreadCount signal");
    updateUnreadCount();
    loadChatConversations();
  });

  socket.on("testResponse", (data) => {
    console.log("🧪 Test response received:", data);
  });

  // Debug: Listen semua events
  socket.onAny((eventName, ...args) => {
    console.log("📡 Socket event received:", eventName, args);
  });
}
function handleNewIncomingMessage(messageData) {
  console.log("🔔 Handling new incoming message:", messageData);

  // 1. Update unread count
  updateUnreadCount();

  // 2. Play notification sound
  playNotificationSound();

  // 3. Show browser notification
  showBrowserNotification(messageData);

  // 4. Reload conversations list untuk tab yang sedang aktif
  loadChatConversations(activeChatTab);

  // 5. Jika sedang melihat chat ini, reload messages di area utama
  if (currentChatNumber === messageData.fromNumber) {
    console.log("📱 Reloading active chat:", messageData.fromNumber);
    loadChatHistory(messageData.fromNumber);
  } else {
    console.log(
      "📱 Message from different chat:",
      messageData.fromNumber,
      "current:",
      currentChatNumber
    );
  }

  console.log("✅ New message handled successfully");
}

// TAMBAHAN: Fungsi untuk menambah pesan langsung ke chat aktif
function addMessageToActiveChat(messageData) {
  // Hanya tambahkan jika sedang melihat chat dari nomor yang sama
  if (currentChatNumber !== messageData.fromNumber) return;

  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;

  const messageDiv = document.createElement("div");
  messageDiv.className = "message incoming";

  const messageTime = new Date(messageData.timestamp).toLocaleString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });

  messageDiv.innerHTML = `
        <div class="message-bubble">
            ${messageData.message}
            <div class="message-time">${messageTime}</div>
        </div>
    `;

  chatMessages.appendChild(messageDiv);

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Mark as read jika chat sedang aktif
  markMessagesAsRead(messageData.fromNumber);
}

// PERBAIKAN: Fungsi untuk mark as read
async function markMessagesAsRead(fromNumber) {
  try {
    await fetch(`/api/chats/mark-read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fromNumber: fromNumber }),
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
  }
}

// PERBAIKAN: Load chat conversations dengan error handling
async function loadChatConversations(status = "active") {
  console.log(`📋 Memuat percakapan dengan status: ${status}...`);
  try {
    const response = await fetch(`/api/chats/conversations?status=${status}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && Array.isArray(result.data)) {
      // Langsung gunakan data dari backend tanpa perlu mapping lagi
      chatConversations = result.data.map((conv) => ({
        phoneNumber: conv.fromNumber,
        contactName: conv.contactName,
        lastMessage: conv.lastMessage,
        lastMessageTime: conv.lastTimestamp,
        direction: conv.direction,
        unreadCount: conv.unreadCount || 0,
      }));

      renderChatConversations();
    } else {
      console.error(
        "❌ Format data dari server tidak valid:",
        result.message || result
      );
      chatConversations = []; // Kosongkan data jika error
      renderChatConversations(); // Tampilkan pesan "tidak ada percakapan"
    }
  } catch (error) {
    console.error("❌ Error di dalam fungsi loadChatConversations:", error);
    chatConversations = []; // Kosongkan data jika error
    renderChatConversations(); // Tampilkan pesan "tidak ada percakapan"
  }
}

// PERBAIKAN: Update unread count
async function updateUnreadCount() {
  try {
    const response = await fetch("/api/chats/unread-count");
    const result = await response.json();

    if (result.totalUnread !== undefined) {
      unreadCount = result.totalUnread;

      const chatBadge = document.getElementById("chatBadge");
      if (chatBadge) {
        if (unreadCount > 0) {
          chatBadge.textContent = unreadCount;
          chatBadge.style.display = "inline-flex";
        } else {
          chatBadge.style.display = "none";
        }
      }

      console.log(`📊 Unread count updated: ${unreadCount}`);
    }
  } catch (error) {
    console.error("Error updating unread count:", error);
  }
}

// ===== CHAT SYSTEM INITIALIZATION =====
function initChatSystem() {
  console.log("💬 Chat system initialization started...");

  // 1. Inisialisasi Socket
  initSocketConnection();

  // 2. Inisialisasi Event Listeners
  initChatEventListeners();

  // 3. Load data awal setelah delay singkat
  setTimeout(() => {
    console.log("📋 Loading initial chat data...");
    loadChatConversations();
    updateUnreadCount();
  }, 1000);

  console.log("✅ Chat system initialization complete");
}

// ===== CHAT EVENT LISTENERS =====
function initChatEventListeners() {
  // Search chat functionality
  const chatSearch = document.getElementById("chatSearch");
  if (chatSearch) {
    chatSearch.addEventListener("input", function () {
      const searchTerm = this.value.toLowerCase();
      filterChatConversations(searchTerm);
    });
  }

  // Send reply button
  const sendReplyBtn = document.getElementById("sendReplyBtn");
  if (sendReplyBtn) {
    sendReplyBtn.addEventListener("click", sendReply);
  }

  // Enter key to send reply
  const replyInput = document.getElementById("replyInput");
  if (replyInput) {
    replyInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendReply();
      }
    });
  }

  // Refresh chat button
  const refreshChatBtn = document.getElementById("refreshChatBtn");
  if (refreshChatBtn) {
    refreshChatBtn.addEventListener("click", function () {
      if (currentChatNumber) {
        loadChatHistory(currentChatNumber);
      }
      loadChatConversations(activeChatTab);
    });
  }

  // End chat button
  const endChatBtn = document.getElementById("endChatBtn");
  if (endChatBtn) {
    endChatBtn.addEventListener("click", endChat);
  }

  // Event listener untuk tombol tab chat (Daftar Percakapan & History Chat)
  document.querySelectorAll(".chat-tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll(".chat-tab-button")
        .forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      activeChatTab = button.dataset.status;
      loadChatConversations(activeChatTab);
    });
  });
}

// ===== LOAD CHAT CONVERSATIONS =====
async function loadChatConversations(status = "active") {
  console.log(`📋 Loading chat conversations with status: ${status}...`);
  try {
    const response = await fetch(`/api/chats/conversations?status=${status}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && Array.isArray(result.data)) {
      // Ini adalah langkah kunci: mengubah 'fromNumber' menjadi 'phoneNumber'
      chatConversations = result.data.map((conv) => {
        console.log("[DEBUG] Raw data from server:", conv); // Untuk debugging
        return {
          phoneNumber: conv.fromNumber, // Membuat properti yang benar
          contactName: conv.contactName || conv.fromNumber,
          lastMessage: conv.lastMessage,
          lastMessageTime: conv.lastTimestamp,
          direction: conv.direction,
          unreadCount: conv.unreadCount || 0,
        };
      });
      renderChatConversations();
    } else {
      console.error(
        "❌ Invalid data format from server:",
        result.message || result
      );
    }
  } catch (error) {
    console.error("❌ Error in loadChatConversations:", error);
  }
}

// ===== RENDER CHAT CONVERSATIONS =====
function renderChatConversations() {
  const chatList = document.getElementById("chatList");
  if (!chatList) return;

  chatList.innerHTML = "";

  if (chatConversations.length === 0) {
    chatList.innerHTML =
      '<div class="no-conversations">Tidak ada percakapan.</div>';
    return;
  }

  chatConversations.forEach((conversation) => {
    const chatItem = document.createElement("div");
    chatItem.className = "chat-item";
    if (conversation.unreadCount > 0) {
      chatItem.classList.add("unread");
    }

    chatItem.setAttribute("data-phone-number", conversation.phoneNumber);

    const lastMessageTime = new Date(
      conversation.lastMessageTime
    ).toLocaleString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });

    chatItem.innerHTML = `
            <div class="chat-item-header">
                <div class="chat-contact-name">${conversation.contactName}</div>
                <div class="chat-time">${lastMessageTime}</div>
            </div>
            <div class="chat-preview">
                ${conversation.lastMessage}
                ${
                  conversation.unreadCount > 0
                    ? `<span class="unread-count">${conversation.unreadCount}</span>`
                    : ""
                }
            </div>
        `;

    chatItem.addEventListener("click", () => {
      selectConversation(conversation.phoneNumber, conversation.contactName);
    });

    chatList.appendChild(chatItem);
  });
}

// ===== FILTER CHAT CONVERSATIONS =====
function filterChatConversations(searchTerm) {
  const chatItems = document.querySelectorAll(".chat-item");

  chatItems.forEach((item) => {
    const contactName = item
      .querySelector(".chat-contact-name")
      .textContent.toLowerCase();
    const chatPreview = item
      .querySelector(".chat-preview")
      .textContent.toLowerCase();

    if (contactName.includes(searchTerm) || chatPreview.includes(searchTerm)) {
      item.style.display = "block";
    } else {
      item.style.display = "none";
    }
  });
}

// ===== SELECT CONVERSATION =====
async function selectConversation(phoneNumber, contactName) {
  currentChatNumber = phoneNumber;

  // Update UI header chat
  document.getElementById("activeContactName").textContent = contactName;
  document.getElementById("activeContactNumber").textContent = phoneNumber;

  // Tampilkan area input chat
  const chatInputArea = document.getElementById("chatInputArea");
  if (chatInputArea) {
    chatInputArea.style.display = "block";
  }

  // Update active state di sidebar
  document.querySelectorAll(".chat-item").forEach((item) => {
    item.classList.remove("active");
  });

  // Cari dan aktifkan item yang dipilih
  const chatItems = document.querySelectorAll(".chat-item");
  chatItems.forEach((item) => {
    const contactNameEl = item.querySelector(".chat-contact-name");
    if (contactNameEl && contactNameEl.textContent === contactName) {
      item.classList.add("active");
      item.classList.remove("unread");
    }
  });

  // Mark messages as read
  try {
    await fetch(`/api/chats/mark-read/${phoneNumber}`, {
      method: "PUT",
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
  }

  // Load chat history
  loadChatHistory(phoneNumber);

  // Update unread count
  updateUnreadCount();
}

// ===== LOAD CHAT HISTORY =====
async function loadChatHistory(phoneNumber) {
  try {
    const response = await fetch(`/api/chats/conversation/${phoneNumber}`);
    const result = await response.json();

    if (result.success) {
      renderChatMessages(result.data.messages);
    } else {
      console.error("Failed to load chat history:", result.message);
    }
  } catch (error) {
    console.error("Error loading chat history:", error);
  }
}

// ===== RENDER CHAT MESSAGES =====
// Di dalam file script.js

function renderChatMessages(messages) {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;

  chatMessages.innerHTML = "";

  if (!messages || messages.length === 0) {
    chatMessages.innerHTML =
      '<div class="no-messages">Belum ada pesan dalam percakapan ini</div>';
    return;
  }

  messages.forEach((raw) => {
    const message = Object.assign({}, raw); // salinan
    // Normalize message.message (parse JSON bila perlu)
    let payload = message.message;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        /* tetap string */
      }
    }

    // If payload is object and has url, use it
    const mediaUrl =
      payload && typeof payload === "object" && (payload.url || payload.path)
        ? payload.url || payload.path
        : message.mediaUrl || null;

    // ensure messageType
    let mtype =
      message.messageType ||
      (payload && payload.mimetype
        ? payload.mimetype.startsWith("image/")
          ? "image"
          : payload.mimetype.startsWith("video/")
          ? "video"
          : "document"
        : "chat");

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${
      message.direction === "in" ? "incoming" : "outgoing"
    }`;

    const messageTime = new Date(message.timestamp).toLocaleString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });

    let messageBubbleContent = "";

    if (mtype === "image" && mediaUrl) {
      messageBubbleContent = `
        <div class="message-media-container" onclick="showMediaModal('${mediaUrl}', 'image')">
          <img src="${mediaUrl}" class="chat-image" alt="${
        payload && payload.originalname ? payload.originalname : "Gambar"
      }">
        </div>
        ${
          payload && payload.caption
            ? `<div class="message-caption">${payload.caption}</div>`
            : ""
        }
        <div class="message-time">${messageTime}</div>
      `;
    } else if (mtype === "video" && mediaUrl) {
      messageBubbleContent = `
        <div class="message-media-container" onclick="showMediaModal('${mediaUrl}', 'video')">
          <video src="${mediaUrl}" class="chat-video-preview" controls preload="metadata"></video>
        </div>
        ${
          payload && payload.caption
            ? `<div class="message-caption">${payload.caption}</div>`
            : ""
        }
        <div class="message-time">${messageTime}</div>
      `;
    } else if ((mtype === "document" || mtype === "file") && mediaUrl) {
      const fileName =
        (payload && payload.originalname) ||
        (typeof payload === "string" ? payload : "Unduh File");
      messageBubbleContent = `
        <a href="${mediaUrl}" target="_blank" download class="chat-file-link">
          <div class="file-icon"><i class="fa-solid fa-file-arrow-down"></i></div>
          <div class="file-info">
            <span class="chat-file-name">${fileName}</span>
          </div>
        </a>
        <div class="message-time">${messageTime}</div>
      `;
    } else {
      // teks / fallback
      const text =
        typeof payload === "object"
          ? payload.caption || payload.originalname || JSON.stringify(payload)
          : payload || "";
      messageBubbleContent = `
        <div class="text-content">${text}</div>
        <div class="message-time">${messageTime}</div>
      `;
    }

    messageDiv.innerHTML = `<div class="message-bubble">${messageBubbleContent}</div>`;
    chatMessages.appendChild(messageDiv);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ==========================================================
// === FUNGSI-FUNGSI BARU UNTUK MODAL MEDIA ===
// ==========================================================

/**
 * Menampilkan modal dengan gambar atau video.
 * @param {string} url - URL dari media yang akan ditampilkan.
 * @param {string} type - Tipe media ('image' atau 'video').
 */
function showMediaModal(url, type) {
  const modal = document.getElementById("mediaModal");
  const modalContent = document.getElementById("modalContent");
  const downloadLink = document.getElementById("downloadLink");

  // Kosongkan konten sebelumnya
  modalContent.innerHTML = "";

  if (type === "image") {
    const img = document.createElement("img");
    img.src = url;
    modalContent.appendChild(img);
  } else if (type === "video") {
    const video = document.createElement("video");
    video.src = url;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    modalContent.appendChild(video);
  }

  // Atur link unduhan
  downloadLink.href = url;

  // Tampilkan modal
  modal.style.display = "flex";
}

/**
 * Menutup modal media.
 */
function closeMediaModal() {
  const modal = document.getElementById("mediaModal");
  const modalContent = document.getElementById("modalContent");

  // Hentikan video jika ada
  const video = modalContent.querySelector("video");
  if (video) {
    video.pause();
  }

  modal.style.display = "none";
  modalContent.innerHTML = ""; // Kosongkan konten untuk menghemat memori
}

// ===== SEND REPLY =====
async function sendReply() {
  const replyInput = document.getElementById("replyInput");
  const chatFileInput = document.getElementById("chatFileInput");
  const sendBtn = document.getElementById("sendReplyBtn");

  if (!currentChatNumber) {
    Swal.fire("Error", "Pilih percakapan terlebih dahulu.", "error");
    return;
  }

  const caption = replyInput.value.trim();
  const file = chatFileInput.files[0];
  const hasFile = !!file;

  if (!caption && !hasFile) {
    Swal.fire(
      "Peringatan",
      "Ketik pesan atau pilih file terlebih dahulu.",
      "warning"
    );
    return;
  }

  // Disable UI
  replyInput.disabled = true;
  chatFileInput.disabled = true;
  sendBtn.disabled = true;

  try {
    let response;
    if (hasFile) {
      // Logika untuk mengirim media
      const formData = new FormData();
      formData.append("to", currentChatNumber);
      formData.append("caption", caption);
      formData.append("media", file); // Nama field harus 'media'

      response = await fetch("/api/chats/send-media", {
        method: "POST",
        body: formData,
      });
    } else {
      // Logika untuk mengirim teks biasa
      response = await fetch("/api/chats/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: currentChatNumber, message: caption }),
      });
    }

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal mengirim pesan.");
    }

    // Reset UI setelah berhasil
    replyInput.value = "";
    chatFileInput.value = "";
    const selectedFilePreviewEl = document.querySelector(".chat-selected-file");
    if (selectedFilePreviewEl) selectedFilePreviewEl.remove();

    // Muat ulang history untuk menampilkan pesan/gambar yang baru dikirim
    loadChatHistory(currentChatNumber);
    // Muat ulang daftar percakapan untuk memperbarui pesan terakhir
    loadChatConversations(activeChatTab);
  } catch (e) {
    console.error(e);
    Swal.fire("Error", e.message, "error");
  } finally {
    // Re-enable UI
    replyInput.disabled = false;
    chatFileInput.disabled = false;
    sendBtn.disabled = false;
    replyInput.focus();
  }
}

async function endChat() {
  if (!currentChatNumber) {
    Swal.fire("Peringatan", "Pilih percakapan terlebih dahulu.", "warning");
    return;
  }

  const result = await Swal.fire({
    title: "Akhiri Sesi Chat?",
    text: "Percakapan ini akan dipindahkan ke History Chat.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Ya, Akhiri",
    cancelButtonText: "Batal",
  });

  if (result.isConfirmed) {
    try {
      const response = await fetch(`/api/chats/end-chat/${currentChatNumber}`, {
        method: "PUT",
      });
      const data = await response.json();

      if (data.success) {
        Swal.fire("Berhasil", "Sesi chat telah diakhiri.", "success");
        currentChatNumber = null;
        document.getElementById("activeContactName").textContent =
          "Pilih percakapan";
        document.getElementById("activeContactNumber").textContent = "";
        document.getElementById("chatMessages").innerHTML =
          '<div class="no-chat-selected"><i class="fa-solid fa-comments"></i><p>Pilih percakapan untuk mulai chat</p></div>';
        document.getElementById("chatInputArea").style.display = "none";
        loadChatConversations(activeChatTab);
      } else {
        Swal.fire("Gagal", data.message, "error");
      }
    } catch (error) {
      Swal.fire("Error", "Terjadi kesalahan saat menghubungi server.", "error");
    }
  }
}

// ===== UPDATE UNREAD COUNT =====
async function updateUnreadCount() {
  try {
    const response = await fetch("/api/chats/unread-count");
    const result = await response.json();

    if (result.success) {
      unreadCount = result.data.count;

      const chatBadge = document.getElementById("chatBadge");
      if (chatBadge) {
        if (unreadCount > 0) {
          chatBadge.textContent = unreadCount;
          chatBadge.style.display = "inline-flex";
        } else {
          chatBadge.style.display = "none";
        }
      }
    }
  } catch (error) {
    console.error("Error updating unread count:", error);
  }
}

// ===== NOTIFICATION FUNCTIONS =====
function playNotificationSound() {
  console.log("🔊 Playing notification sound...");

  // Buat audio element jika belum ada
  let audio = document.getElementById("notificationSound");
  if (!audio) {
    audio = document.createElement("audio");
    audio.id = "notificationSound";
    audio.preload = "auto";

    // Gunakan default notification sound atau data URL
    audio.src =
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBj+a2/LDciUFL";

    document.body.appendChild(audio);
  }

  // Play dengan error handling
  audio.play().catch((e) => {
    console.log("🔇 Could not play notification sound:", e.message);
  });
}

function showBrowserNotification(messageData) {
  console.log("🔔 Showing browser notification for:", messageData);

  // Request permission jika belum ada
  if ("Notification" in window) {
    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          showNotification(messageData);
        }
      });
    } else if (Notification.permission === "granted") {
      showNotification(messageData);
    }
  }
}

function showNotification(messageData) {
  const notification = new Notification("Pesan WhatsApp Baru", {
    body: `${messageData.contactName || messageData.fromNumber}: ${
      messageData.message
    }`,
    icon: "/favicon.ico", // Sesuaikan dengan path icon Anda
    tag: "whatsapp-message",
    requireInteraction: false,
  });

  notification.onclick = function () {
    window.focus();
    // Buka tab chat jika diperlukan
    showForm("chat");
    notification.close();
  };

  // Auto close after 5 seconds
  setTimeout(() => notification.close(), 5000);
}

async function handleReminderFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const editId = form.querySelector('input[name="id"]')?.value;
  const isEditing = !!editId;

  const formData = new FormData(form);
  formData.delete("fileUpload");

  // Prefer files chosen in the edit modal (selectedEditFiles) when editing
  if (isEditing && Array.isArray(selectedEditFiles) && selectedEditFiles.length > 0) {
    selectedEditFiles.forEach((f) => formData.append("files", f));
  } else if (Array.isArray(selectedFiles) && selectedFiles.length > 0) {
    selectedFiles.forEach((f) => formData.append("files", f));
  }

  // append deleted existing filenames if any
  if (isEditing && removedExistingEditFiles.length > 0) {
    formData.append("deletedFiles", JSON.stringify(removedExistingEditFiles));
  }

  const manualNumbers = formData
    .get("manualNumbers")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  const finalNumbers = JSON.stringify(
    Array.from(new Set([...selectedNumbers, ...manualNumbers]))
  );
  formData.set("numbers", finalNumbers);

  let url = isEditing ? `/edit-schedule/${editId}` : "/add-reminder";
  let method = isEditing ? "PUT" : "POST";

  try {
    Swal.fire({
      title: "Memproses...",
      text: "Mohon tunggu",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    const res = await fetch(url, { method: method, body: formData });
    const text = await res.text();
    Swal.close();

    if (res.ok) {
      Swal.fire(
        isEditing ? "Jadwal Diupdate!" : "Pesan Terjadwal!",
        text,
        "success"
      );

      // clear internal selected files and UI preview
      selectedFiles = [];
      selectedEditFiles = [];
      existingEditFiles = [];
      removedExistingEditFiles = [];

      const fileInputEl = document.getElementById("fileUpload");
      if (fileInputEl) fileInputEl.value = "";
      if (typeof renderFilePreview === "function") renderFilePreview();
      if (typeof renderEditFilePreview === "function") renderEditFilePreview();

      renderScheduleTable();
      closeEditModal();
    } else {
      Swal.fire("Gagal", text, "error");
    }
  } catch (err) {
    Swal.close();
    Swal.fire("Gagal koneksi ke server", err.message, "error");
  }
}

async function handleMeetingFormSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const formData = e._formData instanceof FormData ? e._formData : new FormData(form);
  const manualNumbers = (formData.get("manualNumbers") || "")
    .toString()
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  const finalNumbers = JSON.stringify(Array.from(new Set([...selectedMeetingNumbers, ...manualNumbers])));
  formData.set("numbers", finalNumbers);
  formData.delete("manualNumbers");

  // append new files
  if (Array.isArray(selectedEditMeetingFiles) && selectedEditMeetingFiles.length > 0) {
    formData.delete("files");
    selectedEditMeetingFiles.forEach((f) => formData.append("files", f));
  } else if (Array.isArray(selectedMeetingFiles) && selectedMeetingFiles.length > 0) {
    formData.delete("files");
    selectedMeetingFiles.forEach((f) => formData.append("files", f));
  }

  // append deleted existing meeting files if any
  const editId = form.querySelector('input[name="id"]')?.value;
  const isEditing = !!editId;
  if (isEditing && removedExistingEditMeetingFiles.length > 0) {
    formData.append("deletedFiles", JSON.stringify(removedExistingEditMeetingFiles));
  }

  // continue with existing fetch logic (unchanged)...
  const url = isEditing ? `/edit-meeting/${editId}` : "/add-meeting";
  const method = isEditing ? "PUT" : "POST";

  try {
    Swal.fire({ title: "Memproses...", text: "Mohon tunggu", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const res = await fetch(url, { method: method, body: formData });
    const result = await res.json();
    Swal.close();
    if (res.ok && result.success) {
      Swal.fire(isEditing ? "Rapat Diupdate!" : "Rapat Terjadwal!", result.message, "success");

      // clear buffers
      selectedMeetingFiles = [];
      selectedEditMeetingFiles = [];
      existingEditMeetingFiles = [];
      removedExistingEditMeetingFiles = [];

      if (typeof renderMeetingFilePreview === "function") renderMeetingFilePreview();
      if (typeof renderEditMeetingFilePreview === "function") renderEditMeetingFilePreview();

      renderScheduleTable();
      closeEditModal();
    } else {
      Swal.fire("Gagal", result.message || "Terjadi kesalahan", "error");
    }
  } catch (err) {
    Swal.close();
    Swal.fire("Gagal koneksi ke server", err.message, "error");
  }
}

// Initial calls
function initApp() {
  console.log("🚀 Initializing app...");

  // Inisialisasi fungsi-fungsi utama
  initContactListeners();
  initFileUploadListener();
  initFilterButtons();
  initReminderForm();
  initMeetingForm();
  initMeetingContactListeners();
  initMeetingFileUploadListener();

  // Event listener untuk modal media
  const mediaModal = document.getElementById("mediaModal");
  if (mediaModal) {
    mediaModal.addEventListener("click", function (event) {
      if (event.target === mediaModal) {
        closeMediaModal();
      }
    });
  }

  // Form CRUD kontak
  const contactForm = document.getElementById("contact-crud-form");
  if (contactForm) {
    contactForm.addEventListener("submit", handleContactFormSubmit);
  }

  const contactCancelBtn = document.getElementById("contact-crud-cancel");
  if (contactCancelBtn) {
    contactCancelBtn.addEventListener("click", resetContactCrudForm);
  }

  // Load data awal
  loadContacts();
  loadMeetingRooms();
  updateFilterButtonActiveState(currentFilter);
  renderScheduleTable();

  // Inisialisasi chat system
  console.log("💬 Initializing chat system...");
  initChatSystem();

  // Timer untuk update berkala
  setInterval(updateCountdownTimers, 1000);
  setInterval(renderScheduleTable, 5000);

  console.log("✅ App initialization complete");
}

function handleNewIncomingMessage(messageData) {
  console.log("🔔 Handling new incoming message:", messageData);

  // 1. Update unread count
  updateUnreadCount();

  // 2. Play notification sound
  playNotificationSound();

  // 3. Show browser notification
  showBrowserNotification(messageData);

  // 4. Reload conversations list (ini akan memperbarui sidebar)
  loadChatConversations();

  // 5. Jika sedang melihat chat ini, reload messages di area utama
  if (currentChatNumber === messageData.fromNumber) {
    console.log("📱 Reloading active chat:", messageData.fromNumber);
    loadChatHistory(messageData.fromNumber);
  } else {
    console.log(
      "📱 Message from different chat:",
      messageData.fromNumber,
      "current:",
      currentChatNumber
    );
  }

  console.log("✅ New message handled successfully");
}

// Update fungsi loadChatConversations untuk bekerja dengan sidebar
async function loadChatConversations(status = "active") {
  console.log(`[Frontend] Meminta percakapan dengan status: ${status}...`);
  try {
    const response = await fetch(`/api/chats/conversations?status=${status}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && Array.isArray(result.data)) {
      console.log("[Frontend] Data diterima dari backend:", result.data);

      // Perbaikan: Mapping data dari backend ke format yang dibutuhkan frontend
      chatConversations = result.data.map((conv) => ({
        phoneNumber: conv.fromNumber,
        contactName: conv.contactName || conv.fromNumber, // Fallback jika nama kontak tidak ada
        lastMessage: conv.lastMessage || "", // Fallback untuk pesan kosong
        lastMessageTime: conv.lastTimestamp,
        direction: conv.direction,
        unreadCount: conv.unreadCount || 0,
      }));

      renderChatConversations();
    } else {
      console.error(
        "[Frontend] Format data dari server tidak valid:",
        result.message || result
      );
      chatConversations = [];
      renderChatConversations();
    }
  } catch (error) {
    console.error(
      "[Frontend] Error di dalam fungsi loadChatConversations:",
      error
    );
    chatConversations = [];
    renderChatConversations();
  }
}

// di script.js
const attachBtn = document.getElementById("attachFileBtn");
const chatFileInput = document.getElementById("chatFileInput");

attachBtn.addEventListener("click", (e) => {
  e.preventDefault();
  chatFileInput.click();
});

const chatInputContainer = document.querySelector(".chat-input-container");
const replyInput = document.getElementById("replyInput");

let selectedFilePreviewEl = null;

chatFileInput.addEventListener("change", () => {
  // bersihkan preview lama
  if (selectedFilePreviewEl) selectedFilePreviewEl.remove();

  if (!chatFileInput.files.length) return;
  const f = chatFileInput.files[0];

  // buat chip preview
  const wrap = document.createElement("div");
  wrap.className = "chat-selected-file";

  const name = document.createElement("span");
  name.className = "file-name";
  name.textContent = f.name + ` (${Math.round(f.size / 1024)} KB)`;
  wrap.appendChild(name);

  // thumbnail opsional
  if (f.type.startsWith("image/")) {
    const img = document.createElement("img");
    img.className = "thumb";
    img.src = URL.createObjectURL(f);
    img.onload = () => URL.revokeObjectURL(img.src);
    wrap.prepend(img);
  }

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "remove";
  removeBtn.innerHTML = "&times;";
  removeBtn.onclick = () => {
    chatFileInput.value = "";
    wrap.remove();
    selectedFilePreviewEl = null;
  };
  wrap.appendChild(removeBtn);

  // sisipkan sebelum input teks
  chatInputContainer.insertBefore(wrap, replyInput);
  selectedFilePreviewEl = wrap;
});

// ...existing code...

// Store selected files in an array
let selectedFiles = [];

// Reference to file input and preview container (guarded)
const fileInput = document.getElementById("fileUpload");
const filePreview = document.getElementById("customFilePreview");
const clearAllBtn = document.getElementById("clearAllFilesBtn");

if (fileInput && filePreview && clearAllBtn) {
  // When user selects files
  fileInput.addEventListener("change", function () {
    for (const file of this.files) {
      if (
        !selectedFiles.some((f) => f.name === file.name && f.size === file.size)
      ) {
        selectedFiles.push(file);
      }
    }
    this.value = ""; // reset input so same file can be added later
    renderFilePreview();
  });

  // Render file preview
  function renderFilePreview() {
    if (typeof filePreview === "undefined" || !filePreview) return;
    filePreview.innerHTML = "";
    if (!selectedFiles || selectedFiles.length === 0) {
      filePreview.innerHTML = "<span>Tidak ada file terpilih</span>";
      if (typeof clearAllBtn !== "undefined" && clearAllBtn)
        clearAllBtn.style.display = "none";
      return;
    }

    selectedFiles.forEach((file, idx) => {
      const div = document.createElement("div");
      div.className = "file-chip";

      const nameSpan = document.createElement("span");
      nameSpan.className = "file-name-text";
      nameSpan.textContent = file.name;

      const sizeSpan = document.createElement("span");
      sizeSpan.className = "file-size-text";
      sizeSpan.textContent = ` (${Math.round(file.size / 1024)} KB)`;

      div.appendChild(nameSpan);
      div.appendChild(sizeSpan);

      // keep a hidden remove button if logic uses it (CSS hides it)
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "remove-file-btn";
      btn.dataset.idx = idx;
      btn.textContent = "×";
      div.appendChild(btn);

      filePreview.appendChild(div);
    });

    if (typeof clearAllBtn !== "undefined" && clearAllBtn)
      clearAllBtn.style.display = "inline-block";
  }

  // Clear all files
  clearAllBtn.addEventListener("click", function () {
    selectedFiles = [];
    renderFilePreview();
  });

  // initial render
  renderFilePreview();
}

// Store selected files for meeting form
let selectedMeetingFiles = [];

// Reference to meeting file input and preview container (guarded)
const meetingFileInput = document.getElementById("meetingFileUpload");
const meetingFilePreview = document.getElementById("meetingFileNames");

// create and append clear button only when preview container exists
let meetingClearAllBtn = document.getElementById("clearAllMeetingFilesBtn");
if (!meetingClearAllBtn && meetingFilePreview) {
  const fileUploadContainer = meetingFilePreview.parentNode; // .file-upload-container
  if (fileUploadContainer && fileUploadContainer.parentNode) {
    meetingClearAllBtn = document.createElement("button");
    meetingClearAllBtn.type = "button";
    meetingClearAllBtn.id = "clearAllMeetingFilesBtn";
    meetingClearAllBtn.textContent = "Hapus Seluruh File";
    meetingClearAllBtn.style.display = "none";
    meetingClearAllBtn.style.marginTop = "6px";
    fileUploadContainer.parentNode.insertBefore(
      meetingClearAllBtn,
      fileUploadContainer.nextSibling
    );
  }
}
if (meetingFileInput && meetingFilePreview) {
  meetingFileInput.addEventListener("change", function () {
    for (const file of this.files) {
      if (
        !selectedMeetingFiles.some(
          (f) => f.name === file.name && f.size === file.size
        )
      ) {
        selectedMeetingFiles.push(file);
      }
    }
    this.value = "";
    renderMeetingFilePreview();
  });

  function renderMeetingFilePreview() {
    if (typeof meetingFilePreview === "undefined" || !meetingFilePreview)
      return;
    meetingFilePreview.innerHTML = "";
    if (!selectedMeetingFiles || selectedMeetingFiles.length === 0) {
      meetingFilePreview.innerHTML = "<span>Belum ada file terpilih</span>";
      if (typeof meetingClearAllBtn !== "undefined" && meetingClearAllBtn)
        meetingClearAllBtn.style.display = "none";
      return;
    }

    selectedMeetingFiles.forEach((file, idx) => {
      const div = document.createElement("div");
      div.className = "file-chip";

      const nameSpan = document.createElement("span");
      nameSpan.className = "file-name-text";
      nameSpan.textContent = file.name;

      const sizeSpan = document.createElement("span");
      sizeSpan.className = "file-size-text";
      sizeSpan.textContent = ` (${Math.round(file.size / 1024)} KB)`;

      div.appendChild(nameSpan);
      div.appendChild(sizeSpan);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "remove-meeting-file-btn";
      btn.dataset.idx = idx;
      btn.textContent = "×";
      div.appendChild(btn);

      meetingFilePreview.appendChild(div);
    });

    if (typeof meetingClearAllBtn !== "undefined" && meetingClearAllBtn)
      meetingClearAllBtn.style.display = "inline-block";
  }

  if (meetingClearAllBtn) {
    meetingClearAllBtn.addEventListener("click", function () {
      selectedMeetingFiles = [];
      renderMeetingFilePreview();
    });
  }

  // initial render
  renderMeetingFilePreview();
}

// --------- EDIT MEETING MODAL ---------
let selectedEditMeetingFiles = [];
let editMeetingFileInput = null;
let editMeetingFilePreview = null;
let editMeetingClearAllBtn = null;

function initEditMeetingFileLogic() {
  selectedEditMeetingFiles = [];
  editMeetingFileInput = document.getElementById("edit-meetingFileUpload");
  editMeetingFilePreview = document.getElementById("edit-meetingFileNames");

  if (!editMeetingFilePreview) return;

  // create clear button only if needed and not already present
  editMeetingClearAllBtn = document.getElementById(
    "clearAllEditMeetingFilesBtn"
  );
  if (!editMeetingClearAllBtn && editMeetingFilePreview.parentNode) {
    editMeetingClearAllBtn = document.createElement("button");
    editMeetingClearAllBtn.type = "button";
    editMeetingClearAllBtn.id = "clearAllEditMeetingFilesBtn";
    editMeetingClearAllBtn.textContent = "Clear All Files";
    editMeetingClearAllBtn.style.display = "none";
    editMeetingClearAllBtn.style.marginTop = "6px";
    editMeetingFilePreview.parentNode.appendChild(editMeetingClearAllBtn);
  }

  if (editMeetingFileInput) {
    editMeetingFileInput.addEventListener("change", function () {
      for (const file of this.files) {
        if (
          !selectedEditMeetingFiles.some(
            (f) => f.name === file.name && f.size === file.size
          )
        ) {
          selectedEditMeetingFiles.push(file);
        }
      }
      this.value = "";
      renderEditMeetingFilePreview();
    });
  }

  if (editMeetingClearAllBtn) {
    editMeetingClearAllBtn.addEventListener("click", function () {
      selectedEditMeetingFiles = [];
      renderEditMeetingFilePreview();
    });
  }

  renderEditMeetingFilePreview();
}

function renderEditMeetingFilePreview() {
  if (typeof editMeetingFilePreview === "undefined" || !editMeetingFilePreview) return;
  editMeetingFilePreview.innerHTML = "";
  const clearBtn = editMeetingClearAllBtn;

  const total = (existingEditMeetingFiles ? existingEditMeetingFiles.length : 0) + (selectedEditMeetingFiles ? selectedEditMeetingFiles.length : 0);
  if (total === 0) {
    editMeetingFilePreview.innerHTML = "<span>Belum ada file terpilih</span>";
    if (clearBtn) clearBtn.style.display = "none";
    return;
  }

  // existing meeting files first
  existingEditMeetingFiles.forEach((ef, idx) => {
    const div = document.createElement("div");
    div.className = "file-chip existing";
    const nameSpan = document.createElement("span");
    nameSpan.className = "file-name-text";
    nameSpan.textContent = ef.name || ef.filename || ef;
    const sizeSpan = document.createElement("span");
    sizeSpan.className = "file-size-text";
    sizeSpan.textContent = ef.size ? ` (${Math.round(ef.size / 1024)} KB)` : "";
    div.appendChild(nameSpan);
    div.appendChild(sizeSpan);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remove-edit-meeting-file-btn";
    btn.dataset.idx = idx;
    btn.dataset.existing = "true";
    btn.textContent = "×";
    div.appendChild(btn);

    editMeetingFilePreview.appendChild(div);
  });

  // newly selected meeting files
  selectedEditMeetingFiles.forEach((file, idx) => {
    const div = document.createElement("div");
    div.className = "file-chip";
    const nameSpan = document.createElement("span");
    nameSpan.className = "file-name-text";
    nameSpan.textContent = file.name;
    const sizeSpan = document.createElement("span");
    sizeSpan.className = "file-size-text";
    sizeSpan.textContent = ` (${Math.round(file.size / 1024)} KB)`;
    div.appendChild(nameSpan);
    div.appendChild(sizeSpan);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remove-edit-meeting-file-btn";
    btn.dataset.idx = idx;
    btn.dataset.existing = "false";
    btn.textContent = "×";
    div.appendChild(btn);

    editMeetingFilePreview.appendChild(div);
  });

  if (clearBtn) clearBtn.style.display = "inline-block";
}

// Delegated click handlers for per-file delete buttons (schedule / meeting / edit)
(function attachPerFileRemoveHandlers() {
  // schedule (reminder) preview
  const customPreview = document.getElementById("customFilePreview");
  if (customPreview) {
    customPreview.addEventListener("click", function (e) {
      const btn = e.target.closest("button.remove-file-btn");
      if (!btn) return;
      const idx = Number(btn.dataset.idx);
      if (!Number.isNaN(idx) && Array.isArray(selectedFiles)) {
        selectedFiles.splice(idx, 1);
        if (typeof renderFilePreview === "function") renderFilePreview();
      }
    });
  }

  // meeting preview
  const meetingPreview = document.getElementById("meetingFileNames");
  if (meetingPreview) {
    meetingPreview.addEventListener("click", function (e) {
      const btn = e.target.closest("button.remove-meeting-file-btn");
      if (!btn) return;
      const idx = Number(btn.dataset.idx);
      if (!Number.isNaN(idx) && Array.isArray(selectedMeetingFiles)) {
        selectedMeetingFiles.splice(idx, 1);
        if (typeof renderMeetingFilePreview === "function")
          renderMeetingFilePreview();
      }
    });
  }

  // edit-meeting preview
  const editMeetingPreview =
    document.getElementById("edit-meetingFileNames") ||
    document.getElementById("edit-fileNames");
  if (editMeetingPreview) {
    editMeetingPreview.addEventListener("click", function (e) {
      const btn = e.target.closest("button.remove-edit-meeting-file-btn");
      if (!btn) return;
      const idx = Number(btn.dataset.idx);
      if (!Number.isNaN(idx) && Array.isArray(selectedEditMeetingFiles)) {
        selectedEditMeetingFiles.splice(idx, 1);
        if (typeof renderEditMeetingFilePreview === "function")
          renderEditMeetingFilePreview();
      }
    });
  }
})();

// On edit meeting form submit, append files from selectedEditMeetingFiles inside handler
document.addEventListener("submit", function (e) {
  if (e.target && e.target.id === "editMeetingForm") {
    e.preventDefault();
    // build formData here and include selectedEditMeetingFiles
    const form = e.target;
    const formData = new FormData(form);
    formData.delete("files");
    selectedEditMeetingFiles.forEach((f) => formData.append("files", f));
    // call your async submit handler (already exists)
    handleMeetingFormSubmit({
      preventDefault: () => {},
      target: form,
      _formData: formData,
    });
    // Note: handleMeetingFormSubmit currently expects Event; you can adapt it to accept formData or create a new helper to POST formData
  }
});

// --------- INIT ON MODAL OPEN ---------
function afterEditMeetingModalOpen() {
  initEditMeetingFileLogic();
}

// Update delegated click handler to handle removal of existing vs new edit files
document.addEventListener("click", function (e) {
  // remove in edit-message preview (remove-file-btn)
  const remBtn = e.target.closest("button.remove-file-btn");
  if (remBtn && document.getElementById("edit-fileNames") && document.getElementById("edit-fileNames").contains(remBtn)) {
    const isExisting = remBtn.dataset.existing === "true";
    const idx = Number(remBtn.dataset.idx);
    if (isExisting) {
      // move existing file to removedExistingEditFiles
      const removed = existingEditFiles.splice(idx, 1);
      if (removed && removed[0]) removedExistingEditFiles.push(removed[0].name || removed[0].filename || removed[0]);
    } else {
      // remove from newly selected edit files
      selectedEditFiles.splice(idx, 1);
    }
    renderEditFilePreview();
    return;
  }

  // remove in edit-meeting preview
  const editMeetBtn = e.target.closest("button.remove-edit-meeting-file-btn");
  if (editMeetBtn && document.getElementById("edit-meetingFileNames") && document.getElementById("edit-meetingFileNames").contains(editMeetBtn)) {
    const isExisting = editMeetBtn.dataset.existing === "true";
    const idx = Number(editMeetBtn.dataset.idx);
    if (isExisting) {
      const removed = existingEditMeetingFiles.splice(idx, 1);
      if (removed && removed[0]) removedExistingEditMeetingFiles.push(removed[0].name || removed[0].filename || removed[0]);
    } else {
      selectedEditMeetingFiles.splice(idx, 1);
    }
    renderEditMeetingFilePreview();
    return;
  }

  // remove-edit-files for edit reminder (buttons created with class remove-file-btn)
  const remEditBtn = e.target.closest("button.remove-file-btn");
  if (remEditBtn && document.getElementById("edit-fileNames")) {
    const idx = Number(remEditBtn.dataset.idx);
    if (!Number.isNaN(idx) && Array.isArray(selectedFiles)) {
      selectedFiles.splice(idx, 1);
      if (typeof renderFilePreview === "function") renderFilePreview();
    }
  }
});

document.addEventListener("click", function (e) {
  const label = e.target.closest && e.target.closest(".file-upload-label");
  if (!label) return;
  const inputId = (label.dataset && label.dataset.input) || label.getAttribute("data-input");
  if (!inputId) return;
  const input = document.getElementById(inputId);
  if (input) {
    // allow default focus behavior then open file picker
    input.focus();
    input.click();
  }
});


// simpan nomor aktif saat user memilih percakapan
// pastikan kamu set ini di handler ketika user klik sebuah chat
window.activeChatNumber = window.activeChatNumber || null;

// Jalankan aplikasi ketika DOM siap
document.addEventListener("DOMContentLoaded", initApp);
