// main.js - Main Application Entry Point

// Import UI helpers
import {
  showForm as showFormOriginal,
  showEditModal,
  closeEditModal,
  showMediaModal,
  closeMediaModal,
  formatTimeDifference,
  closeEditContactModal // <-- TAMBAHKAN BARIS INI
} from './ui-helpers.js';

/**
 * Wrapper for showForm to handle additional logic
 */
function showForm(formId) {
  showFormOriginal(formId);
  
  // Additional logic after showing form
  if (formId === "contacts") {
    fetchAndRenderContacts();
  }
  if (formId === "meeting") {
    renderMeetingContactList();
  }
  if (formId === "chat") {
    // Chat initialization is handled by initChatSystem
    const { getChatConversations } = window.chatModule || {};
    if (getChatConversations) {
      // Load conversations when chat tab is shown
    }
  }
}

// Import contact manager
import { 
  fetchAndRenderContacts,
  showEditContactForm,
  resetContactCrudForm,
  deleteContact,
  handleContactFormSubmit,
  renderContactList,
  renderMeetingContactList,
  initContactListeners,
  initMeetingContactListeners,
  selectedNumbers,
  selectedMeetingNumbers
} from './contact-manager.js';

// Import schedule manager
import { 
  renderScheduleTable,
  updateCountdownTimers,
  initFilterButtons,
  updateFilterButtonActiveState,
  loadMeetingRooms,
  getSchedules,
  selectedFiles,
  selectedMeetingFiles,
  setSelectedFiles,
  setSelectedMeetingFiles
} from './schedule-manager.js';

// Import chat client
import { 
  initChatSystem,
  getCurrentChatNumber,
  getChatConversations,
  getUnreadCount
} from './chat-client.js';

// Make functions globally accessible for inline event handlers
window.showForm = showForm;
window.showEditModal = showEditModal;
window.closeEditModal = closeEditModal;
window.showMediaModal = showMediaModal;
window.closeMediaModal = closeMediaModal;
window.showEditContactForm = showEditContactForm;
window.deleteContact = deleteContact;
window.closeEditContactModal = closeEditContactModal; 
/**
 * Initializes file upload listener for message form
 */
function initFileUploadListener() {
  const fileInput = document.getElementById("fileUpload");
  const filePreview = document.getElementById("customFilePreview");
  const clearAllBtn = document.getElementById("clearAllFilesBtn");

  if (fileInput && filePreview && clearAllBtn) {
    fileInput.addEventListener("change", function () {
      const currentFiles = selectedFiles || [];
      for (const file of this.files) {
        if (!currentFiles.some((f) => f.name === file.name && f.size === file.size)) {
          currentFiles.push(file);
        }
      }
      setSelectedFiles(currentFiles);
      this.value = "";
      renderFilePreview();
    });

    clearAllBtn.addEventListener("click", function () {
      setSelectedFiles([]);
      renderFilePreview();
    });

    renderFilePreview();
  }

  function renderFilePreview() {
    const currentFiles = selectedFiles || [];
    filePreview.innerHTML = "";
    
    if (currentFiles.length === 0) {
      filePreview.innerHTML = "<span>Tidak ada file terpilih</span>";
      clearAllBtn.style.display = "none";
      return;
    }

    currentFiles.forEach((file, idx) => {
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
      btn.textContent = "×";
      
      // Add click handler directly to button
      btn.onclick = function() {
        const currentFiles = selectedFiles || [];
        currentFiles.splice(idx, 1);
        setSelectedFiles(currentFiles);
        renderFilePreview();
      };
      
      div.appendChild(btn);

      filePreview.appendChild(div);
    });

    clearAllBtn.style.display = "inline-block";
  }
}

/**
 * Initializes meeting file upload listener
 */
function initMeetingFileUploadListener() {
  const meetingFileInput = document.getElementById("meetingFileUpload");
  const meetingFilePreview = document.getElementById("meetingFileNames");

  let meetingClearAllBtn = document.getElementById("clearAllMeetingFilesBtn");
  if (!meetingClearAllBtn && meetingFilePreview) {
    const fileUploadContainer = meetingFilePreview.parentNode;
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
      const currentFiles = selectedMeetingFiles || [];
      for (const file of this.files) {
        if (!currentFiles.some((f) => f.name === file.name && f.size === file.size)) {
          currentFiles.push(file);
        }
      }
      setSelectedMeetingFiles(currentFiles);
      this.value = "";
      renderMeetingFilePreview();
    });

    if (meetingClearAllBtn) {
      meetingClearAllBtn.addEventListener("click", function () {
        setSelectedMeetingFiles([]);
        renderMeetingFilePreview();
      });
    }

    renderMeetingFilePreview();
  }

  function renderMeetingFilePreview() {
    const currentFiles = selectedMeetingFiles || [];
    meetingFilePreview.innerHTML = "";
    
    if (currentFiles.length === 0) {
      meetingFilePreview.innerHTML = "<span>Belum ada file terpilih</span>";
      if (meetingClearAllBtn) meetingClearAllBtn.style.display = "none";
      return;
    }

    currentFiles.forEach((file, idx) => {
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
      
      // Add click handler directly to button
      btn.onclick = function() {
        const currentFiles = selectedMeetingFiles || [];
        currentFiles.splice(idx, 1);
        setSelectedMeetingFiles(currentFiles);
        renderMeetingFilePreview();
      };
      
      div.appendChild(btn);

      meetingFilePreview.appendChild(div);
    });

    if (meetingClearAllBtn) meetingClearAllBtn.style.display = "inline-block";
  }
}

/**
 * Initializes reminder form
 */
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
    const manualNumbers = manualInput.split(",").map((num) => num.trim()).filter((num) => num !== "");
    const allNumbersSet = new Set([...selectedContactNumbers, ...manualNumbers]);
    const finalNumbers = Array.from(allNumbersSet).map((num) => num.replace(/\D/g, "").trim()).filter((num) => num !== "");

    const submitButton = document.querySelector('#reminderForm button[type="submit"]');
    const editId = submitButton ? submitButton.dataset.editId : null;
    const isEditing = !!editId;

    const hasFilesUploaded = uploadedFiles.length > 0;
    const hasMessage = message.length > 0;
    let hasExistingFiles = false;

    if (isEditing) {
      const currentSchedule = getSchedules().find((s) => s.id == editId);
      hasExistingFiles = currentSchedule && currentSchedule.filesData && currentSchedule.filesData.length > 0;
    }

    if (!hasFilesUploaded && !hasMessage && !hasExistingFiles) {
      Swal.fire("Error", "Mohon isi pesan atau pilih minimal satu file yang ingin dikirim.", "error");
      return;
    }

    const regexPattern = /^(0|62)\d{8,13}$/;
    const invalidNumbersFrontend = finalNumbers.filter((n) => !regexPattern.test(n));

    if (invalidNumbersFrontend.length > 0) {
      Swal.fire("Error", `Format nomor tidak valid: ${invalidNumbersFrontend.join(", ")}. Pastikan format 08xxxxxxxxxx atau 628xxxxxxxxxx.`, "error");
      return;
    }

    const formData = new FormData();
    formData.append("numbers", JSON.stringify(finalNumbers));
    formData.append("datetime", datetime);

    if (message) {
      formData.append("message", message);
    }

    const currentFiles = selectedFiles || [];
    if (currentFiles.length > 0) {
      currentFiles.forEach((f) => formData.append("files", f));
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

        this.reset();
        selectedNumbers.clear();
        renderContactList();

        // Reset file arrays dan UI
        setSelectedFiles([]);
        const fileInputEl = document.getElementById("fileUpload");
        if (fileInputEl) fileInputEl.value = "";

        const filePreview = document.getElementById("customFilePreview");
        if (filePreview) {
          filePreview.innerHTML = "<span>Tidak ada file terpilih</span>";
        }

        const clearAllBtn = document.getElementById("clearAllFilesBtn");
        if (clearAllBtn) {
          clearAllBtn.style.display = "none";
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

/**
 * Initializes meeting form
 */
function initMeetingForm() {
  const meetingForm = document.getElementById("addMeetingForm");
  if (!meetingForm) return;

  meetingForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitButton = document.querySelector('#addMeetingForm button[type="submit"]');

    const title = document.getElementById("meetingTitle").value.trim();
    const room = document.getElementById("meetingRoom").value;
    const startTime = document.getElementById("meetingStartTime").value;
    const endTime = document.getElementById("meetingEndTime").value;
    const manualInput = document.getElementById("meetingNumbers").value;

    const selectedContactNumbers = Array.from(selectedMeetingNumbers);
    const manualNumbers = manualInput.split(",").map((num) => num.trim()).filter((num) => num);
    const allNumbers = [...new Set([...selectedContactNumbers, ...manualNumbers])];

    if (!title || allNumbers.length === 0 || !room || !startTime || !endTime) {
      Swal.fire("Error", "Judul, Peserta, Ruangan, dan Waktu harus diisi.", "error");
      return;
    }

    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);
    if (endDateTime <= startDateTime) {
      Swal.fire("Error", "Waktu selesai harus lebih besar dari waktu mulai.", "error");
      return;
    }

    const editId = submitButton ? submitButton.dataset.editId : null;
    const isEditing = !!editId;

    const formData = new FormData();
    formData.append("meetingTitle", title);
    formData.append("meetingRoom", room);
    formData.append("startTime", startTime);
    formData.append("endTime", endTime);
    formData.append("numbers", JSON.stringify(allNumbers));

    const currentFiles = selectedMeetingFiles || [];
    for (const file of currentFiles) {
      formData.append("files", file);
    }

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
        body: formData,
      });

      const result = await res.json();
      Swal.close();

      if (res.ok && result.success) {
        Swal.fire({
          title: isEditing ? "Jadwal Rapat Diupdate!" : "Jadwal Rapat Terbuat!",
          icon: "success",
        });

        this.reset();
        if (submitButton) {
          delete submitButton.dataset.editId;
          submitButton.textContent = "Jadwalkan Rapat";
        }
        selectedMeetingNumbers.clear();
        
        // Reset meeting file arrays dan UI
        setSelectedMeetingFiles([]);
        const meetingFileInputEl = document.getElementById("meetingFileUpload");
        if (meetingFileInputEl) meetingFileInputEl.value = "";

        const meetingFilePreview = document.getElementById("meetingFileNames");
        if (meetingFilePreview) {
          meetingFilePreview.innerHTML = "<span>Belum ada file terpilih</span>";
        }

        const meetingClearAllBtn = document.getElementById("clearAllMeetingFilesBtn");
        if (meetingClearAllBtn) {
          meetingClearAllBtn.style.display = "none";
        }

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
      submitButton.disabled = false;
      const isStillEditing = !!(submitButton ? submitButton.dataset.editId : null);
      submitButton.textContent = isStillEditing ? "Update Jadwal Rapat" : "Jadwalkan Rapat";
    }
  });
}

/**
 * Initializes delegated click handlers for file removal buttons
 */
function initDelegatedFileRemoveHandlers() {
  // This function is now deprecated as we're using direct onclick handlers
  // Keeping it for backward compatibility but it's empty
}

/**
 * Initializes file upload label click handlers
 */
function initFileUploadLabelHandlers() {
  document.addEventListener("click", function (e) {
    const label = e.target.closest && e.target.closest(".file-upload-label");
    if (!label) return;
    const inputId = (label.dataset && label.dataset.input) || label.getAttribute("data-input");
    if (!inputId) return;
    const input = document.getElementById(inputId);
    if (input) {
      input.focus();
      input.click();
    }
  });
}

/**
 * Initializes media modal event listeners
 */
function initMediaModalListeners() {
  const mediaModal = document.getElementById("mediaModal");
  if (mediaModal) {
    mediaModal.addEventListener("click", function (event) {
      if (event.target === mediaModal) {
        closeMediaModal();
      }
    });
  }
}

/**
 * Initializes afterEditMeetingModalOpen helper
 */
window.afterEditMeetingModalOpen = function() {
  // This function is called after edit meeting modal opens
  // Additional initialization can be added here if needed
};

/**
 * Main application initialization
 */
function initApp() {
  console.log("🚀 Initializing app...");

  // Initialize contact management
  initContactListeners();
  
  // Initialize file uploads
  initFileUploadListener();
  initMeetingFileUploadListener();
  initDelegatedFileRemoveHandlers();
  initFileUploadLabelHandlers();
  
  // Initialize schedule management
  initFilterButtons();
  initReminderForm();
  initMeetingForm();
  initMeetingContactListeners();
  
  // Initialize media modal
  initMediaModalListeners();

  const contactTable = document.getElementById("contact-management-table");
  if (contactTable) {
      contactTable.addEventListener('click', function(e) {
          // Cari tombol yang paling dekat dengan target klik
          const target = e.target.closest('button');
          if (!target) return;

          const id = target.dataset.id;
          const name = target.dataset.name;

          // Jika tombol edit kontak yang diklik
          if (target.classList.contains('edit-contact-btn')) {
              const number = target.dataset.number;
              // Panggil fungsi yang benar dari contact-manager.js
              showEditContactForm(id, name, number);
          }

          // Jika tombol hapus kontak yang diklik
          if (target.classList.contains('delete-contact-btn')) {
              // Panggil fungsi yang benar dari contact-manager.js
              deleteContact(id, name);
          }
      });
  }

  // Contact CRUD form
  const contactForm = document.getElementById("contact-crud-form");
  if (contactForm) {
    contactForm.addEventListener("submit", handleContactFormSubmit);
  }

  const contactCancelBtn = document.getElementById("contact-crud-cancel");
  if (contactCancelBtn) {
    contactCancelBtn.addEventListener("click", resetContactCrudForm);
  }

  // Load initial data
  fetchAndRenderContacts().then(() => {
    // After contacts are loaded, render the contact lists
    renderContactList();
    renderMeetingContactList();
  });
  loadMeetingRooms();
  updateFilterButtonActiveState("all");
  renderScheduleTable();

  // Initialize chat system
  console.log("💬 Initializing chat system...");
  initChatSystem();

  // Start periodic updates
  setInterval(updateCountdownTimers, 1000);
  setInterval(renderScheduleTable, 5000);

  console.log("✅ App initialization complete");
}

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", initApp);