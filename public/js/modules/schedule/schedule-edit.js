// schedule-edit.js - Schedule Edit Form Logic

import { loadMeetingRooms, setSelectedFiles, setSelectedMeetingFiles } from '../schedule/schedule-manager.js';

// File management for edit forms
let selectedEditFiles = [];
let existingEditFiles = [];
let removedExistingEditFiles = [];
let existingEditMeetingFiles = [];
let removedExistingEditMeetingFiles = [];
let selectedEditMeetingFiles = [];

/**
 * Creates HTML for message edit form
 */
export function createMessageEditFormHtml(schedule) {
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

/**
 * Creates HTML for meeting edit form
 */
export function createMeetingEditFormHtml(schedule) {
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

/**
 * Populates message edit form with schedule data
 */
export async function populateMessageEditForm(schedule) {
  document.getElementById("edit-message").value = schedule.message || "";
  const scheduledTime = new Date(schedule.scheduledTime);
  const localDateTime = new Date(
    scheduledTime.getTime() - scheduledTime.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 16);
  document.getElementById("edit-datetime").value = localDateTime;

  let numbers = schedule.originalNumbers || schedule.numbers || [];
  const plainNumbers = numbers.map((num) =>
    String(num).replace("@c.us", "").replace(/^62/, "0")
  );

  document.getElementById("edit-manualNumbers").value = plainNumbers.join(", ");
  
  // Import contact manager dan gunakan referensi
  const contactManager = await import('../contacts/contact-manager.js');
  contactManager.selectedNumbers.clear();
  plainNumbers.forEach((num) => contactManager.selectedNumbers.add(num));

  // Render contact list
  const contactUI = await import('../contacts/contact-ui.js');
  contactUI.renderContactListForEdit();

  const fileUpload = document.getElementById("edit-fileUpload");
  const fileNamesDisplay = document.getElementById("edit-fileNames");

  existingEditFiles = [];
  removedExistingEditFiles = [];
  selectedEditFiles = [];

  if (schedule.filesData && schedule.filesData.length > 0) {
    existingEditFiles = schedule.filesData.map((f) => ({ 
      name: f.name || f.filename || f, 
      size: f.size || 0, 
      meta: f 
    }));
  } else if (schedule.file) {
    existingEditFiles = [{ name: schedule.file.replace(/^\d+-/, ""), size: 0 }];
  }

  if (fileUpload) {
    // Remove old listeners first
    const newFileUpload = fileUpload.cloneNode(true);
    fileUpload.parentNode.replaceChild(newFileUpload, fileUpload);
    
    // Add new listener
    newFileUpload.addEventListener("change", function () {
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
      removedExistingEditFiles = existingEditFiles.map((e) => e.name || e.filename || e);
      existingEditFiles = [];
      selectedEditFiles = [];
      renderEditFilePreview();
    };
  }

  renderEditFilePreview();
}

/**
 * Populates meeting edit form with schedule data
 */
export async function populateMeetingEditForm(schedule) {
  document.getElementById("edit-meetingTitle").value = schedule.meetingTitle || schedule.message || "";

  const roomSelect = document.getElementById("edit-meetingRoom");
  if (roomSelect) {
    await loadMeetingRooms(roomSelect, schedule.meetingRoom);
  }

  const startTime = new Date(schedule.scheduledTime);
  const startTimeInput = document.getElementById("edit-meetingStartTime");
  if (startTimeInput) {
    startTimeInput.value = new Date(
      startTime.getTime() - startTime.getTimezoneOffset() * 60000
    ).toISOString().slice(0, 16);
  }

  if (schedule.meetingEndTime) {
    const endTime = new Date(schedule.meetingEndTime);
    const endTimeInput = document.getElementById("edit-meetingEndTime");
    if (endTimeInput) {
      endTimeInput.value = new Date(
        endTime.getTime() - endTime.getTimezoneOffset() * 60000
      ).toISOString().slice(0, 16);
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

  // Import contact manager dan gunakan referensi
  const contactManager = await import('../contacts/contact-manager.js');
  contactManager.selectedMeetingNumbers.clear();
  plainNumbers.forEach((num) => contactManager.selectedMeetingNumbers.add(num));
  
  // Render meeting contact list
  const contactUI = await import('../contacts/contact-ui.js');
  contactUI.renderMeetingContactListForEdit();

  existingEditMeetingFiles = [];
  removedExistingEditMeetingFiles = [];
  selectedEditMeetingFiles = [];

  if (schedule.filesData && schedule.filesData.length > 0) {
    existingEditMeetingFiles = schedule.filesData.map((f) => ({ 
      name: f.name || f.filename || f, 
      size: f.size || 0, 
      meta: f 
    }));
  } else if (schedule.file || schedule.meetingFile) {
    const fileName = (schedule.file || schedule.meetingFile).replace(/^\d+-/, "");
    existingEditMeetingFiles = [{ name: fileName, size: 0 }];
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
    // Remove old listeners first
    const newFileUpload = fileUpload.cloneNode(true);
    fileUpload.parentNode.replaceChild(newFileUpload, fileUpload);
    
    // Add new listener
    newFileUpload.addEventListener("change", function () {
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

/**
 * Renders edit file preview
 */
function renderEditFilePreview() {
  const editPreview = document.getElementById("edit-fileNames");
  const clearBtn = document.getElementById("clearAllEditFilesBtn");
  if (!editPreview) return;
  editPreview.innerHTML = "";

  const total = (existingEditFiles ? existingEditFiles.length : 0) + 
                (selectedEditFiles ? selectedEditFiles.length : 0);
  if (total === 0) {
    editPreview.innerHTML = "<span>Tidak ada file terpilih</span>";
    if (clearBtn) clearBtn.style.display = "none";
    return;
  }

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
    
    btn.onclick = function() {
      const removed = existingEditFiles.splice(idx, 1);
      if (removed && removed[0]) {
        removedExistingEditFiles.push(removed[0].name || removed[0].filename || removed[0]);
      }
      renderEditFilePreview();
    };
    
    div.appendChild(btn);
    editPreview.appendChild(div);
  });

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
    
    btn.onclick = function() {
      selectedEditFiles.splice(idx, 1);
      renderEditFilePreview();
    };
    
    div.appendChild(btn);
    editPreview.appendChild(div);
  });

  if (clearBtn) clearBtn.style.display = "inline-block";
}

/**
 * Renders edit meeting file preview
 */
function renderEditMeetingFilePreview() {
  const editPreview = document.getElementById("edit-meetingFileNames");
  const clearBtn = document.getElementById("clearAllEditMeetingFilesBtn");
  if (!editPreview) return;
  editPreview.innerHTML = "";

  const total = (existingEditMeetingFiles ? existingEditMeetingFiles.length : 0) + 
                (selectedEditMeetingFiles ? selectedEditMeetingFiles.length : 0);
  if (total === 0) {
    editPreview.innerHTML = "<span>Belum ada file terpilih</span>";
    if (clearBtn) clearBtn.style.display = "none";
    return;
  }

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
    
    btn.onclick = function() {
      const removed = existingEditMeetingFiles.splice(idx, 1);
      if (removed && removed[0]) {
        removedExistingEditMeetingFiles.push(removed[0].name || removed[0].filename || removed[0]);
      }
      renderEditMeetingFilePreview();
    };
    
    div.appendChild(btn);
    editPreview.appendChild(div);
  });

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
    
    btn.onclick = function() {
      selectedEditMeetingFiles.splice(idx, 1);
      renderEditMeetingFilePreview();
    };
    
    div.appendChild(btn);
    editPreview.appendChild(div);
  });

  if (clearBtn) clearBtn.style.display = "inline-block";
}

/**
 * Initializes edit meeting contact listeners
 */
export function initEditMeetingContactListeners() {
  const searchInput = document.getElementById("edit-meetingContactSearch");
  if (searchInput) {
    searchInput.addEventListener("input", async () => {
      const contactUI = await import('../contacts/contact-ui.js');
      contactUI.renderMeetingContactListForEdit();
    });
  }

  const editContactSearch = document.getElementById("edit-contactSearch");
  if (editContactSearch) {
    editContactSearch.addEventListener("input", async () => {
      const contactUI = await import('../contacts/contact-ui.js');
      contactUI.renderContactListForEdit();
    });
  }
}

/**
 * Handles reminder form submission
 */
export async function handleReminderFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const editId = form.querySelector('input[name="id"]')?.value;
  const isEditing = !!editId;

  const formData = new FormData(form);
  formData.delete("fileUpload");

  if (isEditing) {
    const keepExistingFiles = existingEditFiles.map((f) => f.name || f.filename || f);
    if (keepExistingFiles.length > 0) {
      formData.append("keepExistingFiles", JSON.stringify(keepExistingFiles));
    }
    
    if (Array.isArray(selectedEditFiles) && selectedEditFiles.length > 0) {
      selectedEditFiles.forEach((f) => formData.append("files", f));
    }
    
    if (removedExistingEditFiles.length > 0) {
      formData.append("deletedFiles", JSON.stringify(removedExistingEditFiles));
    }
  } else {
    const { getSelectedFiles } = await import('../schedule/schedule-manager.js');
    const selectedFiles = getSelectedFiles();
    if (Array.isArray(selectedFiles) && selectedFiles.length > 0) {
      selectedFiles.forEach((f) => formData.append("files", f));
    }
  }

  const contactManager = await import('../contacts/contact-manager.js');
  const manualNumbers = formData.get("manualNumbers").split(",").map((n) => n.trim()).filter(Boolean);
  const finalNumbers = JSON.stringify(Array.from(new Set([...contactManager.selectedNumbers, ...manualNumbers])));
  formData.set("numbers", finalNumbers);

  let url = isEditing ? `/edit-schedule/${editId}` : "/add-reminder";
  let method = isEditing ? "PUT" : "POST";

  try {
    // ✅ Deteksi apakah ada file yang ditambahkan
    const hasNewFiles = selectedEditFiles.length > 0;
    const hasFileChanges = hasNewFiles || removedExistingEditFiles.length > 0;
    
    console.log('📤 Submitting reminder edit:', {
      isEditing,
      hasNewFiles,
      hasFileChanges,
      selectedEditFiles: selectedEditFiles.length,
      existingEditFiles: existingEditFiles.length,
      removedFiles: removedExistingEditFiles.length
    });

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
      console.log('✅ Reminder update success');
      
      Swal.fire(isEditing ? "Jadwal Diupdate!" : "Pesan Terjadwal!", text, "success");

      const { setSelectedFiles } = await import('../schedule/schedule-manager.js');
      setSelectedFiles([]);
      selectedEditFiles = [];
      existingEditFiles = [];
      removedExistingEditFiles = [];

      const fileInputEl = document.getElementById("fileUpload");
      if (fileInputEl) fileInputEl.value = "";

      // Tutup modal dulu
      if (window.closeEditModal) {
        window.closeEditModal();
      }

      // ✅ CRITICAL: Jika ada perubahan file, force refresh lebih agresif
      const { renderScheduleTable } = await import('../schedule/schedule-render.js');
      
      if (hasFileChanges) {
        console.log('🔄 File changes detected, forcing immediate refresh...');
        // Langsung render tanpa delay untuk file changes
        await renderScheduleTable();
        
        // Tambahan: refresh sekali lagi setelah delay untuk memastikan
        setTimeout(async () => {
          console.log('🔄 Secondary refresh for file changes...');
          await renderScheduleTable();
        }, 800);
      } else {
        // Untuk perubahan biasa, delay normal
        await new Promise(resolve => setTimeout(resolve, 300));
        await renderScheduleTable();
      }
      
      console.log('✅ Schedule table re-rendered after reminder edit');
    } else {
      Swal.fire("Gagal", text, "error");
    }
  } catch (err) {
    Swal.close();
    Swal.fire("Gagal koneksi ke server", err.message, "error");
    console.error('❌ Reminder form submit error:', err);
  }
}

/**
 * Handles meeting form submission
 */
export async function handleMeetingFormSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const formData = e._formData instanceof FormData ? e._formData : new FormData(form);
  
  const contactManager = await import('../contacts/contact-manager.js');
  const manualNumbers = (formData.get("manualNumbers") || "").toString().split(",").map((n) => n.trim()).filter(Boolean);
  const finalNumbers = JSON.stringify(Array.from(new Set([...contactManager.selectedMeetingNumbers, ...manualNumbers])));
  formData.set("numbers", finalNumbers);
  formData.delete("manualNumbers");

  const editId = form.querySelector('input[name="id"]')?.value;
  const isEditing = !!editId;

  if (isEditing) {
    const keepExistingFiles = existingEditMeetingFiles.map((f) => f.name || f.filename || f);
    if (keepExistingFiles.length > 0) {
      formData.append("keepExistingFiles", JSON.stringify(keepExistingFiles));
    }
    
    formData.delete("files");
    if (Array.isArray(selectedEditMeetingFiles) && selectedEditMeetingFiles.length > 0) {
      selectedEditMeetingFiles.forEach((f) => formData.append("files", f));
    }
    
    if (removedExistingEditMeetingFiles.length > 0) {
      formData.append("deletedFiles", JSON.stringify(removedExistingEditMeetingFiles));
    }
  } else {
    formData.delete("files");
    const { getSelectedMeetingFiles } = await import('../schedule/schedule-manager.js');
    const selectedMeetingFiles = getSelectedMeetingFiles();
    if (Array.isArray(selectedMeetingFiles) && selectedMeetingFiles.length > 0) {
      selectedMeetingFiles.forEach((f) => formData.append("files", f));
    }
  }

  const url = isEditing ? `/edit-meeting/${editId}` : "/add-meeting";
  const method = isEditing ? "PUT" : "POST";

  try {
    // ✅ Deteksi apakah ada file yang ditambahkan
    const hasNewFiles = selectedEditMeetingFiles.length > 0;
    const hasFileChanges = hasNewFiles || removedExistingEditMeetingFiles.length > 0;
    
    console.log('📤 Submitting meeting edit:', {
      isEditing,
      hasNewFiles,
      hasFileChanges,
      selectedEditMeetingFiles: selectedEditMeetingFiles.length,
      existingEditMeetingFiles: existingEditMeetingFiles.length,
      removedFiles: removedExistingEditMeetingFiles.length
    });

    Swal.fire({ 
      title: "Memproses...", 
      text: "Mohon tunggu", 
      allowOutsideClick: false, 
      didOpen: () => Swal.showLoading() 
    });
    
    const res = await fetch(url, { method: method, body: formData });
    const result = await res.json();
    Swal.close();
    
    if (res.ok && result.success) {
      console.log('✅ Meeting update success:', result);
      
      Swal.fire(isEditing ? "Rapat Diupdate!" : "Rapat Terjadwal!", result.message, "success");

      const { setSelectedMeetingFiles } = await import('../schedule/schedule-manager.js');
      setSelectedMeetingFiles([]);
      selectedEditMeetingFiles = [];
      existingEditMeetingFiles = [];
      removedExistingEditMeetingFiles = [];

      // Tutup modal dulu
      if (window.closeEditModal) {
        window.closeEditModal();
      }
      
      // ✅ CRITICAL: Jika ada perubahan file, force refresh lebih agresif
      const { renderScheduleTable } = await import('../schedule/schedule-render.js');
      
      if (hasFileChanges) {
        console.log('🔄 File changes detected, forcing immediate refresh...');
        // Langsung render tanpa delay untuk file changes
        await renderScheduleTable();
        
        // Tambahan: refresh sekali lagi setelah delay untuk memastikan
        setTimeout(async () => {
          console.log('🔄 Secondary refresh for file changes...');
          await renderScheduleTable();
        }, 800);
      } else {
        // Untuk perubahan biasa, delay normal
        await new Promise(resolve => setTimeout(resolve, 300));
        await renderScheduleTable();
      }
      
      console.log('✅ Schedule table re-rendered after meeting edit');
    } else {
      Swal.fire("Gagal", result.message || "Terjadi kesalahan", "error");
    }
  } catch (err) {
    Swal.close();
    Swal.fire("Gagal koneksi ke server", err.message, "error");
    console.error('❌ Meeting form submit error:', err);
  }
}