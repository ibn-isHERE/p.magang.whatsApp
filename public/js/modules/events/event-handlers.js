// event-handlers.js - Form Submissions & Realtime Updates (FIXED)

async function detectSelectedGroups(selectedNumbers) {
  try {
    const response = await fetch('/api/groups'); // ✅ FIX: Ganti ke /groups
    
    if (!response.ok) {
      console.warn('Failed to fetch groups:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    // ✅ FIX: Handle berbagai format response
    let groups = [];
    if (Array.isArray(data)) {
      groups = data;
    } else if (data.groups && Array.isArray(data.groups)) {
      groups = data.groups;
    } else {
      console.warn('Unexpected groups data format:', data);
      return [];
    }
    
    const detectedGroups = [];
    const selectedSet = new Set(selectedNumbers);
    
    for (const group of groups) {
      let groupMembers;
      try {
        groupMembers = typeof group.members === 'string' 
          ? JSON.parse(group.members) 
          : group.members || [];
      } catch (e) {
        groupMembers = [];
      }
      
      // Normalize group members
      const normalizedGroupMembers = groupMembers.map(num => {
        if (typeof num === 'string') {
          let cleanNum = num.replace("@c.us", "");
          if (cleanNum.startsWith("62")) {
            cleanNum = "0" + cleanNum.slice(2);
          }
          return cleanNum;
        }
        return num;
      });
      
      // Check jika semua member grup ada di selected numbers
      const allMembersSelected = normalizedGroupMembers.length > 0 && 
        normalizedGroupMembers.every(member => selectedSet.has(member));
      
      if (allMembersSelected) {
        detectedGroups.push({
          id: group.id,
          name: group.name,
          members: normalizedGroupMembers
        });
      }
    }
    
    return detectedGroups;
  } catch (error) {
    console.error('Error detecting groups:', error);
    return [];
  }
}


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
      meetingFilePreview.innerHTML = "<span style='color: #718096; font-size: 13px;'>Tidak ada file terpilih</span>";
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
// event-handlers.js - FIXED: Combine groups AND individual contacts

// ... (keep all existing code until initReminderForm submit handler)

export function initReminderForm() {
  const reminderForm = document.getElementById("reminderForm");
  if (!reminderForm) return;

  // Select All / Deselect All buttons (keep existing code)
  const selectAllContactsBtn = document.getElementById("selectAllContactsBtn");
  const deselectAllContactsBtn = document.getElementById("deselectAllContactsBtn");

  if (selectAllContactsBtn) {
    selectAllContactsBtn.addEventListener("click", async function() {
      const contactManager = await import('../contacts/contact-manager.js');
      const contactUI = await import('../contacts/contact-ui.js');
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
      const filteredContacts = contactUI.getFilteredContacts() || [];
      
      filteredContacts.forEach(contact => {
        contactManager.selectedNumbers.delete(contact.number);
      });
      
      contactUI.renderContactList();
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }

  // ✅ FIXED SUBMIT HANDLER - COMBINE GROUPS + CONTACTS
  reminderForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const contactManager = await import('../contacts/contact-manager.js');
    const contactGroups = await import('../contacts/contact-groups.js');
    const scheduleManager = await import('../schedule/schedule-manager.js');
    const scheduleRender = await import('../schedule/schedule-render.js');

    const message = document.getElementById("message").value.trim();
    const datetime = document.getElementById("datetime").value;
    const manualInput = document.getElementById("manualNumbers").value;

    console.log('📋 Submitting reminder form...');
    
    let finalNumbers = [];
    let groupInfoForBackend = [];
    
    // ✅ FIXED: COMBINE groups AND individual contacts
    
    // 1. Get numbers from selected GROUPS
    const selectedGroupsInfo = contactGroups.getSelectedGroups(false);
    
    if (selectedGroupsInfo.length > 0) {
      selectedGroupsInfo.forEach(group => {
        groupInfoForBackend.push({
          id: group.id,
          name: group.name,
          members: group.members || []
        });
        
        // Add group members to finalNumbers
        finalNumbers.push(...(group.members || []));
      });
      
      console.log(`✅ ${groupInfoForBackend.length} groups selected with ${finalNumbers.length} members`);
    }
    
    // 2. Get INDIVIDUAL contacts (yang tidak termasuk dalam grup)
    const selectedContactNumbers = Array.from(contactManager.selectedNumbers);
    
    if (selectedContactNumbers.length > 0) {
      // Filter out contacts yang sudah ada di grup
      const groupMemberSet = new Set(finalNumbers);
      const individualContacts = selectedContactNumbers.filter(num => !groupMemberSet.has(num));
      
      // Add individual contacts to finalNumbers
      finalNumbers.push(...individualContacts);
      
      console.log(`✅ ${individualContacts.length} individual contacts (not in groups)`);
    }
    
    // 3. Get MANUAL numbers
    const manualNumbers = manualInput.split(",").map((num) => num.trim()).filter((num) => num !== "");
    
    if (manualNumbers.length > 0) {
      finalNumbers.push(...manualNumbers);
      console.log(`✅ ${manualNumbers.length} manual numbers`);
    }
    
    // Remove duplicates
    finalNumbers = [...new Set(finalNumbers)];
    
    console.log(`📊 Total recipients: ${finalNumbers.length} (${groupInfoForBackend.length} groups + individual contacts)`);
    
    // Validation
    if (finalNumbers.length === 0) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Mohon pilih minimal satu kontak, grup, atau masukkan nomor manual.",
        confirmButtonColor: "#2b6cb0"
      });
      return;
    }
    
    // Validate number format
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

    // Validate message or files
    const fileInput = document.getElementById("fileUpload");
    const hasFilesUploaded = fileInput && fileInput.files.length > 0;
    const hasMessage = message.length > 0;

    if (!hasFilesUploaded && !hasMessage) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Mohon isi pesan atau pilih minimal satu file yang ingin dikirim.",
        confirmButtonColor: "#2b6cb0"
      });
      return;
    }

    const formData = new FormData();
    formData.append("numbers", JSON.stringify(finalNumbers));
    formData.append("datetime", datetime);
    
    // ✅ ATTACH GROUP INFO (jika ada grup yang dipilih)
    if (groupInfoForBackend.length > 0) {
      formData.append("groupInfo", JSON.stringify(groupInfoForBackend));
      console.log('✅ Sending groupInfo:', groupInfoForBackend.map(g => g.name).join(', '));
    }

    if (message) {
      formData.append("message", message);
    }

    const currentFiles = scheduleManager.getSelectedFiles() || [];
    if (currentFiles.length > 0) {
      currentFiles.forEach((f) => formData.append("files", f));
    }

    const submitButton = document.querySelector('#reminderForm button[type="submit"]');

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
        didOpen: () => Swal.showLoading(),
      });

      const res = await fetch("/add-reminder", {
        method: "POST",
        body: formData,
      });

      const text = await res.text();
      Swal.close();

      if (res.ok) {
  // Build detailed message
  let recipientDetails = [];
  
  if (groupInfoForBackend.length > 0) {
    recipientDetails.push(`<div style="margin-top: 8px;">
      <i class="fa-solid fa-users" style="color: #4299e1;"></i> 
      <strong>${groupInfoForBackend.length} Grup:</strong>
      <ul style="margin: 4px 0 0 24px; padding: 0; list-style: none;">
        ${groupInfoForBackend.map(g => `<li>• ${g.name}</li>`).join('')}
      </ul>
    </div>`);
  }
  
  const individualCount = selectedContactNumbers.length;
  if (individualCount > 0) {
    recipientDetails.push(`<div style="margin-top: 8px;">
      <i class="fa-solid fa-user" style="color: #48bb78;"></i> 
      <strong>${individualCount} Kontak Individual</strong>
    </div>`);
  }

  await Swal.fire({
    icon: "success",
    title: "Pesan Terjadwal!",
    html: `
      <div style="text-align: left; padding: 10px;">
        <p><strong>📊 Total Penerima:</strong> <span class="badge badge-primary">${finalNumbers.length} nomor</span></p>
        ${recipientDetails.join('')}
        <p style="margin-top: 12px;"><strong>💬 Pesan:</strong> ${message ? message : '<em style="color: #a0aec0;">(Tanpa Pesan Teks)</em>'}</p>
        <p><strong>⏰ Waktu Kirim:</strong> ${new Date(datetime).toLocaleString("id-ID")}</p>
      </div>
    `,
    confirmButtonColor: "#48bb78",
    confirmButtonText: '<i class="fa-solid fa-check"></i> OK'
  });

  // ✅ STEP 1: Reset form HTML elements
  this.reset();
  console.log('✅ Form reset called');
  
  // ✅ STEP 2: Clear selected contacts
  contactManager.selectedNumbers.clear();
  console.log('✅ Selected contacts cleared');
  
  // ✅ STEP 3: Clear selected groups
  contactGroups.clearSelectedGroups();
  console.log('✅ Selected groups cleared');
  
  // ✅ STEP 4: Re-render contact and group lists
  const contactUI = await import('../contacts/contact-ui.js');
  contactUI.renderContactList();
  contactGroups.renderGroupSelectionList();
  console.log('✅ Contact and group lists re-rendered');

  // ✅ STEP 5: Clear files
  scheduleManager.setSelectedFiles([]);
  const fileInputEl = document.getElementById("fileUpload");
  if (fileInputEl) {
    fileInputEl.value = "";
    console.log('✅ File input cleared');
  }

  const filePreview = document.getElementById("customFilePreview");
  if (filePreview) {
    filePreview.innerHTML = "<span style='color: #718096; font-size: 13px;'>Tidak ada file terpilih</span>";
  }

  const clearAllBtn = document.getElementById("clearAllFilesBtn");
  if (clearAllBtn) {
    clearAllBtn.style.display = "none";
  }
  
  // ✅ STEP 6: EXPLICITLY clear manual numbers input (CRITICAL!)
  const manualNumbersInput = document.getElementById("manualNumbers");
  if (manualNumbersInput) {
    manualNumbersInput.value = ""; // Force clear
    console.log('✅ Manual numbers input cleared:', manualNumbersInput.value);
  } else {
    console.warn('⚠️ Manual numbers input not found!');
  }

  // ✅ STEP 7: Clear message textarea
  const messageTextarea = document.getElementById("message");
  if (messageTextarea) {
    messageTextarea.value = "";
    console.log('✅ Message textarea cleared');
  }

  // ✅ STEP 8: Clear datetime input
  const datetimeInput = document.getElementById("datetime");
  if (datetimeInput) {
    datetimeInput.value = "";
    console.log('✅ Datetime input cleared');
  }

  await scheduleRender.renderScheduleTable();
  window.scrollTo({ top: 0, behavior: "smooth" });
  
  console.log(' ALL FORM DATA CLEARED SUCCESSFULLY');
} else {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: text,
          confirmButtonColor: "#fc8181"
        });
      }
    } catch (err) {
      Swal.close();
      Swal.fire({
        icon: "error",
        title: " Koneksi Gagal",
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

  // Select All / Deselect All buttons (keep existing code)
  const selectAllMeetingContactsBtn = document.getElementById("selectAllMeetingContactsBtn");
  const deselectAllMeetingContactsBtn = document.getElementById("deselectAllMeetingContactsBtn");

  if (selectAllMeetingContactsBtn) {
    selectAllMeetingContactsBtn.addEventListener("click", async function() {
      const contactManager = await import('../contacts/contact-manager.js');
      const contactUI = await import('../contacts/contact-ui.js');
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

    console.log('📋 Submitting meeting form...');
    
    let allNumbers = [];
    let groupInfoForBackend = [];
    
    // ✅ FIXED: COMBINE groups AND individual contacts
    
    // 1. Get numbers from selected GROUPS
    const selectedMeetingGroupsInfo = contactGroups.getSelectedGroups(true); // true = meeting
    
    if (selectedMeetingGroupsInfo.length > 0) {
      selectedMeetingGroupsInfo.forEach(group => {
        groupInfoForBackend.push({
          id: group.id,
          name: group.name,
          members: group.members || []
        });
        
        allNumbers.push(...(group.members || []));
      });
      
      console.log(`✅ ${groupInfoForBackend.length} meeting groups selected`);
    }
    
    // 2. Get INDIVIDUAL contacts (yang tidak termasuk dalam grup)
    const selectedContactNumbers = Array.from(contactManager.selectedMeetingNumbers);
    
    if (selectedContactNumbers.length > 0) {
      const groupMemberSet = new Set(allNumbers);
      const individualContacts = selectedContactNumbers.filter(num => !groupMemberSet.has(num));
      
      allNumbers.push(...individualContacts);
      
      console.log(`✅ ${individualContacts.length} individual meeting contacts`);
    }
    
    // 3. Get MANUAL numbers
    const manualNumbers = manualInput.split(",").map((num) => num.trim()).filter((num) => num);
    
    if (manualNumbers.length > 0) {
      allNumbers.push(...manualNumbers);
      console.log(`✅ ${manualNumbers.length} manual numbers`);
    }
    
    // Remove duplicates
    allNumbers = [...new Set(allNumbers)];
    
    console.log(`📊 Total meeting participants: ${allNumbers.length}`);

    // Validate required fields
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

    // ✅ ATTACH GROUP INFO
    if (groupInfoForBackend.length > 0) {
      formData.append("groupInfo", JSON.stringify(groupInfoForBackend));
      console.log('✅ Sending meeting groupInfo:', groupInfoForBackend.map(g => g.name).join(', '));
    }

    const currentFiles = scheduleManager.getSelectedMeetingFiles() || [];
    for (const file of currentFiles) {
      formData.append("files", file);
    }

    let url = isEditing ? `/edit-meeting/${editId}` : "/add-meeting";
    let method = isEditing ? "PUT" : "POST";

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

      const result = await res.json();
      
      Swal.close();

      if (res.ok && result.success) {
  // Build detailed message
  let recipientDetails = [];
  
  if (groupInfoForBackend.length > 0) {
    recipientDetails.push(`<div style="margin-top: 8px;">
      <i class="fa-solid fa-users" style="color: #4299e1;"></i> 
      <strong>${groupInfoForBackend.length} Grup:</strong>
      <ul style="margin: 4px 0 0 24px; padding: 0; list-style: none;">
        ${groupInfoForBackend.map(g => `<li>• ${g.name}</li>`).join('')}
      </ul>
    </div>`);
  }
  
  const individualCount = selectedContactNumbers.length;
  if (individualCount > 0) {
    recipientDetails.push(`<div style="margin-top: 8px;">
      <i class="fa-solid fa-user" style="color: #48bb78;"></i> 
      <strong>${individualCount} Kontak Individual</strong>
    </div>`);
  }

  await Swal.fire({
    icon: "success",
    title: isEditing ? "✅ Jadwal Rapat Diupdate!" : "✅ Jadwal Rapat Terbuat!",
    html: `
      <div style="text-align: left; padding: 10px;">
        <p><strong>👥 Total Peserta:</strong> <span class="badge badge-primary">${allNumbers.length} nomor</span></p>
        ${recipientDetails.join('')}
        <p style="margin-top: 12px;"><strong>📋 Judul:</strong> ${title}</p>
        <p><strong>🏢 Ruangan:</strong> ${room}</p>
        <p><strong>🕐 Waktu:</strong> ${startDateTime.toLocaleString("id-ID")} - ${endDateTime.toLocaleString("id-ID", { timeStyle: "short" })}</p>
      </div>
    `,
    confirmButtonColor: "#48bb78",
    confirmButtonText: '<i class="fa-solid fa-check"></i> OK'
  });

  // ✅ STEP 1: Reset form
  this.reset();
  console.log('✅ Meeting form reset called');
  
  // ✅ STEP 2: Clear submit button edit state
  if (submitButton) {
    delete submitButton.dataset.editId;
    submitButton.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Jadwalkan Rapat';
  }
  
  // ✅ STEP 3: Clear selected meeting contacts
  contactManager.selectedMeetingNumbers.clear();
  console.log('✅ Selected meeting contacts cleared');
  
  // ✅ STEP 4: Clear selected meeting groups
  contactGroups.clearSelectedMeetingGroups();
  console.log('✅ Selected meeting groups cleared');
  
  // ✅ STEP 5: Re-render lists
  const contactUI = await import('../contacts/contact-ui.js');
  contactUI.renderMeetingContactList();
  contactGroups.renderMeetingGroupSelectionList();
  console.log('✅ Meeting contact and group lists re-rendered');
  
  // ✅ STEP 6: Clear meeting files
  scheduleManager.setSelectedMeetingFiles([]);
  const meetingFileInputEl = document.getElementById("meetingFileUpload");
  if (meetingFileInputEl) {
    meetingFileInputEl.value = "";
    console.log('✅ Meeting file input cleared');
  }

  const meetingFilePreview = document.getElementById("meetingFileNames");
  if (meetingFilePreview) {
    meetingFilePreview.innerHTML = "<span style='color: #718096; font-size: 13px;'>Tidak ada file terpilih</span>";
  }

  const meetingClearAllBtn = document.getElementById("clearAllMeetingFilesBtn");
  if (meetingClearAllBtn) {
    meetingClearAllBtn.style.display = "none";
  }
  
  // ✅ STEP 7: EXPLICITLY clear manual numbers for MEETING (CRITICAL!)
  const meetingNumbersInput = document.getElementById("meetingNumbers");
  if (meetingNumbersInput) {
    meetingNumbersInput.value = ""; // Force clear
    console.log('✅ Meeting manual numbers input cleared:', meetingNumbersInput.value);
  } else {
    console.warn('⚠️ Meeting manual numbers input not found!');
  }

  // ✅ STEP 8: Clear all meeting form fields explicitly
  const meetingTitleInput = document.getElementById("meetingTitle");
  if (meetingTitleInput) {
    meetingTitleInput.value = "";
    console.log('✅ Meeting title cleared');
  }

  const meetingRoomSelect = document.getElementById("meetingRoom");
  if (meetingRoomSelect) {
    meetingRoomSelect.selectedIndex = 0;
    console.log('✅ Meeting room reset');
  }

  const meetingStartTimeInput = document.getElementById("meetingStartTime");
  if (meetingStartTimeInput) {
    meetingStartTimeInput.value = "";
    console.log('✅ Meeting start time cleared');
  }

  const meetingEndTimeInput = document.getElementById("meetingEndTime");
  if (meetingEndTimeInput) {
    meetingEndTimeInput.value = "";
    console.log('✅ Meeting end time cleared');
  }

  await scheduleRender.renderScheduleTable();
  window.scrollTo({ top: 0, behavior: "smooth" });
  
  console.log(' ALL MEETING FORM DATA CLEARED SUCCESSFULLY');
} else {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          html: `
            <p>${result.message || "Terjadi kesalahan"}</p>
            ${result.error ? `<small style="color: #718096;">${result.error}</small>` : ''}
          `,
          confirmButtonColor: "#fc8181"
        });
      }
    } catch (err) {
      Swal.close();
      console.error(' Request Error:', err);
      Swal.fire({
        icon: "error",
        title: " Koneksi Gagal",
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

export async function renderScheduleTable(forceRefresh = false) {
  if (!schedulesContainer) return;

  try {
    //  CRITICAL: Add cache busting when force refresh
    const cacheParam = forceRefresh ? `?_t=${Date.now()}` : '';
    const res = await fetch(`/get-all-schedules${cacheParam}`);
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Server error: ${res.status} - ${errorText}`);
    }

    const allSchedulesData = await res.json();
    if (!Array.isArray(allSchedulesData)) {
      throw new Error("Data yang diterima dari server bukan array");
    }

    //  IMPORTANT: Log untuk debug
    if (forceRefresh) {
      console.log(' FORCE REFRESH - Fresh data from database:', {
        totalSchedules: allSchedulesData.length,
        sampledGroupInfo: allSchedulesData.slice(0, 2).map(s => ({
          id: s.id,
          type: s.type,
          hasGroupInfo: !!s.groupInfo,
          groupInfo: s.groupInfo
        }))
      });
    }

    setSchedules(allSchedulesData);
    
    // ... (rest of the function tetap sama)
    const schedules = getSchedules();
    const currentFilter = getCurrentFilter();

    let filteredSchedules;
    if (currentFilter === "all") {
      filteredSchedules = schedules;
    } else if (currentFilter === "meeting") {
      filteredSchedules = schedules.filter((s) => s.type === "meeting" || s.meetingRoom);
    } else {
      filteredSchedules = schedules.filter((s) => s.status === currentFilter);
    }

    // Sort schedules
    filteredSchedules.sort((a, b) => {
      const isActiveMeeting = (schedule) => {
        const isMeeting = schedule.type === "meeting" || !!schedule.meetingRoom;
        return isMeeting && (schedule.status === "terjadwal" || schedule.status === "terkirim");
      };

      const aIsActiveMeeting = isActiveMeeting(a);
      const bIsActiveMeeting = isActiveMeeting(b);

      if (aIsActiveMeeting && !bIsActiveMeeting) return -1;
      if (!aIsActiveMeeting && bIsActiveMeeting) return 1;

      if (aIsActiveMeeting && bIsActiveMeeting) {
        const getStatusRank = (status) => (status === "terjadwal" ? 1 : 2);
        const rankA = getStatusRank(a.status);
        const rankB = getStatusRank(b.status);

        if (rankA !== rankB) return rankA - rankB;
        if (rankA === 1) {
          return new Date(a.scheduledTime) - new Date(b.scheduledTime);
        } else {
          const endTimeA = a.meetingEndTime || a.scheduledTime;
          const endTimeB = b.meetingEndTime || b.scheduledTime;
          return new Date(endTimeA) - new Date(endTimeB);
        }
      } else {
        return new Date(b.scheduledTime) - new Date(a.scheduledTime);
      }
    });

    schedulesContainer.innerHTML = "";

    if (filteredSchedules.length === 0) {
      schedulesContainer.innerHTML = '<tr><td colspan="6" class="text-center">Tidak ada jadwal untuk filter ini.</td></tr>';
    } else {
      const rowPromises = filteredSchedules.map(async (schedule) => {
        const newRow = document.createElement("tr");
        newRow.dataset.id = schedule.id;
        newRow.innerHTML = await createScheduleRowHtml(schedule);
        return newRow;
      });
      
      const rows = await Promise.all(rowPromises);
      rows.forEach(row => schedulesContainer.appendChild(row));
    }

    updateCountdownTimers();
    attachScheduleActionListeners();
    
    if (forceRefresh) {
      console.log(' Force refresh complete - Table updated with fresh data');
    }
  } catch (error) {
    console.error("Error rendering schedule table:", error);
    schedulesContainer.innerHTML = `<tr><td colspan="6" class="text-center error-message">${error.message}</td></tr>`;
  }
}
/**
 * Initializes realtime schedule updates
 */
export async function initRealtimeScheduleUpdates() {
  console.log("Connecting to real-time schedule updates...");
  
  const socket = io();
  const scheduleRender = await import('../schedule/schedule-render.js');

  socket.on('connect', () => {
    console.log(" Real-time connection established - Socket ID:", socket.id);
  });

  socket.on('disconnect', () => {
    console.log(" Real-time connection lost");
  });

  socket.on('connect_error', (error) => {
    console.error(" Connection error:", error);
  });

  // Event: schedule status berubah (untuk pesan)
  socket.on('schedule-status-updated', async (data) => {
    console.log(' RECEIVED: schedule-status-updated', data);
    
    const { scheduleId, newStatus, message } = data;
    
    if (window.updateScheduleStatusInTable) {
      window.updateScheduleStatusInTable(scheduleId, newStatus);
    }
    
    if (newStatus === 'terkirim') {
      showNotification(' Pesan Terkirim', message || `Jadwal #${scheduleId} telah terkirim`, 'success');
      await scheduleRender.renderScheduleTable(true); //  FORCE REFRESH
    } else if (newStatus === 'gagal') {
      showNotification(' Pesan Gagal', message || `Jadwal #${scheduleId} gagal terkirim`, 'error');
      await scheduleRender.renderScheduleTable(true); //  FORCE REFRESH
    }
  });

  // Event: meeting status berubah
  socket.on('meeting-status-updated', async (data) => {
    console.log(' RECEIVED: meeting-status-updated', data);
    
    const { scheduleId, newStatus, message } = data;
    
    if (window.updateScheduleStatusInTable) {
      window.updateScheduleStatusInTable(scheduleId, newStatus);
    }
    
    //  CRITICAL FIX: Force refresh untuk semua perubahan status meeting
    if (newStatus === 'terkirim') {
      showNotification('¨ Pengingat Rapat Terkirim', message || `Pengingat rapat #${scheduleId} telah terkirim`, 'success');
      console.log(' Auto-refreshing table after meeting reminder sent...');
      await scheduleRender.renderScheduleTable(true); //  FORCE REFRESH
    } else if (newStatus === 'selesai') {
      showNotification(' Rapat Selesai', message || `Rapat #${scheduleId} telah selesai`, 'success');
      await scheduleRender.renderScheduleTable(true); //  FORCE REFRESH
    } else if (newStatus === 'dibatalkan') {
      showNotification('¸ Rapat Dibatalkan', message || `Rapat #${scheduleId} dibatalkan`, 'warning');
      await scheduleRender.renderScheduleTable(true); //  FORCE REFRESH
    } else {
      console.log(` Refreshing table for meeting status: ${newStatus}`);
      await scheduleRender.renderScheduleTable(true); //  FORCE REFRESH
    }
  });

  // Event: schedule baru dibuat
  socket.on('schedule-created', async (data) => {
    console.log(' RECEIVED: schedule-created', data);
    console.log(' Auto-refreshing schedule table for new schedule...');
    await scheduleRender.renderScheduleTable(true); //  FORCE REFRESH
  });

  //  CRITICAL FIX: Event ketika schedule/meeting di-update
  socket.on('schedule-updated', async (data) => {
    console.log(' RECEIVED: schedule-updated', data);
    console.log(' Data received:', {
      scheduleId: data.scheduleId,
      filesChanged: data.filesChanged,
      hasGroupInfo: !!data.groupInfo,
      forceRefresh: data.forceRefresh
    });
    
    const message = data.filesChanged 
      ? `Jadwal #${data.scheduleId} dan file telah diupdate` 
      : `Jadwal #${data.scheduleId} telah diupdate`;
    
    showNotification(' Jadwal Diperbarui', message, 'info');
    
    //  CRITICAL: ALWAYS force refresh untuk edit
    console.log(' FORCE REFRESH - Fetching fresh data from database...');
    
    // First refresh
    await scheduleRender.renderScheduleTable(true);
    
    //  DOUBLE REFRESH: Ensure data fully loaded (especially for groupInfo changes)
    setTimeout(async () => {
      console.log(' Secondary force refresh to ensure groupInfo updated...');
      await scheduleRender.renderScheduleTable(true);
    }, 800);
  });

  socket.on('meeting-updated', async (data) => {
    console.log(' RECEIVED: meeting-updated', data);
    console.log(' Data received:', {
      scheduleId: data.scheduleId,
      filesChanged: data.filesChanged,
      hasGroupInfo: !!data.groupInfo,
      forceRefresh: data.forceRefresh
    });
    
    const message = data.filesChanged 
      ? `Rapat #${data.scheduleId} dan file telah diupdate` 
      : `Rapat #${data.scheduleId} telah diupdate`;
    
    showNotification(' Rapat Diperbarui', message, 'info');
    
    //  CRITICAL: ALWAYS force refresh untuk edit
    console.log(' FORCE REFRESH - Fetching fresh data from database...');
    
    // First refresh
    await scheduleRender.renderScheduleTable(true);
    
    //  DOUBLE REFRESH: Ensure data fully loaded (especially for groupInfo changes)
    setTimeout(async () => {
      console.log(' Secondary force refresh to ensure groupInfo updated...');
      await scheduleRender.renderScheduleTable(true);
    }, 800);
  });

  // Event: schedule dihapus
  socket.on('schedule-deleted', async (data) => {
    console.log(' RECEIVED: schedule-deleted', data);
    const { scheduleId } = data;
    if (window.removeScheduleFromTable) {
      window.removeScheduleFromTable(scheduleId);
    }
    // Force refresh juga untuk memastikan
    await scheduleRender.renderScheduleTable(true);
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