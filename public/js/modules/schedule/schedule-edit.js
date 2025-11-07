// schedule-edit.js - Schedule Edit Form Logic (FIXED GROUPINFO HANDLING)

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
 * ✅ WITH GROUP SELECTION TABS
 */
export function createMessageEditFormHtml(schedule) {
  return `
    <form id="editReminderForm" enctype="multipart/form-data">
      <input type="hidden" id="edit-id" name="id" value="${schedule.id}">
      
      <!-- ====== RECIPIENT SELECTION WITH TABS ====== -->
      <div class="recipient-tabs-container">
        <div class="recipient-tabs">
          <button type="button" class="recipient-tab active" data-tab="edit-contacts">
            <i class="fa-solid fa-user"></i> Kontak Individual
          </button>
          <button type="button" class="recipient-tab" data-tab="edit-groups">
            <i class="fa-solid fa-users"></i> Grup
          </button>
        </div>

        <!-- TAB PANEL: KONTAK INDIVIDUAL -->
        <div class="recipient-panel active" id="editContactsPanel">
          <div class="search-box-wrapper">
            <i class="fa-solid fa-search"></i>
            <input type="text" id="edit-contactSearch" placeholder="Cari kontak berdasarkan nama atau nomor..." autocomplete="off">
          </div>
          
          <div class="quick-actions">
            <button type="button" class="quick-action-btn select-all" id="selectAllEditContactsBtn">
              <i class="fa-solid fa-check-double"></i> Pilih Semua
            </button>
            <button type="button" class="quick-action-btn deselect-all" id="deselectAllEditContactsBtn">
              <i class="fa-solid fa-times"></i> Batal Semua
            </button>
          </div>
          
          <div id="edit-contactList" class="contact-checklist-box"></div>
          
          <div class="selection-info" id="editContactSelectionInfo">
            <small>Belum ada kontak dipilih</small>
          </div>
        </div>

        <!-- TAB PANEL: GRUP -->
        <div class="recipient-panel" id="editGroupsPanel">
          <div class="search-box-wrapper">
            <i class="fa-solid fa-search"></i>
            <input type="text" id="edit-groupSearch" placeholder="Cari grup..." autocomplete="off">
          </div>
          
          <div class="quick-actions">
            <button type="button" class="quick-action-btn select-all" id="selectAllEditGroupsBtn">
              <i class="fa-solid fa-check-double"></i> Pilih Semua
            </button>
            <button type="button" class="quick-action-btn deselect-all" id="deselectAllEditGroupsBtn">
              <i class="fa-solid fa-times"></i> Batal Semua
            </button>
          </div>
          
          <div id="edit-groupSelectionList" class="contact-checklist-box"></div>
          
          <div id="editGroupSelectionInfo" class="selection-info">
            <small>Belum ada grup dipilih</small>
          </div>
        </div>
      </div>
      
      <label for="edit-manualNumbers">
        <i class="fa-solid fa-keyboard"></i> Nomor Manual (opsional):
      </label>
      <input type="text" id="edit-manualNumbers" name="manualNumbers" placeholder="Contoh: 08123456789, 08234567890">
      <small style="display: block; color: #718096; margin-top: 4px; font-size: 12px;">
        Pisahkan dengan koma jika lebih dari satu
      </small>
      
      <div class="file-upload-section">
        <label>
          <i class="fa-solid fa-paperclip"></i> File:
        </label>
        <div class="file-upload-container">
          <input type="file" id="edit-fileUpload" name="files" multiple accept="image/*,video/*,application/pdf">
          <span class="file-upload-label" data-input="edit-fileUpload">Klik untuk ganti/tambah file</span>
          <div id="edit-fileNames" class="customFilePreview">Tidak ada file terpilih</div>
        </div>
        <button type="button" id="clearAllEditFilesBtn" style="display: none; background-color: #dc3545; margin-top: 6px;">Hapus Seluruh File</button>
      </div>
      
      <label for="edit-message">
        <i class="fa-solid fa-comment-dots"></i> Pesan:
      </label>
      <textarea id="edit-message" name="message" rows="4"></textarea>
      
      <label for="edit-datetime">
        <i class="fa-solid fa-clock"></i> Waktu Kirim:
      </label>
      <input type="datetime-local" id="edit-datetime" name="datetime" required>
      
      <button type="submit">
        <i class="fa-solid fa-check"></i> Update Pesan
      </button>
      <button type="button" id="cancel-edit-message-btn" style="background-color: #6c757d; margin-top: 10px;">
        <i class="fa-solid fa-times"></i> Batal
      </button>
    </form>
  `;
}

/**
 * Creates HTML for meeting edit form
 * ✅ WITH GROUP SELECTION TABS
 */
export function createMeetingEditFormHtml(schedule) {
  return `
    <form id="editMeetingForm" enctype="multipart/form-data">
      <input type="hidden" name="id" value="${schedule.id}">
      
      <label for="edit-meetingTitle">
        <i class="fa-solid fa-heading"></i> Judul Rapat:
      </label>
      <input type="text" id="edit-meetingTitle" name="meetingTitle" required>
      
      <!-- ====== RECIPIENT SELECTION WITH TABS ====== -->
      <div class="recipient-tabs-container">
        <div class="recipient-tabs">
          <button type="button" class="recipient-tab active" data-tab="edit-meeting-contacts">
            <i class="fa-solid fa-user"></i> Kontak Individual
          </button>
          <button type="button" class="recipient-tab" data-tab="edit-meeting-groups">
            <i class="fa-solid fa-users"></i> Grup
          </button>
        </div>

        <!-- TAB PANEL: KONTAK INDIVIDUAL -->
        <div class="recipient-panel active" id="editMeetingContactsPanel">
          <div class="search-box-wrapper">
            <i class="fa-solid fa-search"></i>
            <input type="text" id="edit-meetingContactSearch" placeholder="Cari kontak berdasarkan nama atau nomor..." autocomplete="off">
          </div>
          
          <div class="quick-actions">
            <button type="button" class="quick-action-btn select-all" id="selectAllEditMeetingContactsBtn">
              <i class="fa-solid fa-check-double"></i> Pilih Semua
            </button>
            <button type="button" class="quick-action-btn deselect-all" id="deselectAllEditMeetingContactsBtn">
              <i class="fa-solid fa-times"></i> Batal Semua
            </button>
          </div>
          
          <div id="edit-meetingContactList" class="contact-checklist-box"></div>
          
          <div class="selection-info" id="editMeetingContactSelectionInfo">
            <small>Belum ada kontak dipilih</small>
          </div>
        </div>

        <!-- TAB PANEL: GRUP -->
        <div class="recipient-panel" id="editMeetingGroupsPanel">
          <div class="search-box-wrapper">
            <i class="fa-solid fa-search"></i>
            <input type="text" id="edit-meetingGroupSearch" placeholder="Cari grup..." autocomplete="off">
          </div>
          
          <div class="quick-actions">
            <button type="button" class="quick-action-btn select-all" id="selectAllEditMeetingGroupsBtn">
              <i class="fa-solid fa-check-double"></i> Pilih Semua
            </button>
            <button type="button" class="quick-action-btn deselect-all" id="deselectAllEditMeetingGroupsBtn">
              <i class="fa-solid fa-times"></i> Batal Semua
            </button>
          </div>
          
          <div id="edit-meetingGroupSelectionList" class="contact-checklist-box"></div>
          
          <div id="editMeetingGroupSelectionInfo" class="selection-info">
            <small>Belum ada grup dipilih</small>
          </div>
        </div>
      </div>
      
      <label for="edit-meetingNumbers">
        <i class="fa-solid fa-keyboard"></i> Nomor Manual (opsional):
      </label>
      <input type="text" id="edit-meetingNumbers" name="manualNumbers" placeholder="Contoh: 081234567890, 089876543210">
      <small style="display: block; color: #718096; margin-top: 4px; font-size: 12px;">
        Pisahkan dengan koma jika lebih dari satu
      </small>
      
      <div class="file-upload-section">
        <label>
          <i class="fa-solid fa-paperclip"></i> Lampiran File untuk Rapat:
        </label>
        <div class="file-upload-container">
          <input type="file" id="edit-meetingFileUpload" name="files" multiple accept="image/*,video/*,application/pdf">
          <span class="file-upload-label" data-input="edit-meetingFileUpload">Klik untuk ganti/tambah file</span>
          <div id="edit-meetingFileNames" class="customFilePreview">Tidak ada file terpilih</div>
        </div>
        <button type="button" id="clearAllEditMeetingFilesBtn" style="display: none; background-color: #dc3545; margin-top: 6px;">Hapus Seluruh File</button>
      </div>
      
      <label for="edit-meetingRoom">
        <i class="fa-solid fa-door-open"></i> Ruangan:
      </label>
      <select id="edit-meetingRoom" name="meetingRoom" required>
        <option value="">Pilih Ruangan</option>
      </select>
      
      <label for="edit-meetingStartTime">
        <i class="fa-solid fa-hourglass-start"></i> Waktu Mulai:
      </label>
      <input type="datetime-local" id="edit-meetingStartTime" name="startTime" required>
      
      <label for="edit-meetingEndTime">
        <i class="fa-solid fa-hourglass-end"></i> Waktu Selesai:
      </label>
      <input type="datetime-local" id="edit-meetingEndTime" name="endTime" required>
      
      <button type="submit">
        <i class="fa-solid fa-check"></i> Update Rapat
      </button>
      <button type="button" id="cancel-edit-meeting-btn" style="background-color: #6c757d; margin-top: 10px;">
        <i class="fa-solid fa-times"></i> Batal
      </button>
    </form>
  `;
}

/**
 * ✅ NEW: Setup dynamic manual numbers update ketika grup/kontak berubah
 */
async function setupEditFormDynamicNumbersUpdate(formType = 'edit') {
  const contactManager = await import('../contacts/contact-manager.js');
  const contactGroups = await import('../contacts/contact-groups.js');
  
  const isMeeting = formType === 'meeting';
  const manualNumbersInputId = isMeeting ? 'edit-meetingNumbers' : 'edit-manualNumbers';
  
  // Fungsi untuk recalculate manual numbers
  const recalculateManualNumbers = () => {
    const manualNumbersInput = document.getElementById(manualNumbersInputId);
    if (!manualNumbersInput) return;
    
    // Get current manual input value
    const currentManualInput = manualNumbersInput.value
      .split(',')
      .map(n => n.trim())
      .filter(Boolean);
    
    // Get selected contacts
    const selectedContactNumbers = isMeeting 
      ? Array.from(contactManager.selectedMeetingNumbers)
      : Array.from(contactManager.selectedNumbers);
    
    // Get numbers from selected groups
    const selectedGroupIds = isMeeting 
      ? Array.from(contactGroups.selectedMeetingGroups)
      : Array.from(contactGroups.selectedGroups);
    
    const groupNumbers = new Set();
    selectedGroupIds.forEach(groupId => {
      const group = contactGroups.getGroups().find(g => g.id === groupId);
      if (group && group.members) {
        try {
          const members = JSON.parse(group.members);
          members.forEach(num => groupNumbers.add(num));
        } catch (e) {
          console.error("Error parsing group members:", e);
        }
      }
    });
    
    // Get all contacts
    const allContacts = contactManager.getContacts();
    const contactNumbersSet = new Set(allContacts.map(c => c.number));
    
    // Filter manual numbers: ONLY numbers yang TIDAK ada di contacts DAN TIDAK ada di selected groups
    const filteredManualNumbers = currentManualInput.filter(num => {
      const isContact = contactNumbersSet.has(num);
      const isInSelectedGroup = groupNumbers.has(num);
      
      // Keep number jika: BUKAN kontak DAN BUKAN dari grup yang dipilih
      return !isContact && !isInSelectedGroup;
    });
    
    // Update input field
    manualNumbersInput.value = filteredManualNumbers.join(', ');
    
    console.log(`🔄 Dynamic update ${formType}:`, {
      selectedContacts: selectedContactNumbers.length,
      selectedGroups: selectedGroupIds.length,
      groupMembers: groupNumbers.size,
      manualNumbers: filteredManualNumbers.length,
      filtered: filteredManualNumbers
    });
  };
  
  // ✅ Listen to custom event from contact-groups.js
  document.addEventListener('editFormNumbersChanged', (e) => {
    if (e.detail.formType === formType) {
      recalculateManualNumbers();
    }
  });
  
  // ✅ Initial call
  setTimeout(recalculateManualNumbers, 100);
  
  console.log(`✅ Dynamic numbers update setup for ${formType} form`);
}

/**
 * Populates message edit form with schedule data
 * ✅ FIXED: Dynamic update when groups/contacts change
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

  // Import modules
  const contactManager = await import('../contacts/contact-manager.js');
  const contactGroups = await import('../contacts/contact-groups.js');
  const contactUI = await import('../contacts/contact-ui.js');

  // ✅ CLEAR DULU
  contactManager.selectedNumbers.clear();
  contactGroups.selectedGroups.clear();

  console.log("📋 Schedule numbers:", plainNumbers);
  console.log("📋 Schedule groupInfo:", schedule.groupInfo);

  const allGroups = contactGroups.getGroups();
  const numbersSet = new Set(plainNumbers);
  const manualNumbers = [];
  
  // ✅ PRIORITAS 1: Parse groupInfo dari schedule (jika ada)
  let scheduleGroupInfo = [];
  if (schedule.groupInfo) {
    try {
      scheduleGroupInfo = typeof schedule.groupInfo === 'string' 
        ? JSON.parse(schedule.groupInfo) 
        : schedule.groupInfo;
      
      if (Array.isArray(scheduleGroupInfo)) {
        console.log(`📦 Found ${scheduleGroupInfo.length} groups in groupInfo`);
        
        scheduleGroupInfo.forEach(groupData => {
          // Find group by name
          const group = allGroups.find(g => g.name === groupData.name);
          if (group) {
            contactGroups.selectedGroups.add(group.id);
            console.log(`✅ Selected group "${groupData.name}" (ID: ${group.id})`);
            
            // Remove group members from numbersSet
            if (groupData.members && Array.isArray(groupData.members)) {
              groupData.members.forEach(memberNum => numbersSet.delete(memberNum));
            }
          }
        });
      }
    } catch (e) {
      console.error("Error parsing groupInfo:", e);
    }
  }

  // ✅ PRIORITAS 2: Sisanya adalah kontak individual ATAU nomor manual
  const allContacts = contactManager.getContacts();
  const contactNumbersSet = new Set(allContacts.map(c => c.number));
  
  numbersSet.forEach(num => {
    if (contactNumbersSet.has(num)) {
      contactManager.selectedNumbers.add(num);
    } else {
      manualNumbers.push(num);
    }
  });

  console.log("👤 Individual contacts selected:", Array.from(contactManager.selectedNumbers));
  console.log("👥 Groups selected:", Array.from(contactGroups.selectedGroups));
  console.log("📱 Manual numbers (not in contacts):", manualNumbers);

  // ✅ ISI MANUAL NUMBERS
  const manualNumbersInput = document.getElementById("edit-manualNumbers");
  if (manualNumbersInput) {
    manualNumbersInput.value = manualNumbers.join(", ");
  }

  // Render contact and group lists
  contactUI.renderContactListForEdit();
  contactGroups.renderGroupSelectionListForEdit();

  // Initialize tab switching
  initEditMessageFormTabs();

  // ✅ CRITICAL: Setup listener untuk update manual numbers ketika grup/kontak berubah
  setupEditFormDynamicNumbersUpdate('edit');

  // File handling
  existingEditFiles = [];
  removedExistingEditFiles = [];
  selectedEditFiles = [];

  if (schedule.filesData && schedule.filesData.length > 0) {
    existingEditFiles = schedule.filesData.map((f) => ({ 
      name: f.name || f.filename || f, 
      size: f.size || 0, 
      meta: f 
    }));
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

  const fileUpload = document.getElementById("edit-fileUpload");
  if (fileUpload) {
    const newFileUpload = fileUpload.cloneNode(true);
    fileUpload.parentNode.replaceChild(newFileUpload, fileUpload);
    
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

  renderEditFilePreview();
}

/**
 * Populates meeting edit form with schedule data
 * ✅ FIXED: Dynamic update when groups/contacts change
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

  // Import modules
  const contactManager = await import('../contacts/contact-manager.js');
  const contactGroups = await import('../contacts/contact-groups.js');
  const contactUI = await import('../contacts/contact-ui.js');

  // ✅ Clear selections
  contactManager.selectedMeetingNumbers.clear();
  contactGroups.selectedMeetingGroups.clear();

  console.log("📋 Meeting schedule numbers:", plainNumbers);
  console.log("📋 Meeting schedule groupInfo:", schedule.groupInfo);

  const allGroups = contactGroups.getGroups();
  const numbersSet = new Set(plainNumbers);
  const manualNumbers = [];
  
  // ✅ PRIORITAS 1: Parse groupInfo dari schedule (jika ada)
  let scheduleGroupInfo = [];
  if (schedule.groupInfo) {
    try {
      scheduleGroupInfo = typeof schedule.groupInfo === 'string' 
        ? JSON.parse(schedule.groupInfo) 
        : schedule.groupInfo;
      
      if (Array.isArray(scheduleGroupInfo)) {
        console.log(`📦 Found ${scheduleGroupInfo.length} groups in meeting groupInfo`);
        
        scheduleGroupInfo.forEach(groupData => {
          // Find group by name
          const group = allGroups.find(g => g.name === groupData.name);
          if (group) {
            contactGroups.selectedMeetingGroups.add(group.id);
            console.log(`✅ Selected meeting group "${groupData.name}" (ID: ${group.id})`);
            
            // Remove group members from numbersSet
            if (groupData.members && Array.isArray(groupData.members)) {
              groupData.members.forEach(memberNum => numbersSet.delete(memberNum));
            }
          }
        });
      }
    } catch (e) {
      console.error("Error parsing meeting groupInfo:", e);
    }
  }

  // ✅ PRIORITAS 2: Sisanya adalah kontak individual ATAU nomor manual
  const allContacts = contactManager.getContacts();
  const contactNumbersSet = new Set(allContacts.map(c => c.number));
  
  numbersSet.forEach(num => {
    if (contactNumbersSet.has(num)) {
      contactManager.selectedMeetingNumbers.add(num);
    } else {
      manualNumbers.push(num);
    }
  });

  console.log("👤 Individual meeting contacts selected:", Array.from(contactManager.selectedMeetingNumbers));
  console.log("👥 Meeting groups selected:", Array.from(contactGroups.selectedMeetingGroups));
  console.log("📱 Manual numbers for meeting (not in contacts):", manualNumbers);

  // ✅ ISI MANUAL NUMBERS
  const numbersInput = document.getElementById("edit-meetingNumbers");
  if (numbersInput) {
    numbersInput.value = manualNumbers.join(", ");
  }

  // ✅ PENTING: Render dulu sebelum init tabs
  contactUI.renderMeetingContactListForEdit();
  contactGroups.renderMeetingGroupSelectionListForEdit();

  // ✅ Initialize tab switching SETELAH render
  initEditMeetingFormTabs();

  // ✅ CRITICAL: Setup listener untuk update manual numbers ketika grup/kontak berubah
  setupEditFormDynamicNumbersUpdate('meeting');

  // File handling
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
    const newFileUpload = fileUpload.cloneNode(true);
    fileUpload.parentNode.replaceChild(newFileUpload, fileUpload);
    
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
 * ✅ Initialize tab switching for edit message form
 */
function initEditMessageFormTabs() {
  const tabs = document.querySelectorAll('#editContactsPanel, #editGroupsPanel').length > 0
    ? document.querySelectorAll('.recipient-tab')
    : [];

  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const targetTab = this.dataset.tab;
      
      // Remove active from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // Hide all panels
      const editContactsPanel = document.getElementById('editContactsPanel');
      const editGroupsPanel = document.getElementById('editGroupsPanel');
      
      if (editContactsPanel) editContactsPanel.classList.remove('active');
      if (editGroupsPanel) editGroupsPanel.classList.remove('active');
      
      // Show target panel
      if (targetTab === 'edit-contacts' && editContactsPanel) {
        editContactsPanel.classList.add('active');
      } else if (targetTab === 'edit-groups' && editGroupsPanel) {
        editGroupsPanel.classList.add('active');
      }
    });
  });
}

/**
 * ✅ Initialize tab switching for edit meeting form
 */
function initEditMeetingFormTabs() {
  const tabs = document.querySelectorAll('#editMeetingContactsPanel, #editMeetingGroupsPanel').length > 0
    ? document.querySelectorAll('.recipient-tab')
    : [];

  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const targetTab = this.dataset.tab;
      
      // Remove active from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // Hide all panels
      const editMeetingContactsPanel = document.getElementById('editMeetingContactsPanel');
      const editMeetingGroupsPanel = document.getElementById('editMeetingGroupsPanel');
      
      if (editMeetingContactsPanel) editMeetingContactsPanel.classList.remove('active');
      if (editMeetingGroupsPanel) editMeetingGroupsPanel.classList.remove('active');
      
      // Show target panel
      if (targetTab === 'edit-meeting-contacts' && editMeetingContactsPanel) {
        editMeetingContactsPanel.classList.add('active');
      } else if (targetTab === 'edit-meeting-groups' && editMeetingGroupsPanel) {
        editMeetingGroupsPanel.classList.add('active');
      }
    });
  });
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

export async function initEditMessageContactListeners() {
  const contactGroups = await import('../contacts/contact-groups.js');
  
  // Contact search untuk edit message form
  const editContactSearch = document.getElementById("edit-contactSearch");
  if (editContactSearch) {
    editContactSearch.addEventListener("input", async () => {
      const contactUI = await import('../contacts/contact-ui.js');
      contactUI.renderContactListForEdit();
    });
  }

  // ✅ Group search untuk edit message form
  const editGroupSearch = document.getElementById("edit-groupSearch");
  if (editGroupSearch) {
    editGroupSearch.addEventListener("input", function() {
      contactGroups.renderGroupSelectionListForEdit(this.value);
    });
  }

  // ✅ Select All / Deselect All untuk Edit Contact Lists (Message)
  const selectAllEditContactsBtn = document.getElementById("selectAllEditContactsBtn");
  if (selectAllEditContactsBtn) {
    selectAllEditContactsBtn.addEventListener("click", async function() {
      const contactManager = await import('../contacts/contact-manager.js');
      const contactUI = await import('../contacts/contact-ui.js');
      const contacts = contactUI.getFilteredContactsForEdit() || [];
      
      contacts.forEach(contact => {
        contactManager.selectedNumbers.add(contact.number);
      });
      
      contactUI.renderContactListForEdit();
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }

  const deselectAllEditContactsBtn = document.getElementById("deselectAllEditContactsBtn");
  if (deselectAllEditContactsBtn) {
    deselectAllEditContactsBtn.addEventListener("click", async function() {
      const contactManager = await import('../contacts/contact-manager.js');
      const contactUI = await import('../contacts/contact-ui.js');
      const contacts = contactUI.getFilteredContactsForEdit() || [];
      
      contacts.forEach(contact => {
        contactManager.selectedNumbers.delete(contact.number);
      });
      
      contactUI.renderContactListForEdit();
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }

  // ✅ Select All / Deselect All untuk Edit Groups (Message)
  const selectAllEditGroupsBtn = document.getElementById("selectAllEditGroupsBtn");
  if (selectAllEditGroupsBtn) {
    selectAllEditGroupsBtn.addEventListener("click", function() {
      const groupSearch = document.getElementById("edit-groupSearch");
      const searchQuery = groupSearch ? groupSearch.value.toLowerCase().trim() : "";
      
      const groups = contactGroups.getGroups();
      const filteredGroups = searchQuery
        ? groups.filter((g) => g.name.toLowerCase().includes(searchQuery))
        : groups;
      
      filteredGroups.forEach((group) => contactGroups.selectedGroups.add(group.id));
      contactGroups.renderGroupSelectionListForEdit(searchQuery);
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }

  const deselectAllEditGroupsBtn = document.getElementById("deselectAllEditGroupsBtn");
  if (deselectAllEditGroupsBtn) {
    deselectAllEditGroupsBtn.addEventListener("click", function() {
      const groupSearch = document.getElementById("edit-groupSearch");
      const searchQuery = groupSearch ? groupSearch.value.toLowerCase().trim() : "";
      
      const groups = contactGroups.getGroups();
      const filteredGroups = searchQuery
        ? groups.filter((g) => g.name.toLowerCase().includes(searchQuery))
        : groups;
      
      filteredGroups.forEach((group) => contactGroups.selectedGroups.delete(group.id));
      contactGroups.renderGroupSelectionListForEdit(searchQuery);
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }
}

/**
 * Initializes edit meeting contact listeners
 * ✅ WITH GROUP SEARCH & SELECT ALL/DESELECT ALL + Dynamic number update
 */
export async function initEditMeetingContactListeners() {
  const contactGroups = await import('../contacts/contact-groups.js');
  
  // Contact search
  const searchInput = document.getElementById("edit-meetingContactSearch");
  if (searchInput) {
    searchInput.addEventListener("input", async () => {
      const contactUI = await import('../contacts/contact-ui.js');
      contactUI.renderMeetingContactListForEdit();
    });
  }

  // ✅ Group search for edit meeting form
  const editMeetingGroupSearch = document.getElementById("edit-meetingGroupSearch");
  if (editMeetingGroupSearch) {
    editMeetingGroupSearch.addEventListener("input", function() {
      contactGroups.renderMeetingGroupSelectionListForEdit(this.value);
    });
  }

  // ✅ Select All / Deselect All for Edit Meeting Contact Lists
  const selectAllEditMeetingContactsBtn = document.getElementById("selectAllEditMeetingContactsBtn");
  if (selectAllEditMeetingContactsBtn) {
    selectAllEditMeetingContactsBtn.addEventListener("click", async function() {
      const contactManager = await import('../contacts/contact-manager.js');
      const contactUI = await import('../contacts/contact-ui.js');
      const contacts = contactUI.getFilteredMeetingContactsForEdit() || [];
      
      contacts.forEach(contact => {
        contactManager.selectedMeetingNumbers.add(contact.number);
      });
      
      contactUI.renderMeetingContactListForEdit();
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }

  const deselectAllEditMeetingContactsBtn = document.getElementById("deselectAllEditMeetingContactsBtn");
  if (deselectAllEditMeetingContactsBtn) {
    deselectAllEditMeetingContactsBtn.addEventListener("click", async function() {
      const contactManager = await import('../contacts/contact-manager.js');
      const contactUI = await import('../contacts/contact-ui.js');
      const contacts = contactUI.getFilteredMeetingContactsForEdit() || [];
      
      contacts.forEach(contact => {
        contactManager.selectedMeetingNumbers.delete(contact.number);
      });
      
      contactUI.renderMeetingContactListForEdit();
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }

  // ✅ Select All / Deselect All for Edit Groups (Meeting)
  const selectAllEditMeetingGroupsBtn = document.getElementById("selectAllEditMeetingGroupsBtn");
  if (selectAllEditMeetingGroupsBtn) {
    selectAllEditMeetingGroupsBtn.addEventListener("click", function() {
      const groupSearch = document.getElementById("edit-meetingGroupSearch");
      const searchQuery = groupSearch ? groupSearch.value.toLowerCase().trim() : "";
      
      const groups = contactGroups.getGroups();
      const filteredGroups = searchQuery
        ? groups.filter((g) => g.name.toLowerCase().includes(searchQuery))
        : groups;
      
      filteredGroups.forEach((group) => contactGroups.selectedMeetingGroups.add(group.id));
      contactGroups.renderMeetingGroupSelectionListForEdit(searchQuery);
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }

  const deselectAllEditMeetingGroupsBtn = document.getElementById("deselectAllEditMeetingGroupsBtn");
  if (deselectAllEditMeetingGroupsBtn) {
    deselectAllEditMeetingGroupsBtn.addEventListener("click", function() {
      const groupSearch = document.getElementById("edit-meetingGroupSearch");
      const searchQuery = groupSearch ? groupSearch.value.toLowerCase().trim() : "";
      
      const groups = contactGroups.getGroups();
      const filteredGroups = searchQuery
        ? groups.filter((g) => g.name.toLowerCase().includes(searchQuery))
        : groups;
      
      filteredGroups.forEach((group) => contactGroups.selectedMeetingGroups.delete(group.id));
      contactGroups.renderMeetingGroupSelectionListForEdit(searchQuery);
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }
}

/**
 * Handles reminder form submission
 * ✅ INCLUDES GROUP INFO with full data (name + members)
 */
export async function handleReminderFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const editId = form.querySelector('input[name="id"]')?.value;
  const isEditing = !!editId;

  const formData = new FormData(form);
  formData.delete("fileUpload");

  console.log(`📝 Submitting reminder form (isEditing: ${isEditing})`);

  if (isEditing) {
    if (existingEditFiles.length > 0) {
      const keepExistingFiles = existingEditFiles.map((f) => f.name || f.filename || f);
      formData.append("keepExistingFiles", JSON.stringify(keepExistingFiles));
      console.log(`✅ Keeping ${keepExistingFiles.length} existing files:`, keepExistingFiles);
    }
    
    if (Array.isArray(selectedEditFiles) && selectedEditFiles.length > 0) {
      selectedEditFiles.forEach((f) => formData.append("files", f));
      console.log(`✅ Adding ${selectedEditFiles.length} new files`);
    }
    
    if (removedExistingEditFiles.length > 0) {
      formData.append("deletedFiles", JSON.stringify(removedExistingEditFiles));
      console.log(`✅ Deleting ${removedExistingEditFiles.length} files:`, removedExistingEditFiles);
    }
  } else {
    const { getSelectedFiles } = await import('../schedule/schedule-manager.js');
    const selectedFiles = getSelectedFiles();
    if (Array.isArray(selectedFiles) && selectedFiles.length > 0) {
      selectedFiles.forEach((f) => formData.append("files", f));
      console.log(`✅ Adding ${selectedFiles.length} files for new schedule`);
    }
  }

  // ✅ FIXED: Parse nomor dengan benar + INCLUDE GROUP INFO
  const contactManager = await import('../contacts/contact-manager.js');
  const contactGroups = await import('../contacts/contact-groups.js');
  
  const manualNumbers = formData.get("manualNumbers")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  
  // ✅ Get numbers from selected groups
  const groupNumbers = contactGroups.getNumbersFromSelectedGroups(false);
  
  const finalNumbers = JSON.stringify(
    Array.from(new Set([...contactManager.selectedNumbers, ...groupNumbers, ...manualNumbers]))
  );
  formData.set("numbers", finalNumbers);

  // ✅ CRITICAL FIX: ALWAYS send groupInfo (even if empty array)
  const selectedGroupsData = contactGroups.getSelectedGroups(false);
  
  // ALWAYS append groupInfo - even if empty array
  // This ensures backend knows to CLEAR the groups when user unchecks all
  formData.append("groupInfo", JSON.stringify(selectedGroupsData));
  
  console.log(`📦 Sending groupInfo:`, {
    groupCount: selectedGroupsData.length,
    data: selectedGroupsData,
    willClearGroups: selectedGroupsData.length === 0
  });

  console.log(`📞 Total recipients: ${JSON.parse(finalNumbers).length} (${contactManager.selectedNumbers.size} contacts + ${groupNumbers.length} from groups + ${manualNumbers.length} manual)`);

  let url = isEditing ? `/edit-schedule/${editId}` : "/add-reminder";
  let method = isEditing ? "PUT" : "POST";

  try {
    const hasNewFiles = selectedEditFiles.length > 0;
    const hasFileChanges = hasNewFiles || removedExistingEditFiles.length > 0;
    
    console.log('📤 Submitting reminder edit:', {
      isEditing,
      hasNewFiles,
      hasFileChanges,
      selectedEditFiles: selectedEditFiles.length,
      existingEditFiles: existingEditFiles.length,
      removedFiles: removedExistingEditFiles.length,
      groupInfoCount: selectedGroupsData.length
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
      
      Swal.fire(
        isEditing ? "Jadwal Diupdate!" : "Pesan Terjadwal!", 
        text, 
        "success"
      );

      const { setSelectedFiles } = await import('../schedule/schedule-manager.js');
      setSelectedFiles([]);
      selectedEditFiles = [];
      existingEditFiles = [];
      removedExistingEditFiles = [];

      const fileInputEl = document.getElementById("fileUpload");
      if (fileInputEl) fileInputEl.value = "";

      if (window.closeEditModal) {
        window.closeEditModal();
      }

      const { renderScheduleTable } = await import('../schedule/schedule-render.js');
      
      if (hasFileChanges) {
        console.log('🔄 File changes detected, forcing immediate refresh...');
        await renderScheduleTable();
        
        setTimeout(async () => {
          console.log('🔄 Secondary refresh for file changes...');
          await renderScheduleTable();
        }, 800);
      } else {
        console.log('🔄 No file changes, normal refresh...');
        await new Promise(resolve => setTimeout(resolve, 300));
        await renderScheduleTable();
      }
      
      console.log('✅ Schedule table re-rendered after reminder edit');
    } else {
      console.error('❌ Server error:', text);
      Swal.fire("Gagal", text, "error");
    }
  } catch (err) {
    Swal.close();
    console.error('❌ Reminder form submit error:', err);
    Swal.fire("Gagal koneksi ke server", err.message, "error");
  }
}

/**
 * Handles meeting form submission
 * ✅ INCLUDES GROUP INFO with full data (name + members)
 */
export async function handleMeetingFormSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const formData = e._formData instanceof FormData ? e._formData : new FormData(form);
  
  const contactManager = await import('../contacts/contact-manager.js');
  const contactGroups = await import('../contacts/contact-groups.js');
  
  const manualNumbers = (formData.get("manualNumbers") || "").toString().split(",").map((n) => n.trim()).filter(Boolean);
  
  // ✅ Get numbers from selected meeting groups
  const groupNumbers = contactGroups.getNumbersFromSelectedGroups(true);
  
  const finalNumbers = JSON.stringify(Array.from(new Set([...contactManager.selectedMeetingNumbers, ...groupNumbers, ...manualNumbers])));
  
  console.log(`📞 Total meeting participants: ${JSON.parse(finalNumbers).length} (${contactManager.selectedMeetingNumbers.size} contacts + ${groupNumbers.length} from groups + ${manualNumbers.length} manual)`);
  
  formData.set("numbers", finalNumbers);
  formData.delete("manualNumbers");

  // ✅ CRITICAL FIX: ALWAYS send groupInfo (even if empty array)
  const selectedGroupsData = contactGroups.getSelectedGroups(true);
  
  // ALWAYS append groupInfo - even if empty array
  // This ensures backend knows to CLEAR the groups when user unchecks all
  formData.append("groupInfo", JSON.stringify(selectedGroupsData));
  
  console.log(`📦 Sending meeting groupInfo:`, {
    groupCount: selectedGroupsData.length,
    data: selectedGroupsData,
    willClearGroups: selectedGroupsData.length === 0
  });

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
    const hasNewFiles = selectedEditMeetingFiles.length > 0;
    const hasFileChanges = hasNewFiles || removedExistingEditMeetingFiles.length > 0;
    
    console.log('📤 Submitting meeting edit:', {
      isEditing,
      hasNewFiles,
      hasFileChanges,
      selectedEditMeetingFiles: selectedEditMeetingFiles.length,
      existingEditMeetingFiles: existingEditMeetingFiles.length,
      removedFiles: removedExistingEditMeetingFiles.length,
      groupInfoCount: selectedGroupsData.length
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

      if (window.closeEditModal) {
        window.closeEditModal();
      }
      
      const { renderScheduleTable } = await import('../schedule/schedule-render.js');
      
      if (hasFileChanges) {
        console.log('🔄 File changes detected, forcing immediate refresh...');
        await renderScheduleTable();
        
        setTimeout(async () => {
          console.log('🔄 Secondary refresh for file changes...');
          await renderScheduleTable();
        }, 800);
      } else {
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