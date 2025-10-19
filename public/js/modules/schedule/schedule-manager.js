// schedule-manager.js - Core Schedule Management Functions

let schedules = [];
let currentFilter = "all";

// File management
export let selectedFiles = [];
export let selectedMeetingFiles = [];

/**
 * Gets all schedules
 */
export function getSchedules() {
  return schedules;
}

/**
 * Sets schedules array
 */
export function setSchedules(newSchedules) {
  schedules = newSchedules;
}

/**
 * Gets current filter
 */
export function getCurrentFilter() {
  return currentFilter;
}

/**
 * Sets current filter
 */
export function setCurrentFilter(filter) {
  currentFilter = filter;
}

/**
 * Gets selected files
 */
export function getSelectedFiles() {
  return selectedFiles;
}

/**
 * Gets selected meeting files
 */
export function getSelectedMeetingFiles() {
  return selectedMeetingFiles;
}

/**
 * Sets selected files
 */
export function setSelectedFiles(files) {
  selectedFiles = files;
}

/**
 * Sets selected meeting files
 */
export function setSelectedMeetingFiles(files) {
  selectedMeetingFiles = files;
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

      // Import renderScheduleTable dynamically to avoid circular dependency
      import('./schedule-render.js').then(module => {
        module.renderScheduleTable();
      });
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