// event-handlers.js - Form Submissions & Realtime Updates (FIXED)

/**
 * Initializes file upload listener for message form
 */
export function initFileUploadListener() {
  const fileInput = document.getElementById("fileUpload");
  const filePreview = document.getElementById("customFilePreview");
  const clearAllBtn = document.getElementById("clearAllFilesBtn");

  if (fileInput && filePreview && clearAllBtn) {
    fileInput.addEventListener("change", async function () {
      const scheduleManager = await import('../schedule/schedule-manager.js');
      const currentFiles = scheduleManager.getSelectedFiles() || [];
      
      for (const file of this.files) {
        if (!currentFiles.some((f) => f.name === file.name && f.size === file.size)) {
          currentFiles.push(file);
        }
      }
      scheduleManager.setSelectedFiles(currentFiles);
      this.value = "";
      renderFilePreview();
    });

    clearAllBtn.addEventListener("click", async function () {
      const scheduleManager = await import('../schedule/schedule-manager.js');
      scheduleManager.setSelectedFiles([]);
      renderFilePreview();
    });

    renderFilePreview();
  }

  async function renderFilePreview() {
    const scheduleManager = await import('../schedule/schedule-manager.js');
    const currentFiles = scheduleManager.getSelectedFiles() || [];
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
      
      btn.onclick = async function() {
        const scheduleManager = await import('../schedule/schedule-manager.js');
        const currentFiles = scheduleManager.getSelectedFiles() || [];
        currentFiles.splice(idx, 1);
        scheduleManager.setSelectedFiles(currentFiles);
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
export function initMeetingFileUploadListener() {
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
    meetingFileInput.addEventListener("change", async function () {
      const scheduleManager = await import('../schedule/schedule-manager.js');
      const currentFiles = scheduleManager.getSelectedMeetingFiles() || [];
      
      for (const file of this.files) {
        if (!currentFiles.some((f) => f.name === file.name && f.size === f.size)) {
          currentFiles.push(file);
        }
      }
      scheduleManager.setSelectedMeetingFiles(currentFiles);
      this.value = "";
      renderMeetingFilePreview();
    });

    if (meetingClearAllBtn) {
      meetingClearAllBtn.addEventListener("click", async function () {
        const scheduleManager = await import('../schedule/schedule-manager.js');
        scheduleManager.setSelectedMeetingFiles([]);
        renderMeetingFilePreview();
      });
    }

    renderMeetingFilePreview();
  }

  async function renderMeetingFilePreview() {
    const scheduleManager = await import('../schedule/schedule-manager.js');
    const currentFiles = scheduleManager.getSelectedMeetingFiles() || [];
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
      
      btn.onclick = async function() {
        const scheduleManager = await import('../schedule/schedule-manager.js');
        const currentFiles = scheduleManager.getSelectedMeetingFiles() || [];
        currentFiles.splice(idx, 1);
        scheduleManager.setSelectedMeetingFiles(currentFiles);
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
export function initReminderForm() {
  const reminderForm = document.getElementById("reminderForm");
  if (!reminderForm) return;

  // ✅ FIXED: Select All / Deselect All untuk Kontak dengan Filter Support
  const selectAllContactsBtn = document.getElementById("selectAllContactsBtn");
  const deselectAllContactsBtn = document.getElementById("deselectAllContactsBtn");

  if (selectAllContactsBtn) {
    selectAllContactsBtn.addEventListener("click", async function() {
      const contactManager = await import('../contacts/contact-manager.js');
      const contactUI = await import('../contacts/contact-ui.js');
      
      // ✅ AMBIL KONTAK YANG TERFILTER (sesuai pencarian)
      const filteredContacts = contactUI.getFilteredContacts() || [];
      
      filteredContacts.forEach(contact => {
        contactManager.selectedNumbers.add(contact.number);
      });
      
      contactUI.renderContactList();
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }

  if (deselectAllContactsBtn) {
    deselectAllContactsBtn.addEventListener("click", async function() {
      const contactManager = await import('../contacts/contact-manager.js');
      const contactUI = await import('../contacts/contact-ui.js');
      
      // ✅ HAPUS HANYA KONTAK YANG TERFILTER (sesuai pencarian)
      const filteredContacts = contactUI.getFilteredContacts() || [];
      
      filteredContacts.forEach(contact => {
        contactManager.selectedNumbers.delete(contact.number);
      });
      
      contactUI.renderContactList();
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }

  reminderForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const contactManager = await import('../contacts/contact-manager.js');
    const contactGroups = await import('../contacts/contact-groups.js');
    const scheduleManager = await import('../schedule/schedule-manager.js');
    const scheduleRender = await import('../schedule/schedule-render.js');

    const message = document.getElementById("message").value.trim();
    const datetime = document.getElementById("datetime").value;
    const manualInput = document.getElementById("manualNumbers").value;
    const fileInput = document.getElementById("fileUpload");
    const uploadedFiles = fileInput.files;

    const selectedContactNumbers = Array.from(contactManager.selectedNumbers);
    const groupNumbers = contactGroups.getNumbersFromSelectedGroups(false);
    const manualNumbers = manualInput.split(",").map((num) => num.trim()).filter((num) => num !== "");
    
    const allNumbersSet = new Set([...selectedContactNumbers, ...groupNumbers, ...manualNumbers]);
    const finalNumbers = Array.from(allNumbersSet).map((num) => num.replace(/\D/g, "").trim()).filter((num) => num !== "");

    const submitButton = document.querySelector('#reminderForm button[type="submit"]');
    const editId = submitButton ? submitButton.dataset.editId : null;
    const isEditing = !!editId;

    const hasFilesUploaded = uploadedFiles.length > 0;
    const hasMessage = message.length > 0;
    let hasExistingFiles = false;

    if (isEditing) {
      const currentSchedule = scheduleManager.getSchedules().find((s) => s.id == editId);
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

    const currentFiles = scheduleManager.getSelectedFiles() || [];
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
        contactManager.selectedNumbers.clear();
        contactGroups.clearSelectedGroups();
        
        const contactUI = await import('../contacts/contact-ui.js');
        contactUI.renderContactList();
        contactGroups.renderGroupSelectionList();

        scheduleManager.setSelectedFiles([]);
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

        await scheduleRender.renderScheduleTable();
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
export function initMeetingForm() {
  const meetingForm = document.getElementById("addMeetingForm");
  if (!meetingForm) return;

  // ✅ FIXED: Select All / Deselect All untuk Meeting Contacts dengan Filter Support
  const selectAllMeetingContactsBtn = document.getElementById("selectAllMeetingContactsBtn");
  const deselectAllMeetingContactsBtn = document.getElementById("deselectAllMeetingContactsBtn");

  if (selectAllMeetingContactsBtn) {
    selectAllMeetingContactsBtn.addEventListener("click", async function() {
      const contactManager = await import('../contacts/contact-manager.js');
      const contactUI = await import('../contacts/contact-ui.js');
      
      // ✅ AMBIL KONTAK YANG TERFILTER (sesuai pencarian)
      const filteredContacts = contactUI.getFilteredMeetingContacts() || [];
      
      filteredContacts.forEach(contact => {
        contactManager.selectedMeetingNumbers.add(contact.number);
      });
      
      contactUI.renderMeetingContactList();
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }

  if (deselectAllMeetingContactsBtn) {
    deselectAllMeetingContactsBtn.addEventListener("click", async function() {
      const contactManager = await import('../contacts/contact-manager.js');
      const contactUI = await import('../contacts/contact-ui.js');
      
      // ✅ HAPUS HANYA KONTAK YANG TERFILTER (sesuai pencarian)
      const filteredContacts = contactUI.getFilteredMeetingContacts() || [];
      
      filteredContacts.forEach(contact => {
        contactManager.selectedMeetingNumbers.delete(contact.number);
      });
      
      contactUI.renderMeetingContactList();
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }

  meetingForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const contactManager = await import('../contacts/contact-manager.js');
    const contactGroups = await import('../contacts/contact-groups.js');
    const scheduleManager = await import('../schedule/schedule-manager.js');
    const scheduleRender = await import('../schedule/schedule-render.js');

    const submitButton = document.querySelector('#addMeetingForm button[type="submit"]');

    const title = document.getElementById("meetingTitle").value.trim();
    const room = document.getElementById("meetingRoom").value;
    const startTime = document.getElementById("meetingStartTime").value;
    const endTime = document.getElementById("meetingEndTime").value;
    const manualInput = document.getElementById("meetingNumbers").value;

    // 🔍 DEBUG: Log data yang akan dikirim
    console.log('📋 Meeting Form Data:', {
      title,
      room,
      startTime,
      endTime,
      manualInput
    });

    const selectedContactNumbers = Array.from(contactManager.selectedMeetingNumbers);
    const groupNumbers = contactGroups.getNumbersFromSelectedGroups(true);
    const manualNumbers = manualInput.split(",").map((num) => num.trim()).filter((num) => num);
    
    const allNumbers = [...new Set([...selectedContactNumbers, ...groupNumbers, ...manualNumbers])];

    // 🔍 DEBUG: Log nomor yang terkumpul
    console.log('📞 Collected Numbers:', {
      selectedContacts: selectedContactNumbers.length,
      groupNumbers: groupNumbers.length,
      manualNumbers: manualNumbers.length,
      total: allNumbers.length,
      numbers: allNumbers
    });

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
    
    // 🔍 DEBUG: Validasi waktu
    console.log('⏰ Time Validation:', {
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      isValid: endDateTime > startDateTime
    });

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

    const currentFiles = scheduleManager.getSelectedMeetingFiles() || [];
    for (const file of currentFiles) {
      formData.append("files", file);
    }

    // 🔍 DEBUG: Log FormData
    console.log('📦 FormData Contents:');
    for (let pair of formData.entries()) {
      if (pair[0] === 'files') {
        console.log(`  ${pair[0]}:`, pair[1].name, `(${Math.round(pair[1].size / 1024)} KB)`);
      } else {
        console.log(`  ${pair[0]}:`, pair[1]);
      }
    }

    let url = isEditing ? `/edit-meeting/${editId}` : "/add-meeting";
    let method = isEditing ? "PUT" : "POST";

    console.log(`🚀 Sending ${method} request to ${url}`);

    try {
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

      // 🔍 DEBUG: Log response
      console.log('📥 Server Response:', {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok
      });

      const result = await res.json();
      console.log('📄 Response Data:', result);
      
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
        contactManager.selectedMeetingNumbers.clear();
        contactGroups.clearSelectedMeetingGroups();
        
        const contactUI = await import('../contacts/contact-ui.js');
        contactUI.renderMeetingContactList();
        contactGroups.renderMeetingGroupSelectionList();
        
        scheduleManager.setSelectedMeetingFiles([]);
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

        // ✅ CRITICAL FIX: Render schedule table untuk tampilkan meeting baru
        console.log('📊 Rendering schedule table after meeting creation...');
        await scheduleRender.renderScheduleTable();
        
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        // 🔍 DEBUG: Show detailed error
        console.error('❌ Server Error:', result);
        Swal.fire({
          icon: "error",
          title: "❌ Gagal",
          html: `
            <p>${result.message || "Terjadi kesalahan"}</p>
            ${result.error ? `<small style="color: #718096;">${result.error}</small>` : ''}
          `,
          confirmButtonColor: "#fc8181"
        });
      }
    } catch (err) {
      Swal.close();
      console.error('❌ Request Error:', err);
      Swal.fire({
        icon: "error",
        title: "❌ Koneksi Gagal",
        text: "Tidak dapat terhubung ke server. Silakan coba lagi.",
        confirmButtonColor: "#fc8181"
      });
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
export function initFileUploadLabelHandlers() {
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
export function initMediaModalListeners() {
  const mediaModal = document.getElementById("mediaModal");
  if (mediaModal) {
    mediaModal.addEventListener("click", function (event) {
      if (event.target === mediaModal) {
        window.closeMediaModal();
      }
    });
  }
}

/**
 * Initializes smooth animations
 */
export function initSmoothAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animation = 'fadeInContent 0.4s ease';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.form-content').forEach(form => {
    observer.observe(form);
  });

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
 * Initializes realtime schedule updates
 */
export async function initRealtimeScheduleUpdates() {
  console.log("🔌 Connecting to real-time schedule updates...");
  
  const socket = io();
  const scheduleRender = await import('../schedule/schedule-render.js');

  socket.on('connect', () => {
    console.log("✅ Real-time connection established - Socket ID:", socket.id);
  });

  socket.on('disconnect', () => {
    console.log("⚠️ Real-time connection lost");
  });

  socket.on('connect_error', (error) => {
    console.error("❌ Connection error:", error);
  });

  // Event: schedule status berubah (untuk pesan)
  socket.on('schedule-status-updated', (data) => {
    console.log('📡 RECEIVED: schedule-status-updated', data);
    
    const { scheduleId, newStatus, message } = data;
    
    if (window.updateScheduleStatusInTable) {
      window.updateScheduleStatusInTable(scheduleId, newStatus);
    }
    
    if (newStatus === 'terkirim') {
      showNotification('✅ Pesan Terkirim', message || `Jadwal #${scheduleId} telah terkirim`, 'success');
      scheduleRender.renderScheduleTable();
    } else if (newStatus === 'gagal') {
      showNotification('❌ Pesan Gagal', message || `Jadwal #${scheduleId} gagal terkirim`, 'error');
      scheduleRender.renderScheduleTable();
    }
  });

  // Event: meeting status berubah
  socket.on('meeting-status-updated', async (data) => {
    console.log('📡 RECEIVED: meeting-status-updated', data);
    
    const { scheduleId, newStatus, message } = data;
    
    if (window.updateScheduleStatusInTable) {
      window.updateScheduleStatusInTable(scheduleId, newStatus);
    }
    
    // ✅ CRITICAL FIX: Refresh table untuk semua perubahan status meeting
    if (newStatus === 'terkirim') {
      showNotification('📨 Pengingat Rapat Terkirim', message || `Pengingat rapat #${scheduleId} telah terkirim`, 'success');
      console.log('🔄 Auto-refreshing table after meeting reminder sent...');
      await scheduleRender.renderScheduleTable();
    } else if (newStatus === 'selesai') {
      showNotification('✅ Rapat Selesai', message || `Rapat #${scheduleId} telah selesai`, 'success');
      await scheduleRender.renderScheduleTable();
    } else if (newStatus === 'dibatalkan') {
      showNotification('⚠️ Rapat Dibatalkan', message || `Rapat #${scheduleId} dibatalkan`, 'warning');
      await scheduleRender.renderScheduleTable();
    } else {
      // Refresh untuk status lainnya juga
      console.log(`🔄 Refreshing table for meeting status: ${newStatus}`);
      await scheduleRender.renderScheduleTable();
    }
  });

  // Event: schedule baru dibuat
  socket.on('schedule-created', async (data) => {
    console.log('📡 RECEIVED: schedule-created', data);
    console.log('🔄 Auto-refreshing schedule table for new schedule...');
    await scheduleRender.renderScheduleTable();
  });

  // ✅ PERBAIKAN: Event ketika schedule/meeting di-update (re-render penuh)
  socket.on('schedule-updated', async (data) => {
    console.log('📡 RECEIVED: schedule-updated', data);
    const hasFileChanges = data.filesChanged || (data.filesData && data.filesData.length > 0);
    const message = hasFileChanges 
      ? `Jadwal #${data.scheduleId} dan file telah diupdate` 
      : `Jadwal #${data.scheduleId} telah diupdate`;
    showNotification('📝 Jadwal Diperbarui', message, 'info');
    
    // ✅ CRITICAL: Langsung refresh tanpa delay untuk file changes
    if (hasFileChanges || data.forceRefresh) {
      console.log('🔄 FORCE REFRESH - File changes detected!');
      // Immediate refresh
      await scheduleRender.renderScheduleTable();
      
      // Double refresh setelah delay untuk ensure data loaded
      setTimeout(async () => {
        console.log('🔄 Secondary refresh for file data...');
        await scheduleRender.renderScheduleTable();
      }, 1000);
    } else {
      // Normal refresh
      await scheduleRender.renderScheduleTable();
    }
  });

  socket.on('meeting-updated', async (data) => {
    console.log('📡 RECEIVED: meeting-updated', data);
    const hasFileChanges = data.filesChanged || (data.filesData && data.filesData.length > 0);
    const message = hasFileChanges 
      ? `Rapat #${data.scheduleId} dan file telah diupdate` 
      : `Rapat #${data.scheduleId} telah diupdate`;
    showNotification('📝 Rapat Diperbarui', message, 'info');
    
    // ✅ CRITICAL: Langsung refresh tanpa delay untuk file changes
    if (hasFileChanges || data.forceRefresh) {
      console.log('🔄 FORCE REFRESH - File changes detected!');
      // Immediate refresh
      await scheduleRender.renderScheduleTable();
      
      // Double refresh setelah delay untuk ensure data loaded
      setTimeout(async () => {
        console.log('🔄 Secondary refresh for file data...');
        await scheduleRender.renderScheduleTable();
      }, 1000);
    } else {
      // Normal refresh
      await scheduleRender.renderScheduleTable();
    }
  });

  // Event: schedule dihapus
  socket.on('schedule-deleted', (data) => {
    console.log('📡 RECEIVED: schedule-deleted', data);
    const { scheduleId } = data;
    if (window.removeScheduleFromTable) {
      window.removeScheduleFromTable(scheduleId);
    }
  });

  // ✅ NEW: Event khusus untuk perubahan file tanpa perubahan status
  socket.on('schedule-files-updated', (data) => {
    console.log('📡 RECEIVED: schedule-files-updated', data);
    const { scheduleId } = data;
    showNotification('📎 File Diperbarui', `File untuk jadwal #${scheduleId} telah diupdate`, 'info');
    // Render ulang untuk menampilkan file terbaru
    scheduleRender.renderScheduleTable();
  });

  socket.on('meeting-files-updated', (data) => {
    console.log('📡 RECEIVED: meeting-files-updated', data);
    const { scheduleId } = data;
    showNotification('📎 File Diperbarui', `File untuk rapat #${scheduleId} telah diupdate`, 'info');
    // Render ulang untuk menampilkan file terbaru
    scheduleRender.renderScheduleTable();
  });

  window.scheduleSocket = socket;
}

/**
 * Show notification
 */
export function showNotification(title, message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <strong>${title}</strong>
      <p>${message}</p>
    </div>
  `;
  
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

  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}