// main.js - Main Application Entry Point dengan Enhanced Tab System

// SESUDAH (tambahkan fungsi detail grup):
import {
  showForm as showFormOriginal,
  showEditModal,
  closeEditModal,
  showMediaModal,
  closeMediaModal,
  formatTimeDifference,
  closeEditContactModal,
  showEditGroupModal,
  closeEditGroupModal,
  showDetailGroupModal,      
  closeDetailGroupModal,      
  closeAddMembersModal        
} from './ui-helpers.js';

function showForm(formId) {
  showFormOriginal(formId);
  
  if (formId === "contacts") {
    fetchAndRenderContacts();
    const contactMainContainer = document.getElementById("contactMainContainer");
    const groupMainContainer = document.getElementById("groupMainContainer");
    if (contactMainContainer) contactMainContainer.style.display = "flex";
    if (groupMainContainer) groupMainContainer.style.display = "none";
  }
  if (formId === "group") {
    fetchAndRenderGroups();
    const contactMainContainer = document.getElementById("contactMainContainer");
    const groupMainContainer = document.getElementById("groupMainContainer");
    if (contactMainContainer) contactMainContainer.style.display = "none";
    if (groupMainContainer) groupMainContainer.style.display = "flex";
  }
  if (formId === "meeting") {
    renderMeetingContactList();
    renderMeetingGroupSelectionList();
    initMeetingFormTabs();
  }
  if (formId === "message") {
    renderContactList();
    renderGroupSelectionList();
    initMessageFormTabs();
  }
  if (formId === "chat") {
    const { getChatConversations } = window.chatModule || {};
    if (getChatConversations) {
      // Load conversations when chat tab is shown
    }
  }
}

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
  selectedMeetingNumbers,
  selectedGroups,
  selectedMeetingGroups,
  fetchGroupsForDropdown,
  renderGroupSelectionList,
  renderMeetingGroupSelectionList,
  getNumbersFromSelectedGroups,
  initMessageFormTabs,
  initMeetingFormTabs
} from './contact-manager.js';

// SESUDAH:
import { 
  fetchAndRenderGroups, 
  showGroupDetail,        
  deleteGroup, 
  handleGroupFormSubmit,
  resetGroupForm,
  initGroupFormListeners,
  renderGroupContactChecklist,
  closeAddMembersModal as closeAddMembersFromManager  
} from './group-manager.js';

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

import { 
  initChatSystem,
  getCurrentChatNumber,
  getChatConversations,
  getUnreadCount
} from './chat-client.js';

// SESUDAH:
window.groupModule = {
  fetchAndRenderGroups,
  showGroupDetail,       
  deleteGroup,
  resetGroupForm,
  renderGroupContactChecklist
};

window.contactModule = {
  showEditContactForm,
  deleteContact
};

window.showForm = showForm;
window.showEditModal = showEditModal;
window.closeEditModal = closeEditModal;
window.showMediaModal = showMediaModal;
window.closeMediaModal = closeMediaModal;
window.showEditContactForm = showEditContactForm;
window.deleteContact = deleteContact;
window.closeEditContactModal = closeEditContactModal;
window.showEditGroupModal = showEditGroupModal;
window.closeEditGroupModal = closeEditGroupModal;
window.showDetailGroupModal = showDetailGroupModal;
window.closeDetailGroupModal = closeDetailGroupModal;
window.closeAddMembersModal = closeAddMembersModal;
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
      filePreview.innerHTML = "<span style='color: #718096; font-size: 13px;'>Tidak ada file terpilih</span>";
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
      meetingFilePreview.innerHTML = "<span style='color: #718096; font-size: 13px;'>Belum ada file terpilih</span>";
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

    // Ambil nomor dari kontak individual
    const selectedContactNumbers = Array.from(selectedNumbers);
    
    // Ambil nomor dari grup yang dipilih
    const groupNumbers = getNumbersFromSelectedGroups(false);
    
    // Ambil nomor manual
    const manualNumbers = manualInput.split(",").map((num) => num.trim()).filter((num) => num !== "");
    
    // Gabungkan semua nomor (hapus duplikat)
    const allNumbersSet = new Set([...selectedContactNumbers, ...groupNumbers, ...manualNumbers]);
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
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Mohon isi pesan atau pilih minimal satu file yang ingin dikirim.",
        confirmButtonColor: "#2b6cb0"
      });
      return;
    }

    if (finalNumbers.length === 0) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Mohon pilih minimal satu kontak, grup, atau masukkan nomor manual.",
        confirmButtonColor: "#2b6cb0"
      });
      return;
    }

    const regexPattern = /^(0|62)\d{8,13}$/;
    const invalidNumbersFrontend = finalNumbers.filter((n) => !regexPattern.test(n));

    if (invalidNumbersFrontend.length > 0) {
      Swal.fire({
        icon: "error",
        title: "Format Nomor Tidak Valid",
        html: `
          <p>Format nomor tidak valid:</p>
          <strong>${invalidNumbersFrontend.join(", ")}</strong>
          <p style="margin-top: 10px; color: #718096;">Pastikan format 08xxxxxxxxxx atau 628xxxxxxxxxx</p>
        `,
        confirmButtonColor: "#2b6cb0"
      });
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
      // Add loading class to button
      if (submitButton) {
        submitButton.classList.add('loading');
        submitButton.disabled = true;
      }

      Swal.fire({
        title: '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...',
        html: '<p style="color: #718096;">Mohon tunggu, sedang menjadwalkan pesan...</p>',
        allowOutsideClick: false,
        showConfirmButton: false,
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
        await Swal.fire({
          icon: "success",
          title: isEditing ? "✅ Jadwal Diupdate!" : "✅ Pesan Terjadwal!",
          html: `
            <div style="text-align: left; padding: 10px;">
              <p><strong>📊 Jumlah Penerima:</strong> <span class="badge badge-primary">${finalNumbers.length} nomor</span></p>
              <p><strong>💬 Pesan:</strong> ${message ? message : '<em style="color: #a0aec0;">(Tanpa Pesan Teks)</em>'}</p>
              <p><strong>⏰ Waktu Kirim:</strong> ${new Date(datetime).toLocaleString("id-ID")}</p>
            </div>
          `,
          confirmButtonColor: "#48bb78",
          confirmButtonText: '<i class="fa-solid fa-check"></i> OK'
        });

        this.reset();
        selectedNumbers.clear();
        selectedGroups.clear();
        renderContactList();
        renderGroupSelectionList();

        setSelectedFiles([]);
        const fileInputEl = document.getElementById("fileUpload");
        if (fileInputEl) fileInputEl.value = "";

        const filePreview = document.getElementById("customFilePreview");
        if (filePreview) {
          filePreview.innerHTML = "<span style='color: #718096; font-size: 13px;'>Tidak ada file terpilih</span>";
        }

        const clearAllBtn = document.getElementById("clearAllFilesBtn");
        if (clearAllBtn) {
          clearAllBtn.style.display = "none";
        }
        
        if (submitButton) {
          delete submitButton.dataset.editId;
          submitButton.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Kirim Pesan';
        }
        
        const manualNumbersInput = document.getElementById("manualNumbers");
        if (manualNumbersInput) {
          manualNumbersInput.value = "";
        }

        renderScheduleTable();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        Swal.fire({
          icon: "error",
          title: "❌ Gagal",
          text: text,
          confirmButtonColor: "#fc8181"
        });
      }
    } catch (err) {
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "❌ Koneksi Gagal",
        text: "Tidak dapat terhubung ke server. Silakan coba lagi.",
        confirmButtonColor: "#fc8181"
      });
      console.error(err);
    } finally {
      // Remove loading class from button
      if (submitButton) {
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
      }
    }
  });
}

/**
 * Initializes meeting form
 */
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

    // Ambil nomor dari kontak individual
    const selectedContactNumbers = Array.from(selectedMeetingNumbers);
    
    // Ambil nomor dari grup yang dipilih
    const groupNumbers = getNumbersFromSelectedGroups(true);
    
    // Ambil nomor manual
    const manualNumbers = manualInput.split(",").map((num) => num.trim()).filter((num) => num);
    
    // Gabungkan semua nomor (hapus duplikat)
    const allNumbers = [...new Set([...selectedContactNumbers, ...groupNumbers, ...manualNumbers])];

    if (!title || allNumbers.length === 0 || !room || !startTime || !endTime) {
      Swal.fire({
        icon: "error",
        title: "Data Tidak Lengkap",
        text: "Judul, Peserta, Ruangan, dan Waktu harus diisi.",
        confirmButtonColor: "#2b6cb0"
      });
      return;
    }

    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);
    if (endDateTime <= startDateTime) {
      Swal.fire({
        icon: "error",
        title: "Waktu Tidak Valid",
        text: "Waktu selesai harus lebih besar dari waktu mulai.",
        confirmButtonColor: "#2b6cb0"
      });
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
      // Add loading state
      if (submitButton) {
        submitButton.classList.add('loading');
        submitButton.disabled = true;
      }

      Swal.fire({
        title: '<i class="fa-solid fa-spinner fa-spin"></i> ' + (isEditing ? "Mengupdate Rapat..." : "Menjadwalkan Rapat..."),
        html: '<p style="color: #718096;">Mohon tunggu, sedang memproses...</p>',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });

      const res = await fetch(url, {
        method: method,
        body: formData,
      });

      const result = await res.json();
      Swal.close();

      if (res.ok && result.success) {
        await Swal.fire({
          icon: "success",
          title: isEditing ? "✅ Jadwal Rapat Diupdate!" : "✅ Jadwal Rapat Terbuat!",
          html: `
            <div style="text-align: left; padding: 10px;">
              <p><strong>👥 Jumlah Peserta:</strong> <span class="badge badge-primary">${allNumbers.length} nomor</span></p>
              <p><strong>📋 Judul:</strong> ${title}</p>
              <p><strong>🏢 Ruangan:</strong> ${room}</p>
              <p><strong>🕐 Waktu:</strong> ${startDateTime.toLocaleString("id-ID")} - ${endDateTime.toLocaleString("id-ID", { timeStyle: "short" })}</p>
            </div>
          `,
          confirmButtonColor: "#48bb78",
          confirmButtonText: '<i class="fa-solid fa-check"></i> OK'
        });

        this.reset();
        if (submitButton) {
          delete submitButton.dataset.editId;
          submitButton.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Jadwalkan Rapat';
        }
        selectedMeetingNumbers.clear();
        selectedMeetingGroups.clear();
        renderMeetingContactList();
        renderMeetingGroupSelectionList();
        
        setSelectedMeetingFiles([]);
        const meetingFileInputEl = document.getElementById("meetingFileUpload");
        if (meetingFileInputEl) meetingFileInputEl.value = "";

        const meetingFilePreview = document.getElementById("meetingFileNames");
        if (meetingFilePreview) {
          meetingFilePreview.innerHTML = "<span style='color: #718096; font-size: 13px;'>Belum ada file terpilih</span>";
        }

        const meetingClearAllBtn = document.getElementById("clearAllMeetingFilesBtn");
        if (meetingClearAllBtn) {
          meetingClearAllBtn.style.display = "none";
        }

        renderScheduleTable();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        Swal.fire({
          icon: "error",
          title: "❌ Gagal",
          text: result.message || "Terjadi kesalahan",
          confirmButtonColor: "#fc8181"
        });
      }
    } catch (err) {
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "❌ Koneksi Gagal",
        text: "Tidak dapat terhubung ke server. Silakan coba lagi.",
        confirmButtonColor: "#fc8181"
      });
      console.error(err);
    } finally {
      if (submitButton) {
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
        const isStillEditing = !!(submitButton ? submitButton.dataset.editId : null);
        submitButton.innerHTML = isStillEditing 
          ? '<i class="fa-solid fa-calendar-check"></i> Update Jadwal Rapat' 
          : '<i class="fa-solid fa-calendar-check"></i> Jadwalkan Rapat';
      }
    }
  });
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

function initSmoothAnimations() {
  // Add fade-in animation to form when it becomes active
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animation = 'fadeInContent 0.4s ease';
      }
    });
  }, { threshold: 0.1 });

  // Observe all form containers
  document.querySelectorAll('.form-content').forEach(form => {
    observer.observe(form);
  });

  // Add ripple effect to buttons
  document.addEventListener('click', function(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 50%;
      transform: scale(0);
      animation: rippleEffect 0.6s ease-out;
      pointer-events: none;
    `;

    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  });

  // Add CSS for ripple animation
  if (!document.getElementById('ripple-animation-style')) {
    const style = document.createElement('style');
    style.id = 'ripple-animation-style';
    style.textContent = `
      @keyframes rippleEffect {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}



/**
 * Initializes afterEditMeetingModalOpen helper
 */
window.afterEditMeetingModalOpen = function() {
  // This function is called after edit meeting modal opens
  // Additional initialization can be added here if needed
};

function initRealtimeScheduleUpdates() {
  console.log("🔌 Connecting to real-time schedule updates...");
  
  const socket = io();

  // ✅ Listen untuk schedule status update dari server
  socket.on('schedule-status-updated', (data) => {
    console.log('📡 Schedule status updated:', data);
    
    const { scheduleId, newStatus, message } = data;
    
    // Update status di UI secara real-time
    updateScheduleStatusInTable(scheduleId, newStatus);
    
    // Optional: Show notification
    if (newStatus === 'terkirim') {
      showNotification('✅ Pesan Terkirim', message || `Jadwal #${scheduleId} telah terkirim`, 'success');
    } else if (newStatus === 'gagal') {
      showNotification('❌ Pesan Gagal', message || `Jadwal #${scheduleId} gagal terkirim`, 'error');
    }
  });

  // ✅ Listen untuk meeting status update
  socket.on('meeting-status-updated', (data) => {
    console.log('📡 Meeting status updated:', data);
    
    const { scheduleId, newStatus, message } = data;
    updateScheduleStatusInTable(scheduleId, newStatus);
    
    if (newStatus === 'selesai') {
      showNotification('✅ Rapat Selesai', message || `Rapat #${scheduleId} telah selesai`, 'success');
    } else if (newStatus === 'dibatalkan') {
      showNotification('⚠️ Rapat Dibatalkan', message || `Rapat #${scheduleId} dibatalkan`, 'warning');
    }
  });

  // ✅ Listen untuk schedule created (jadwal baru ditambahkan)
  socket.on('schedule-created', (data) => {
    console.log('📡 New schedule created:', data);
    // Refresh table untuk tampilkan jadwal baru
    renderScheduleTable();
  });

  // ✅ Listen untuk schedule deleted
  socket.on('schedule-deleted', (data) => {
    console.log('📡 Schedule deleted:', data);
    const { scheduleId } = data;
    removeScheduleFromTable(scheduleId);
  });

  // ✅ Connection status
  socket.on('connect', () => {
    console.log('✅ Real-time connection established');
  });

  socket.on('disconnect', () => {
    console.log('⚠️ Real-time connection lost, reconnecting...');
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(`✅ Reconnected after ${attemptNumber} attempts`);
    // Refresh data setelah reconnect
    renderScheduleTable();
  });

  // Store socket globally untuk digunakan di tempat lain
  window.scheduleSocket = socket;
}

/**
 * Update status di table tanpa full refresh (SMOOTH!)
 */
/**
 * Update status di table tanpa full refresh (SMOOTH!)
 * ✅ Update status column + action buttons dynamically
 */
function updateScheduleStatusInTable(scheduleId, newStatus) {
  const row = document.querySelector(`#scheduleTable tbody tr[data-id="${scheduleId}"]`);
  if (!row) return;

  const statusCell = row.cells[4]; // Kolom status
  const actionCell = row.cells[5]; // Kolom tombol aksi
  
  if (!statusCell || !actionCell) return;

  // Get schedule data from memory
  const schedules = getSchedules();
  const schedule = schedules.find(s => s.id == scheduleId);
  
  if (!schedule) {
    console.warn(`Schedule ${scheduleId} not found in memory`);
    return;
  }

  // Update schedule status in memory
  schedule.status = newStatus;

  // ============================================
  // 1. UPDATE STATUS COLUMN
  // ============================================
  const statusConfig = {
    'terkirim': { 
      icon: 'check_circle', 
      text: 'Terkirim', 
      class: 'status-terkirim',
      color: '#48bb78'
    },
    'gagal': { 
      icon: 'cancel', 
      text: 'Gagal', 
      class: 'status-gagal',
      color: '#f56565'
    },
    'dibatalkan': { 
      icon: 'block', 
      text: 'Dibatalkan', 
      class: 'status-dibatalkan',
      color: '#718096'
    },
    'selesai': { 
      icon: 'done_all', 
      text: 'Selesai', 
      class: 'status-selesai',
      color: '#4299e1'
    },
    'terjadwal': { 
      icon: 'hourglass_empty', 
      text: 'Terjadwal', 
      class: 'status-terjadwal',
      color: '#ed8936'
    }
  };

  const config = statusConfig[newStatus] || statusConfig['terjadwal'];

  // ✅ Smooth transition for status cell
  statusCell.style.transition = "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
  statusCell.style.transform = "scale(0.95)";
  statusCell.style.opacity = "0.3";

  setTimeout(() => {
    // Update status content
    statusCell.innerHTML = `<i class="material-icons" title="${config.text}">${config.icon}</i> ${config.text}`;
    statusCell.className = config.class;
    
    // Animate back with bounce
    statusCell.style.transform = "scale(1.05)";
    statusCell.style.opacity = "1";
    
    // Add highlight effect
    statusCell.style.boxShadow = `0 0 0 3px ${config.color}33`;
    
    setTimeout(() => {
      statusCell.style.transform = "scale(1)";
      statusCell.style.boxShadow = "none";
    }, 300);
  }, 200);

  // ============================================
  // 2. UPDATE ACTION BUTTONS - NEW! 🎯
  // ============================================
  const isMeeting = schedule.type === "meeting" || schedule.meetingRoom;
  
  // ✅ Smooth transition for action cell
  actionCell.style.transition = "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
  actionCell.style.opacity = "0.3";
  actionCell.style.transform = "translateY(-5px)";

  setTimeout(() => {
    // Generate new action buttons based on status
    actionCell.innerHTML = generateActionButtons(schedule, newStatus, isMeeting);
    
    // Animate back
    actionCell.style.opacity = "1";
    actionCell.style.transform = "translateY(0)";
    
    // 🔥 PENTING: Re-attach event listeners untuk tombol baru
    reattachActionButtonListeners(actionCell);
    
  }, 200);
}

/**
 * Generate HTML untuk action buttons berdasarkan status
 */
function generateActionButtons(schedule, status, isMeeting) {
  let actionButtons = "";
  
  if (isMeeting) {
    // Meeting action buttons
    switch (status) {
      case "terjadwal":
        const fileData = schedule.filesData && schedule.filesData.length > 0
          ? JSON.stringify(schedule.filesData)
          : schedule.file || schedule.meetingFile || "";
        
        actionButtons = `
          <button class="edit-btn" data-id="${schedule.id}" 
                  data-type="meeting" 
                  data-meetingroom="${schedule.meetingRoom || ''}"
                  data-meetingtitle="${schedule.meetingTitle || schedule.message || ""}"
                  data-starttime="${schedule.scheduledTime || ''}"
                  data-endtime="${schedule.meetingEndTime || schedule.endTime || ''}"
                  data-numbers="${escape(JSON.stringify(schedule.numbers || schedule.originalNumbers || []))}"
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
    // Regular message action buttons
    switch (status) {
      case "terjadwal":
        actionButtons = `
          <button class="edit-btn" data-id="${schedule.id}" 
                  data-type="message"
                  data-message="${escape(schedule.message || "")}"
                  data-datetime="${schedule.scheduledTime || ''}"
                  data-filesdata="${escape(JSON.stringify(schedule.filesData || []))}">
            <i class="material-icons">edit</i> Edit
          </button>
          <button class="cancel-btn" data-id="${schedule.id}">
            <i class="material-icons">delete</i> Batal
          </button>
        `;
        break;
        
      case "terkirim":
      case "gagal":
      case "dibatalkan":
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
  
  return actionButtons;
}

/**
 * Re-attach event listeners to dynamically created action buttons
 * 🎯 INI KUNCI UTAMANYA! Tombol baru perlu event listener baru
 */
function reattachActionButtonListeners(actionCell) {
  // Import functions dari schedule-manager.js
  const { renderScheduleTable } = window;
  
  // Edit button
  const editBtn = actionCell.querySelector('.edit-btn');
  if (editBtn) {
    editBtn.onclick = handleEditButtonClick;
  }

  // Cancel meeting button
  const cancelMeetingBtn = actionCell.querySelector('.cancel-meeting-btn');
  if (cancelMeetingBtn) {
    cancelMeetingBtn.onclick = handleCancelMeetingClick;
  }

  // Finish meeting button
  const finishMeetingBtn = actionCell.querySelector('.finish-meeting-btn');
  if (finishMeetingBtn) {
    finishMeetingBtn.onclick = handleFinishMeetingClick;
  }

  // Delete meeting button
  const deleteMeetingBtn = actionCell.querySelector('.delete-meeting-btn');
  if (deleteMeetingBtn) {
    deleteMeetingBtn.onclick = handleDeleteMeetingClick;
  }

  // Cancel schedule button (for regular messages)
  const cancelBtn = actionCell.querySelector('.cancel-btn');
  if (cancelBtn) {
    cancelBtn.onclick = handleCancelScheduleClick;
  }

  // Delete history button
  const deleteHistoryBtn = actionCell.querySelector('.delete-history-btn');
  if (deleteHistoryBtn) {
    deleteHistoryBtn.onclick = handleDeleteHistoryClick;
  }
}

/**
 * Event Handlers untuk semua tombol aksi
 */
async function handleEditButtonClick() {
  const id = this.dataset.id;
  const type = this.dataset.type;
  const isMeeting = type === "meeting";

  const schedules = getSchedules();
  const scheduleToEdit = schedules.find((s) => s.id == id);
  
  if (!scheduleToEdit) {
    Swal.fire("Error", "Data jadwal tidak ditemukan", "error");
    return;
  }

  const modalBody = document.getElementById("editModalBody");

  if (isMeeting) {
    window.showEditModal("Edit Jadwal Rapat");
    // Anda bisa copy logic dari attachScheduleActionListeners di schedule-manager.js
    console.log("Edit meeting:", id);
    // TODO: Populate meeting edit form
  } else {
    window.showEditModal("Edit Jadwal Pesan");
    console.log("Edit message:", id);
    // TODO: Populate message edit form
  }
  
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function handleCancelMeetingClick() {
  const id = this.dataset.id;
  const result = await Swal.fire({
    title: "Anda yakin?",
    text: "Rapat ini akan dibatalkan!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Ya, batalkan!",
    cancelButtonText: "Tidak",
  });
  
  if (result.isConfirmed) {
    try {
      const res = await fetch(`/cancel-meeting/${id}`, { method: "PUT" });
      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire("Dibatalkan!", data.message, "success");
        renderScheduleTable();
      } else {
        Swal.fire("Gagal!", data.message || "Gagal membatalkan rapat", "error");
      }
    } catch (error) {
      console.error("Error canceling meeting:", error);
      Swal.fire("Gagal!", "Terjadi kesalahan saat membatalkan rapat.", "error");
    }
  }
}

async function handleFinishMeetingClick() {
  const id = this.dataset.id;
  const result = await Swal.fire({
    title: "Tandai Rapat Selesai?",
    text: "Rapat ini akan ditandai sebagai selesai",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#28a745",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Ya, selesai!",
    cancelButtonText: "Batal",
  });
  
  if (result.isConfirmed) {
    try {
      const res = await fetch(`/finish-meeting/${id}`, { method: "PUT" });
      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire("Selesai!", data.message, "success");
        renderScheduleTable();
      } else {
        Swal.fire("Gagal!", data.message || "Gagal menandai rapat selesai", "error");
      }
    } catch (error) {
      console.error("Error finishing meeting:", error);
      Swal.fire("Gagal!", "Terjadi kesalahan saat menandai rapat selesai.", "error");
    }
  }
}

async function handleDeleteMeetingClick() {
  const id = this.dataset.id;
  const result = await Swal.fire({
    title: "Anda yakin?",
    text: "Data rapat ini akan dihapus permanen dan tidak bisa dikembalikan!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Ya, hapus!",
    cancelButtonText: "Tidak",
  });
  
  if (result.isConfirmed) {
    try {
      const res = await fetch(`/delete-meeting/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire("Dihapus!", data.message, "success");
        renderScheduleTable();
      } else {
        Swal.fire("Gagal!", data.message || "Gagal menghapus rapat", "error");
      }
    } catch (error) {
      console.error("Error deleting meeting:", error);
      Swal.fire("Gagal!", "Terjadi kesalahan saat menghapus rapat.", "error");
    }
  }
}

async function handleCancelScheduleClick() {
  const id = this.dataset.id;
  const result = await Swal.fire({
    title: "Anda yakin?",
    text: "Jadwal pesan ini akan dibatalkan dan dihapus permanen!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Ya, batalkan!",
    cancelButtonText: "Tidak",
  });
  
  if (result.isConfirmed) {
    try {
      const res = await fetch(`/cancel-schedule/${id}`, { method: "DELETE" });
      const text = await res.text();
      if (res.ok) {
        Swal.fire("Dibatalkan!", text, "success");
        renderScheduleTable();
      } else {
        Swal.fire("Gagal!", text, "error");
      }
    } catch (error) {
      console.error("Error canceling schedule:", error);
      Swal.fire("Gagal!", "Terjadi kesalahan saat membatalkan jadwal.", "error");
    }
  }
}

async function handleDeleteHistoryClick() {
  const id = this.dataset.id;
  const result = await Swal.fire({
    title: "Anda yakin?",
    text: "Riwayat ini akan dihapus permanen dan tidak bisa dikembalikan!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Ya, hapus!",
    cancelButtonText: "Tidak",
  });
  
  if (result.isConfirmed) {
    try {
      const res = await fetch(`/delete-history/${id}`, { method: "DELETE" });
      const text = await res.text();
      if (res.ok) {
        Swal.fire("Dihapus!", text, "success");
        renderScheduleTable();
      } else {
        Swal.fire("Gagal!", text, "error");
      }
    } catch (error) {
      console.error("Error deleting history:", error);
      Swal.fire("Gagal!", "Terjadi kesalahan saat menghapus riwayat.", "error");
    }
  }
}

/**
 * Remove schedule from table with smooth animation
 */
function removeScheduleFromTable(scheduleId) {
  const row = document.querySelector(`#scheduleTable tbody tr[data-id="${scheduleId}"]`);
  if (!row) return;

  // ✅ Smooth fade out before removal
  row.style.transition = "all 0.5s ease";
  row.style.opacity = "0";
  row.style.transform = "translateX(-20px)";

  setTimeout(() => {
    row.remove();
    
    // Update schedules array
    const schedules = getSchedules();
    const index = schedules.findIndex(s => s.id == scheduleId);
    if (index !== -1) {
      schedules.splice(index, 1);
    }

    // Check if table is empty
    const tbody = document.querySelector("#scheduleTable tbody");
    if (tbody && tbody.children.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">Belum ada jadwal untuk filter ini.</td></tr>';
    }
  }, 500);
}

/**
 * Show notification (optional, untuk feedback ke user)
 */
function showNotification(title, message, type = 'info') {
  // Gunakan Toast notification yang ringan
  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <strong>${title}</strong>
      <p>${message}</p>
    </div>
  `;
  
  // Styling
  const bgColors = {
    success: '#48bb78',
    error: '#f56565',
    warning: '#ed8936',
    info: '#4299e1'
  };
  
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${bgColors[type] || bgColors.info};
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    max-width: 350px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  document.body.appendChild(toast);

  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
/**
 * Main application initialization - OPTIMIZED VERSION
 */
async function initApp() {
  console.log("🚀 Initializing app...");

  // Initialize contact management
  initContactListeners();
  
  // Initialize file uploads
  initFileUploadListener();
  initMeetingFileUploadListener();
  initFileUploadLabelHandlers();
  
  // Initialize schedule management
  initFilterButtons();
  initReminderForm();
  initMeetingForm();
  initMeetingContactListeners();
  
  // Initialize media modal
  initMediaModalListeners();

  initRealtimeScheduleUpdates();

  // Contact CRUD form
  const contactForm = document.getElementById("contact-crud-form");
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      await handleContactFormSubmit(e);
      await fetchGroupsForDropdown();
      window.groupModule.renderGroupContactChecklist(); 
    });
  }

  // Group CRUD form
  const groupForm = document.getElementById("group-crud-form");
  if (groupForm) {
    groupForm.addEventListener("submit", handleGroupFormSubmit); 
  }

  // Group Cancel listener
  const groupCancelBtn = document.getElementById("group-crud-cancel");
  if (groupCancelBtn) {
    groupCancelBtn.addEventListener("click", resetGroupForm);
  }
  
  // Initialize group form listeners (search, select all)
  initGroupFormListeners();

  const contactCancelBtn = document.getElementById("contact-crud-cancel");
  if (contactCancelBtn) {
    contactCancelBtn.addEventListener("click", resetContactCrudForm);
  }

  // Load initial data
  console.log("📊 Loading initial data...");
  
  try {
    // Fetch groups first, then contacts
    await fetchAndRenderGroups();
    await fetchGroupsForDropdown();
    await fetchAndRenderContacts();
    
    // After contacts are loaded, render the contact lists
    renderContactList();
    renderMeetingContactList();
    renderGroupSelectionList();
    renderMeetingGroupSelectionList();
    window.groupModule.renderGroupContactChecklist(); 
    
    // Initialize tab systems after data is loaded
    initMessageFormTabs();
    initMeetingFormTabs();
    
    console.log("✅ Initial data loaded successfully");
  } catch (error) {
    console.error("❌ Error loading initial data:", error);
  }
  
  loadMeetingRooms();
  updateFilterButtonActiveState("all");
  renderScheduleTable();

  // Initialize chat system
  console.log("💬 Initializing chat system...");
  initChatSystem();

  initSmoothAnimations();

  // ✅ FIX: Start periodic updates dengan interval yang lebih optimal
  // Update countdown setiap detik (smooth, tidak touch status column)
  setInterval(updateCountdownTimers, 1000);
  

  console.log("✅ App initialization complete");
  console.log("🎨 Enhanced UI with tab system active");
  console.log("⚡ Optimized refresh: countdown 1s, table 30s");
}

window.showForm = showForm;
window.updateScheduleStatusInTable = updateScheduleStatusInTable;
window.removeScheduleFromTable = removeScheduleFromTable;
window.showNotification = showNotification;

document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('click', function(e) {
    // Detail Group Modal
    const detailModal = document.getElementById('detailGroupModal');
    if (detailModal && e.target === detailModal) {
      closeDetailGroupModal();
    }
    
    // Add Members Modal
    const addMembersModal = document.getElementById('addMembersModal');
    if (addMembersModal && e.target === addMembersModal) {
      closeAddMembersModal();
    }
  });
});
// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", initApp);
