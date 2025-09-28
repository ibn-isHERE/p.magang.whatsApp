// schedule-manager.js - Schedule Management Module

import { formatTimeDifference } from './ui-helpers.js';
import { selectedNumbers, selectedMeetingNumbers, renderContactListForEdit, renderMeetingContactListForEdit } from './contact-manager.js';

let schedules = [];
let currentFilter = "all";
const schedulesContainer = document.querySelector("#scheduleTable tbody");

// File management
export let selectedFiles = [];
export let selectedMeetingFiles = [];
let selectedEditFiles = [];
let existingEditFiles = [];
let removedExistingEditFiles = [];
let existingEditMeetingFiles = [];
let removedExistingEditMeetingFiles = [];
let selectedEditMeetingFiles = [];

/**
 * Renders the schedule table
 */
export async function renderScheduleTable() {
  if (!schedulesContainer) return;

  try {
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
      schedulesContainer.innerHTML = '<tr><td colspan="6" class="text-center">Belum ada jadwal untuk filter ini.</td></tr>';
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
    schedulesContainer.innerHTML = `<tr><td colspan="6" class="text-center error-message">${error.message}</td></tr>`;
  }
}

/**
 * Creates HTML for schedule row
 */
function createScheduleRowHtml(schedule) {
  const scheduledTimeFull = new Date(schedule.scheduledTime);
  const scheduledTimeFormatted = scheduledTimeFull.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  let numbersArray = [];
  try {
    if (schedule.originalNumbers) {
      if (Array.isArray(schedule.originalNumbers)) {
        numbersArray = schedule.originalNumbers;
      } else if (typeof schedule.originalNumbers === "string") {
        numbersArray = JSON.parse(schedule.originalNumbers || "[]");
      }
    } else if (schedule.numbers) {
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

  numbersArray = numbersArray.map((num) => {
    if (typeof num === "string") {
      let cleanNum = num.replace("@c.us", "");
      if (cleanNum.startsWith("62")) {
        cleanNum = "0" + cleanNum.slice(2);
      }
      return cleanNum;
    }
    return num;
  });

  const numberOfRecipients = numbersArray.length;
  const isMeeting = schedule.type === "meeting" || schedule.meetingRoom;

  let statusClass = "";
  let statusText = "";
  let statusIcon = "";
  let countdownText = "";

  if (schedule.status === "terjadwal") {
    countdownText = `<br><small class="countdown-timer" id="countdown-${schedule.id}"></small>`;
  }

  switch (schedule.status) {
    case "terkirim":
      statusClass = "status-terkirim";
      statusText = "Terkirim";
      statusIcon = '<i class="material-icons" title="Terkirim">check_circle</i>';
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
    default:
      statusClass = "status-terjadwal";
      statusText = "Terjadwal";
      statusIcon = '<i class="material-icons" title="Terjadwal">hourglass_empty</i>';
  }

  let fileDisplay = "-";
  if (isMeeting) {
    if (schedule.filesData && schedule.filesData.length > 0) {
      fileDisplay = schedule.filesData.map((file) => {
        const fileName = file.name || file.filename || "File";
        return fileName.replace(/^\d+-/, "");
      }).join("<br>");
    } else if (schedule.file) {
      fileDisplay = schedule.file.replace(/^\d+-/, "");
    } else if (schedule.meetingFile) {
      fileDisplay = schedule.meetingFile.replace(/^\d+-/, "");
    }
  } else {
    if (schedule.filesData && schedule.filesData.length > 0) {
      fileDisplay = schedule.filesData.map((file) => {
        const fileName = file.name || file.filename || "File";
        return fileName.replace(/^\d+-/, "");
      }).join("<br>");
    }
  }

  let messageDisplay = "";
  if (isMeeting) {
    let meetingTimeInfo = `<strong>Rapat:</strong> ${schedule.meetingTitle || schedule.message || "-"}<br>`;
    meetingTimeInfo += `<small>Ruangan: ${schedule.meetingRoom}</small>`;
    if (schedule.meetingEndTime) {
      const endTime = new Date(schedule.meetingEndTime);
      const endTimeFormatted = endTime.toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      meetingTimeInfo += `<br><small>Durasi: ${scheduledTimeFormatted} - ${endTimeFormatted}</small>`;
    } else if (schedule.endTime) {
      meetingTimeInfo += `<br><small>Durasi: ${scheduledTimeFull.toLocaleString("id-ID", { timeStyle: "short" })} - ${schedule.endTime}</small>`;
    }
    messageDisplay = meetingTimeInfo;
  } else {
    messageDisplay = schedule.message || "-";
  }

  let timeCellContent = "";
  if (isMeeting) {
    let endTimeDisplay = "";
    if (schedule.meetingEndTime) {
      const endTime = new Date(schedule.meetingEndTime);
      endTimeDisplay = endTime.toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } else if (schedule.endTime) {
      const meetingDate = scheduledTimeFull.toLocaleDateString("id-ID", { dateStyle: "medium" });
      endTimeDisplay = `${meetingDate}, ${schedule.endTime}`;
    }

    let sendTime = new Date(scheduledTimeFull.getTime() - 60 * 60 * 1000);
    let sendTimeFormatted = sendTime.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    timeCellContent = `
      <strong>Waktu Rapat:</strong><br>
      ${scheduledTimeFormatted}<br>
      <strong>Rapat Selesai:</strong><br>
      ${endTimeDisplay}<br>
      <small>Pengingat dikirim:<br>${sendTimeFormatted}</small>
      ${countdownText}
    `;
  } else {
    timeCellContent = `${scheduledTimeFormatted}${countdownText}`;
  }

  let actionButtons = "";
  if (isMeeting) {
    switch (schedule.status) {
      case "terjadwal":
        const fileData = schedule.filesData && schedule.filesData.length > 0
          ? JSON.stringify(schedule.filesData)
          : schedule.file || schedule.meetingFile || "";
        actionButtons = `
          <button class="edit-btn" data-id="${schedule.id}" 
                  data-type="meeting" 
                  data-meetingroom="${schedule.meetingRoom}"
                  data-meetingtitle="${schedule.meetingTitle || schedule.message || ""}"
                  data-starttime="${schedule.scheduledTime}"
                  data-endtime="${schedule.meetingEndTime || schedule.endTime || ""}"
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
    switch (schedule.status) {
      case "terjadwal":
        actionButtons = `
          <button class="edit-btn" data-id="${schedule.id}" 
                  data-type="message"
                  data-message="${escape(schedule.message || "")}"
                  data-datetime="${schedule.scheduledTime}"
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

  return `
    <td data-scheduled-time="${schedule.scheduledTime}">${timeCellContent}</td>
    <td>${numbersArray.join(", ") || "-"} <br> <small>(${numberOfRecipients} nomor)</small></td>
    <td>${messageDisplay}</td>
    <td>${fileDisplay}</td>
    <td class="${statusClass}">${statusIcon} ${statusText}</td>
    <td class="action-buttons">${actionButtons}</td>
  `;
}

/**
 * Updates countdown timers
 */
export function updateCountdownTimers() {
  if (schedules.length === 0) return;

  document.querySelectorAll("#scheduleTable tbody tr[data-id]").forEach((row) => {
    const scheduleId = row.dataset.id;
    const scheduleData = schedules.find((s) => s.id == scheduleId);

    if (scheduleData && scheduleData.status === "terjadwal") {
      const timeCell = row.cells[0];
      let smallElement = timeCell.querySelector("small.countdown-timer");

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

/**
 * Attaches event listeners to schedule action buttons
 */
async function attachScheduleActionListeners() {
  // Edit button handlers
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

      const modalBody = document.getElementById("editModalBody");

      if (isMeeting) {
        window.showEditModal("Edit Jadwal Rapat");
        modalBody.innerHTML = createMeetingEditFormHtml(scheduleToEdit);
        window.afterEditMeetingModalOpen();

        try {
          await populateMeetingEditForm(scheduleToEdit);
        } catch (error) {
          console.error("Error saat mengisi form meeting:", error);
          Swal.fire("Error", "Gagal memuat data ruangan rapat", "error");
        }

        document.getElementById("editMeetingForm").addEventListener("submit", handleMeetingFormSubmit);
        document.getElementById("cancel-edit-meeting-btn").addEventListener("click", () => window.closeEditModal());
        initEditMeetingContactListeners();
      } else {
        window.showEditModal("Edit Jadwal Pesan");
        modalBody.innerHTML = createMessageEditFormHtml(scheduleToEdit);
        populateMessageEditForm(scheduleToEdit);

        document.getElementById("editReminderForm").addEventListener("submit", handleReminderFormSubmit);
        document.getElementById("cancel-edit-message-btn").addEventListener("click", () => window.closeEditModal());
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  });

  // Cancel meeting button
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
            const res = await fetch(`/cancel-meeting/${id}`, { method: "PUT" });
            const result = await res.json();
            if (res.ok && result.success) {
              Swal.fire("Dibatalkan!", result.message, "success");
              renderScheduleTable();
            } else {
              Swal.fire("Gagal!", result.message || "Gagal membatalkan rapat", "error");
            }
          } catch (error) {
            console.error("Error canceling meeting:", error);
            Swal.fire("Gagal!", "Terjadi kesalahan saat membatalkan rapat.", "error");
          }
        }
      });
    };
  });

  // Finish meeting button
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
            const res = await fetch(`/finish-meeting/${id}`, { method: "PUT" });
            const result = await res.json();
            if (res.ok && result.success) {
              Swal.fire("Selesai!", result.message, "success");
              renderScheduleTable();
            } else {
              Swal.fire("Gagal!", result.message || "Gagal menandai rapat selesai", "error");
            }
          } catch (error) {
            console.error("Error finishing meeting:", error);
            Swal.fire("Gagal!", "Terjadi kesalahan saat menandai rapat selesai.", "error");
          }
        }
      });
    };
  });

  // Delete meeting button
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
            const res = await fetch(`/delete-meeting/${id}`, { method: "DELETE" });
            const result = await res.json();
            if (res.ok && result.success) {
              Swal.fire("Dihapus!", result.message, "success");
              renderScheduleTable();
            } else {
              Swal.fire("Gagal!", result.message || "Gagal menghapus rapat", "error");
            }
          } catch (error) {
            console.error("Error deleting meeting:", error);
            Swal.fire("Gagal!", "Terjadi kesalahan saat menghapus rapat.", "error");
          }
        }
      });
    };
  });

  // Cancel schedule button
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
      });
    };
  });

  // Delete history button
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
      });
    };
  });
}

// Export functions and variables needed by other modules
export function getSchedules() {
  return schedules;
}

export function setCurrentFilter(filter) {
  currentFilter = filter;
}

export function getCurrentFilter() {
  return currentFilter;
}

/**
 * Creates HTML for message edit form
 */
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

/**
 * Creates HTML for meeting edit form
 */
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

/**
 * Populates message edit form with schedule data
 */
function populateMessageEditForm(schedule) {
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
  selectedNumbers.clear();
  plainNumbers.forEach((num) => selectedNumbers.add(num));

  renderContactListForEdit();

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
          // Check if file already exists in selectedEditFiles
          if (!selectedEditFiles.some((sf) => sf.name === f.name && sf.size === f.size)) {
            selectedEditFiles.push(f);
          }
        }
        this.value = ""; // Reset input for next selection
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
async function populateMeetingEditForm(schedule) {
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

  selectedMeetingNumbers.clear();
  plainNumbers.forEach((num) => selectedMeetingNumbers.add(num));
  renderMeetingContactListForEdit();

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
          // Check if file already exists in selectedEditMeetingFiles
          if (!selectedEditMeetingFiles.some((sf) => sf.name === f.name && sf.size === f.size)) {
            selectedEditMeetingFiles.push(f);
          }
        }
        this.value = ""; // Reset input for next selection
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
    
    // Direct click handler
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
    
    // Direct click handler
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
    
    // Direct click handler
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
    
    // Direct click handler
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
function initEditMeetingContactListeners() {
  const searchInput = document.getElementById("edit-meetingContactSearch");
  if (searchInput) {
    searchInput.addEventListener("input", renderMeetingContactListForEdit);
  }
}

/**
 * Loads meeting rooms from server
 */
export async function loadMeetingRooms(selectElement = null, selectedValue = null) {
  try {
    const res = await fetch("/meeting-rooms");
    if (!res.ok) throw new Error("Gagal mengambil daftar ruangan.");

    const rooms = await res.json();
    const roomSelect = selectElement || document.getElementById("meetingRoom");

    if (roomSelect) {
      roomSelect.innerHTML = '<option value="">Pilih Ruangan</option>';

      rooms.forEach((room) => {
        const option = document.createElement("option");
        option.value = room;
        option.textContent = room;
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

/**
 * Handles reminder form submission
 */
async function handleReminderFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const editId = form.querySelector('input[name="id"]')?.value;
  const isEditing = !!editId;

  const formData = new FormData(form);
  formData.delete("fileUpload");

  // PENTING: Jika sedang edit, kirim info file existing yang TIDAK dihapus
  if (isEditing) {
    // Kirim daftar file existing yang masih ada (belum dihapus)
    const keepExistingFiles = existingEditFiles.map((f) => f.name || f.filename || f);
    if (keepExistingFiles.length > 0) {
      formData.append("keepExistingFiles", JSON.stringify(keepExistingFiles));
    }
    
    // Kirim file baru yang ditambahkan
    if (Array.isArray(selectedEditFiles) && selectedEditFiles.length > 0) {
      selectedEditFiles.forEach((f) => formData.append("files", f));
    }
    
    // Kirim daftar file yang dihapus
    if (removedExistingEditFiles.length > 0) {
      formData.append("deletedFiles", JSON.stringify(removedExistingEditFiles));
    }
  } else {
    // Jika bukan edit, kirim file baru seperti biasa
    if (Array.isArray(selectedFiles) && selectedFiles.length > 0) {
      selectedFiles.forEach((f) => formData.append("files", f));
    }
  }

  const manualNumbers = formData.get("manualNumbers").split(",").map((n) => n.trim()).filter(Boolean);
  const finalNumbers = JSON.stringify(Array.from(new Set([...selectedNumbers, ...manualNumbers])));
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
      Swal.fire(isEditing ? "Jadwal Diupdate!" : "Pesan Terjadwal!", text, "success");

      selectedFiles = [];
      selectedEditFiles = [];
      existingEditFiles = [];
      removedExistingEditFiles = [];

      const fileInputEl = document.getElementById("fileUpload");
      if (fileInputEl) fileInputEl.value = "";

      renderScheduleTable();
      window.closeEditModal();
    } else {
      Swal.fire("Gagal", text, "error");
    }
  } catch (err) {
    Swal.close();
    Swal.fire("Gagal koneksi ke server", err.message, "error");
  }
}

/**
 * Handles meeting form submission
 */
async function handleMeetingFormSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const formData = e._formData instanceof FormData ? e._formData : new FormData(form);
  const manualNumbers = (formData.get("manualNumbers") || "").toString().split(",").map((n) => n.trim()).filter(Boolean);
  const finalNumbers = JSON.stringify(Array.from(new Set([...selectedMeetingNumbers, ...manualNumbers])));
  formData.set("numbers", finalNumbers);
  formData.delete("manualNumbers");

  const editId = form.querySelector('input[name="id"]')?.value;
  const isEditing = !!editId;

  // PENTING: Jika sedang edit, kirim info file existing yang TIDAK dihapus
  if (isEditing) {
    // Kirim daftar file existing yang masih ada (belum dihapus)
    const keepExistingFiles = existingEditMeetingFiles.map((f) => f.name || f.filename || f);
    if (keepExistingFiles.length > 0) {
      formData.append("keepExistingFiles", JSON.stringify(keepExistingFiles));
    }
    
    // Kirim file baru yang ditambahkan
    formData.delete("files");
    if (Array.isArray(selectedEditMeetingFiles) && selectedEditMeetingFiles.length > 0) {
      selectedEditMeetingFiles.forEach((f) => formData.append("files", f));
    }
    
    // Kirim daftar file yang dihapus
    if (removedExistingEditMeetingFiles.length > 0) {
      formData.append("deletedFiles", JSON.stringify(removedExistingEditMeetingFiles));
    }
  } else {
    // Jika bukan edit, kirim file baru seperti biasa
    formData.delete("files");
    if (Array.isArray(selectedMeetingFiles) && selectedMeetingFiles.length > 0) {
      selectedMeetingFiles.forEach((f) => formData.append("files", f));
    }
  }

  const url = isEditing ? `/edit-meeting/${editId}` : "/add-meeting";
  const method = isEditing ? "PUT" : "POST";

  try {
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
      Swal.fire(isEditing ? "Rapat Diupdate!" : "Rapat Terjadwal!", result.message, "success");

      selectedMeetingFiles = [];
      selectedEditMeetingFiles = [];
      existingEditMeetingFiles = [];
      removedExistingEditMeetingFiles = [];

      renderScheduleTable();
      window.closeEditModal();
    } else {
      Swal.fire("Gagal", result.message || "Terjadi kesalahan", "error");
    }
  } catch (err) {
    Swal.close();
    Swal.fire("Gagal koneksi ke server", err.message, "error");
  }
}

/**
 * Initializes filter buttons
 */
export function initFilterButtons() {
  document.querySelectorAll(".filter-button").forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      currentFilter = filter;

      document.querySelectorAll(".filter-button").forEach((btn) => {
        btn.classList.remove("active");
      });
      button.classList.add("active");

      renderScheduleTable();
    });
  });
}

/**
 * Updates filter button active state
 */
export function updateFilterButtonActiveState(activeFilter) {
  document.querySelectorAll(".filter-button").forEach((button) => {
    if (button.dataset.filter === activeFilter) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });
}

// Export file-related functions
export function getSelectedFiles() {
  return selectedFiles;
}

export function getSelectedMeetingFiles() {
  return selectedMeetingFiles;
}

export function setSelectedFiles(files) {
  selectedFiles = files;
}

export function setSelectedMeetingFiles(files) {
  selectedMeetingFiles = files;
}