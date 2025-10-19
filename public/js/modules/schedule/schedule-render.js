// schedule-render.js - Schedule Table Rendering & Countdown

import { formatTimeDifference } from '../ui/ui-helpers.js';
import { getContacts } from '../contacts/contact-manager.js';
import { getSchedules, setSchedules, getCurrentFilter } from './schedule-manager.js';
import { 
  createMessageEditFormHtml, 
  createMeetingEditFormHtml,
  populateMessageEditForm,
  populateMeetingEditForm,
  initEditMeetingContactListeners,
  handleReminderFormSubmit,
  handleMeetingFormSubmit
} from './schedule-edit.js';

const schedulesContainer = document.querySelector("#scheduleTable tbody");

function getContactNameOrNumber(number) {
  const contacts = getContacts();
  const contact = contacts.find(c => c.number === number);
  return contact ? `${contact.name} (${number})` : number;
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

  const displayNumbers = numbersArray.map(num => getContactNameOrNumber(num));
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
    <td>${displayNumbers.join(", ") || "-"} <br> <small>(${numberOfRecipients} nomor)</small></td>
    <td>${messageDisplay}</td>
    <td>${fileDisplay}</td>
    <td class="${statusClass}">${statusIcon} ${statusText}</td>
    <td class="action-buttons">${actionButtons}</td>
  `;
}

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

    setSchedules(allSchedulesData);
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
 * Updates countdown timers
 */
export function updateCountdownTimers() {
  const schedules = getSchedules();
  if (schedules.length === 0) return;

  // Cache query untuk performa
  const rows = document.querySelectorAll("#scheduleTable tbody tr[data-id]");
  
  rows.forEach((row) => {
    const scheduleId = row.dataset.id;
    const scheduleData = schedules.find((s) => s.id == scheduleId);

    if (scheduleData && scheduleData.status === "terjadwal") {
      const timeCell = row.cells[0];
      if (!timeCell) return;
      
      let smallElement = timeCell.querySelector("small.countdown-timer");

      const scheduledTime = new Date(scheduleData.scheduledTime);
      const countdownBaseTime = scheduleData.meetingRoom
        ? new Date(scheduledTime.getTime() - 60 * 60 * 1000)
        : scheduledTime;

      const newCountdownText = `(${formatTimeDifference(countdownBaseTime)})`;

      // Create element if doesn't exist
      if (!smallElement) {
        smallElement = document.createElement("small");
        smallElement.className = "countdown-timer";
        smallElement.style.cssText = "display: block; color: #718096; margin-top: 4px; font-size: 12px;";
        timeCell.appendChild(smallElement);
      }

      // Gunakan requestAnimationFrame untuk smooth update
      // Hanya update jika text berubah
      if (smallElement.textContent !== newCountdownText) {
        requestAnimationFrame(() => {
          if (smallElement) {
            smallElement.textContent = newCountdownText;
          }
        });
      }
    } else {
      // Hapus countdown timer jika status bukan terjadwal
      const timeCell = row.cells[0];
      if (timeCell) {
        const smallElement = timeCell.querySelector("small.countdown-timer");
        if (smallElement) {
          // Smooth removal dengan fade out
          requestAnimationFrame(() => {
            if (smallElement.parentNode) {
              smallElement.style.transition = "opacity 0.2s ease";
              smallElement.style.opacity = "0";
              setTimeout(() => {
                if (smallElement.parentNode) {
                  smallElement.remove();
                }
              }, 200);
            }
          });
        }
      }
    }
  });
}

/**
 * Smart render untuk update status tanpa rebuild table
 */
export async function smartUpdateScheduleStatus() {
  try {
    const res = await fetch("/get-all-schedules");
    if (!res.ok) return;

    const newSchedules = await res.json();
    if (!Array.isArray(newSchedules)) return;

    const schedules = getSchedules();

    // Hanya update status yang berubah
    newSchedules.forEach((newSchedule) => {
      const oldSchedule = schedules.find(s => s.id === newSchedule.id);
      
      // Cek apakah status berubah
      if (oldSchedule && oldSchedule.status !== newSchedule.status) {
        const row = document.querySelector(`#scheduleTable tbody tr[data-id="${newSchedule.id}"]`);
        if (row && row.cells[4]) {
          const statusCell = row.cells[4];
          
          // Smooth transition dengan fade
          statusCell.style.transition = "opacity 0.3s ease";
          statusCell.style.opacity = "0.3";
          
          setTimeout(() => {
            // Update status HTML
            const statusConfig = {
              'terkirim': { icon: 'check_circle', text: 'Terkirim', class: 'status-terkirim' },
              'gagal': { icon: 'cancel', text: 'Gagal', class: 'status-gagal' },
              'dibatalkan': { icon: 'block', text: 'Dibatalkan', class: 'status-dibatalkan' },
              'selesai': { icon: 'done_all', text: 'Selesai', class: 'status-selesai' },
              'terjadwal': { icon: 'hourglass_empty', text: 'Terjadwal', class: 'status-terjadwal' }
            };
            
            const config = statusConfig[newSchedule.status] || statusConfig['terjadwal'];
            statusCell.innerHTML = `<i class="material-icons" title="${config.text}">${config.icon}</i> ${config.text}`;
            statusCell.className = config.class;
            statusCell.style.opacity = "1";
          }, 150);
        }
      }
    });

    // Update schedules array
    setSchedules(newSchedules);

  } catch (error) {
    console.error("Error in smart status update:", error);
  }
}

/**
 * Attaches event listeners to schedule action buttons
 */
async function attachScheduleActionListeners() {
  const schedules = getSchedules();

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
      
      // ✅ PERBAIKAN: Pastikan ini di-call SEBELUM populate form
      if (window.afterEditMeetingModalOpen) {
        window.afterEditMeetingModalOpen();
      }

      try {
        await populateMeetingEditForm(scheduleToEdit);
      } catch (error) {
        console.error("Error saat mengisi form meeting:", error);
        Swal.fire("Error", "Gagal memuat data ruangan rapat", "error");
      }

      // ✅ PERBAIKAN: Setup event listeners untuk form
      const editForm = document.getElementById("editMeetingForm");
      if (editForm) {
        editForm.addEventListener("submit", handleMeetingFormSubmit);
      }

      const cancelBtn = document.getElementById("cancel-edit-meeting-btn");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", (e) => {
          e.preventDefault();
          window.closeEditModal();
        });
      }

      await initEditMeetingContactListeners();
    } else {
      window.showEditModal("Edit Jadwal Pesan");
      modalBody.innerHTML = createMessageEditFormHtml(scheduleToEdit);
      populateMessageEditForm(scheduleToEdit);

      const editForm = document.getElementById("editReminderForm");
      if (editForm) {
        editForm.addEventListener("submit", handleReminderFormSubmit);
      }

      const cancelBtn = document.getElementById("cancel-edit-message-btn");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", (e) => {
          e.preventDefault();
          window.closeEditModal();
        });
      }
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