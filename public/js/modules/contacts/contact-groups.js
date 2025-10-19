// contact-groups.js - Contact Group Selection Logic Module
// FIXED: Proper getter functions untuk selectedContactGroups dan selectedEditContactGroups

export let selectedGroups = new Set();
export let selectedMeetingGroups = new Set();

let groups = [];

/**
 * Set groups data (called from contact-manager)
 */
export function setGroups(groupsData) {
  groups = groupsData;
}

/**
 * Get groups data
 */
export function getGroups() {
  return groups;
}

/**
 * FIXED: Get reference to selectedContactGroups dari contact-manager
 */
function getSelectedContactGroups() {
  try {
    if (window.contactManagerModule && window.contactManagerModule.selectedContactGroups) {
      return window.contactManagerModule.selectedContactGroups;
    }
  } catch (e) {
    console.warn("selectedContactGroups tidak tersedia:", e);
  }
  return new Set();
}

/**
 * FIXED: Get reference to selectedEditContactGroups dari contact-manager
 */
function getSelectedEditContactGroups() {
  try {
    if (window.contactManagerModule && window.contactManagerModule.selectedEditContactGroups) {
      return window.contactManagerModule.selectedEditContactGroups;
    }
  } catch (e) {
    console.warn("selectedEditContactGroups tidak tersedia:", e);
  }
  return new Set();
}

/**
 * Render group checkbox list for Contact CRUD form (Add)
 */
export function renderContactCrudGroupList(searchQuery = "") {
  const list = document.getElementById("contactCrudGroupList");
  if (!list) return;

  list.innerHTML = "";
  const selectedContactGroups = getSelectedContactGroups();

  if (groups.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <i class="fa-solid fa-users" style="font-size: 32px; color: #cbd5e0; margin-bottom: 8px;"></i>
        <p style="color: #a0aec0; margin: 0; font-size: 13px;">Belum ada grup tersedia</p>
      </div>
    `;
    return;
  }

  const filteredGroups = searchQuery
    ? groups.filter((g) =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : groups;

  if (filteredGroups.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <i class="fa-solid fa-search" style="font-size: 32px; color: #cbd5e0; margin-bottom: 8px;"></i>
        <p style="color: #a0aec0; margin: 0; font-size: 13px;">Tidak ada grup ditemukan</p>
      </div>
    `;
    return;
  }

  filteredGroups.forEach((group) => {
    const label = document.createElement("label");
    const isChecked = selectedContactGroups.has(group.name) ? "checked" : "";

    let memberCount = 0;
    try {
      const members = JSON.parse(group.members || "[]");
      memberCount = members.length;
    } catch (e) {
      console.error("Error parsing group members:", e);
    }

    label.innerHTML = `
      <input type="checkbox" class="contact-crud-group-checkbox" value="${group.name}" ${isChecked} />
      <strong>${group.name}</strong> <small>(${memberCount} anggota)</small>
    `;
    list.appendChild(label);
  });

  document
    .querySelectorAll(".contact-crud-group-checkbox")
    .forEach((checkbox) => {
      checkbox.addEventListener("change", function () {
        const selectedContactGroups = getSelectedContactGroups();
        if (this.checked) {
          selectedContactGroups.add(this.value);
        } else {
          selectedContactGroups.delete(this.value);
        }
        updateContactCrudGroupInfo();
      });
    });

  updateContactCrudGroupInfo();
}

/**
 * Update selected group info for contact CRUD
 */
function updateContactCrudGroupInfo() {
  const infoDiv = document.getElementById("contactCrudGroupInfo");
  if (!infoDiv) return;

  const selectedContactGroups = getSelectedContactGroups();

  if (selectedContactGroups.size === 0) {
    infoDiv.innerHTML =
      "<small style='color: #a0aec0;'>Belum ada grup dipilih</small>";
    return;
  }

  const groupNames = Array.from(selectedContactGroups).join(", ");
  infoDiv.innerHTML = `
    <small style='color: #2d3748;'>
      <strong>${selectedContactGroups.size} grup dipilih:</strong> ${groupNames}
    </small>
  `;
}

/**
 * Render group checkbox list for Edit Contact Modal
 */
export function renderEditContactGroupList(searchQuery = "") {
  const list = document.getElementById("editContactGroupList");
  if (!list) return;

  list.innerHTML = "";
  const selectedEditContactGroups = getSelectedEditContactGroups();

  if (groups.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <i class="fa-solid fa-users" style="font-size: 32px; color: #cbd5e0; margin-bottom: 8px;"></i>
        <p style="color: #a0aec0; margin: 0; font-size: 13px;">Belum ada grup tersedia</p>
      </div>
    `;
    return;
  }

  const filteredGroups = searchQuery
    ? groups.filter((g) =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : groups;

  if (filteredGroups.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <i class="fa-solid fa-search" style="font-size: 32px; color: #cbd5e0; margin-bottom: 8px;"></i>
        <p style="color: #a0aec0; margin: 0; font-size: 13px;">Tidak ada grup ditemukan</p>
      </div>
    `;
    return;
  }

  filteredGroups.forEach((group) => {
    const label = document.createElement("label");
    const isChecked = selectedEditContactGroups.has(group.name)
      ? "checked"
      : "";

    let memberCount = 0;
    try {
      const members = JSON.parse(group.members || "[]");
      memberCount = members.length;
    } catch (e) {
      console.error("Error parsing group members:", e);
    }

    label.innerHTML = `
      <input type="checkbox" class="edit-contact-group-checkbox" value="${group.name}" ${isChecked} />
      <strong>${group.name}</strong> <small>(${memberCount} anggota)</small>
    `;
    list.appendChild(label);
  });

  document
    .querySelectorAll(".edit-contact-group-checkbox")
    .forEach((checkbox) => {
      checkbox.addEventListener("change", function () {
        const selectedEditContactGroups = getSelectedEditContactGroups();
        if (this.checked) {
          selectedEditContactGroups.add(this.value);
        } else {
          selectedEditContactGroups.delete(this.value);
        }
        updateEditContactGroupInfo();
      });
    });

  updateEditContactGroupInfo();
}

/**
 * Update selected group info for edit contact
 */
function updateEditContactGroupInfo() {
  const infoDiv = document.getElementById("editContactGroupInfo");
  if (!infoDiv) return;

  const selectedEditContactGroups = getSelectedEditContactGroups();

  if (selectedEditContactGroups.size === 0) {
    infoDiv.innerHTML =
      "<small style='color: #a0aec0;'>Belum ada grup dipilih</small>";
    return;
  }

  const groupNames = Array.from(selectedEditContactGroups).join(", ");
  infoDiv.innerHTML = `
    <small style='color: #2d3748;'>
      <strong>${selectedEditContactGroups.size} grup dipilih:</strong> ${groupNames}
    </small>
  `;
}

/**
 * Renders group selection list untuk message form dengan search
 */
export function renderGroupSelectionList(searchQuery = "") {
  const list = document.getElementById("groupSelectionList");
  if (!list) return;

  list.innerHTML = "";

  if (groups.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding: 40px 20px;">
        <i class="fa-solid fa-users" style="font-size: 48px; color: #cbd5e0; margin-bottom: 12px;"></i>
        <p style="color: #a0aec0; margin: 0; font-size: 14px;">Belum ada grup tersedia</p>
      </div>
    `;
    return;
  }

  const filteredGroups = searchQuery
    ? groups.filter((g) =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : groups;

  if (filteredGroups.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding: 40px 20px;">
        <i class="fa-solid fa-search" style="font-size: 48px; color: #cbd5e0; margin-bottom: 12px;"></i>
        <p style="color: #a0aec0; margin: 0; font-size: 14px;">Tidak ada grup ditemukan dengan kata kunci "${searchQuery}"</p>
      </div>
    `;
    return;
  }

  filteredGroups.forEach((group) => {
    const label = document.createElement("label");
    const isChecked = selectedGroups.has(group.id) ? "checked" : "";

    let memberCount = 0;
    try {
      const members = JSON.parse(group.members || "[]");
      memberCount = members.length;
    } catch (e) {
      console.error("Error parsing group members:", e);
    }

    label.innerHTML = `
      <input type="checkbox" class="group-selection-checkbox" value="${group.id}" data-group-name="${group.name}" ${isChecked} />
      <strong>${group.name}</strong> <small>${memberCount} anggota</small>
    `;
    list.appendChild(label);
  });

  document.querySelectorAll(".group-selection-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      if (this.checked) {
        selectedGroups.add(parseInt(this.value));
      } else {
        selectedGroups.delete(parseInt(this.value));
      }
      updateGroupSelectionInfo();
    });
  });

  updateGroupSelectionInfo();
}

/**
 * Renders group selection list untuk meeting form dengan search
 */
export function renderMeetingGroupSelectionList(searchQuery = "") {
  const list = document.getElementById("meetingGroupSelectionList");
  if (!list) return;

  list.innerHTML = "";

  if (groups.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding: 40px 20px;">
        <i class="fa-solid fa-users" style="font-size: 48px; color: #cbd5e0; margin-bottom: 12px;"></i>
        <p style="color: #a0aec0; margin: 0; font-size: 14px;">Belum ada grup tersedia</p>
      </div>
    `;
    return;
  }

  const filteredGroups = searchQuery
    ? groups.filter((g) =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : groups;

  if (filteredGroups.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding: 40px 20px;">
        <i class="fa-solid fa-search" style="font-size: 48px; color: #cbd5e0; margin-bottom: 12px;"></i>
        <p style="color: #a0aec0; margin: 0; font-size: 14px;">Tidak ada grup ditemukan dengan kata kunci "${searchQuery}"</p>
      </div>
    `;
    return;
  }

  filteredGroups.forEach((group) => {
    const label = document.createElement("label");
    const isChecked = selectedMeetingGroups.has(group.id) ? "checked" : "";

    let memberCount = 0;
    try {
      const members = JSON.parse(group.members || "[]");
      memberCount = members.length;
    } catch (e) {
      console.error("Error parsing group members:", e);
    }

    label.innerHTML = `
      <input type="checkbox" class="meeting-group-selection-checkbox" value="${group.id}" data-group-name="${group.name}" ${isChecked} />
      <strong>${group.name}</strong> <small>${memberCount} anggota</small>
    `;
    list.appendChild(label);
  });

  document
    .querySelectorAll(".meeting-group-selection-checkbox")
    .forEach((checkbox) => {
      checkbox.addEventListener("change", function () {
        if (this.checked) {
          selectedMeetingGroups.add(parseInt(this.value));
        } else {
          selectedMeetingGroups.delete(parseInt(this.value));
        }
        updateMeetingGroupSelectionInfo();
      });
    });

  updateMeetingGroupSelectionInfo();
}

/**
 * Update info grup yang dipilih untuk message form
 */
function updateGroupSelectionInfo() {
  const infoDiv = document.getElementById("groupSelectionInfo");
  if (!infoDiv) return;

  if (selectedGroups.size === 0) {
    infoDiv.innerHTML = "<small>Belum ada grup dipilih</small>";
    return;
  }

  const selectedGroupNames = Array.from(selectedGroups)
    .map((id) => {
      const group = groups.find((g) => g.id === id);
      return group ? group.name : "";
    })
    .filter((name) => name);

  let totalMembers = 0;
  selectedGroups.forEach((id) => {
    const group = groups.find((g) => g.id === id);
    if (group && group.members) {
      try {
        const members = JSON.parse(group.members);
        totalMembers += members.length;
      } catch (e) {}
    }
  });

  infoDiv.innerHTML = `
    <small>
      <strong>${selectedGroups.size} grup dipilih</strong> (${totalMembers} anggota)<br>
      ${selectedGroupNames.join(", ")}
    </small>
  `;
}

/**
 * Update info grup yang dipilih untuk meeting form
 */
function updateMeetingGroupSelectionInfo() {
  const infoDiv = document.getElementById("meetingGroupSelectionInfo");
  if (!infoDiv) return;

  if (selectedMeetingGroups.size === 0) {
    infoDiv.innerHTML = "<small>Belum ada grup dipilih</small>";
    return;
  }

  const selectedGroupNames = Array.from(selectedMeetingGroups)
    .map((id) => {
      const group = groups.find((g) => g.id === id);
      return group ? group.name : "";
    })
    .filter((name) => name);

  let totalMembers = 0;
  selectedMeetingGroups.forEach((id) => {
    const group = groups.find((g) => g.id === id);
    if (group && group.members) {
      try {
        const members = JSON.parse(group.members);
        totalMembers += members.length;
      } catch (e) {}
    }
  });

  infoDiv.innerHTML = `
    <small>
      <strong>${selectedMeetingGroups.size} grup dipilih</strong> (${totalMembers} anggota)<br>
      ${selectedGroupNames.join(", ")}
    </small>
  `;
}

/**
 * Mendapatkan semua nomor dari grup yang dipilih
 */
export function getNumbersFromSelectedGroups(isForMeeting = false) {
  const selectedGroupSet = isForMeeting
    ? selectedMeetingGroups
    : selectedGroups;
  const numbers = new Set();

  selectedGroupSet.forEach((groupId) => {
    const group = groups.find((g) => g.id === groupId);
    if (group && group.members) {
      try {
        const members = JSON.parse(group.members);
        members.forEach((number) => numbers.add(number));
      } catch (e) {
        console.error("Error parsing group members:", e);
      }
    }
  });

  return Array.from(numbers);
}

/**
 * Clear all selected groups
 */
export function clearSelectedGroups() {
  selectedGroups.clear();
}

export function clearSelectedMeetingGroups() {
  selectedMeetingGroups.clear();
}

/**
 * Initialize group selection listeners for message form
 */
export function initGroupSelectionListeners() {
  const groupSearch = document.getElementById("groupSearch");
  if (groupSearch) {
    groupSearch.addEventListener("input", function () {
      renderGroupSelectionList(this.value);
    });
  }

  const selectAllGroupsBtn = document.getElementById("selectAllGroupsBtn");
  if (selectAllGroupsBtn) {
    selectAllGroupsBtn.addEventListener("click", function () {
      const groupSearch = document.getElementById("groupSearch");
      const searchQuery = groupSearch
        ? groupSearch.value.toLowerCase().trim()
        : "";

      const filteredGroups = searchQuery
        ? groups.filter((g) => g.name.toLowerCase().includes(searchQuery))
        : groups;

      filteredGroups.forEach((group) => selectedGroups.add(group.id));
      renderGroupSelectionList(searchQuery);
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }

  const deselectAllGroupsBtn = document.getElementById("deselectAllGroupsBtn");
  if (deselectAllGroupsBtn) {
    deselectAllGroupsBtn.addEventListener("click", function () {
      const groupSearch = document.getElementById("groupSearch");
      const searchQuery = groupSearch
        ? groupSearch.value.toLowerCase().trim()
        : "";

      const filteredGroups = searchQuery
        ? groups.filter((g) => g.name.toLowerCase().includes(searchQuery))
        : groups;

      filteredGroups.forEach((group) => selectedGroups.delete(group.id));
      renderGroupSelectionList(searchQuery);
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }
}

/**
 * Initialize group selection listeners for meeting form
 */
export function initMeetingGroupSelectionListeners() {
  const meetingGroupSearch = document.getElementById("meetingGroupSearch");
  if (meetingGroupSearch) {
    meetingGroupSearch.addEventListener("input", function () {
      renderMeetingGroupSelectionList(this.value);
    });
  }

  const selectAllMeetingGroupsBtn = document.getElementById(
    "selectAllMeetingGroupsBtn"
  );
  if (selectAllMeetingGroupsBtn) {
    selectAllMeetingGroupsBtn.addEventListener("click", function () {
      const groupSearch = document.getElementById("meetingGroupSearch");
      const searchQuery = groupSearch
        ? groupSearch.value.toLowerCase().trim()
        : "";

      const filteredGroups = searchQuery
        ? groups.filter((g) => g.name.toLowerCase().includes(searchQuery))
        : groups;

      filteredGroups.forEach((group) => selectedMeetingGroups.add(group.id));
      renderMeetingGroupSelectionList(searchQuery);
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }

  const deselectAllMeetingGroupsBtn = document.getElementById(
    "deselectAllMeetingGroupsBtn"
  );
  if (deselectAllMeetingGroupsBtn) {
    deselectAllMeetingGroupsBtn.addEventListener("click", function () {
      const groupSearch = document.getElementById("meetingGroupSearch");
      const searchQuery = groupSearch
        ? groupSearch.value.toLowerCase().trim()
        : "";

      const filteredGroups = searchQuery
        ? groups.filter((g) => g.name.toLowerCase().includes(searchQuery))
        : groups;

      filteredGroups.forEach((group) => selectedMeetingGroups.delete(group.id));
      renderMeetingGroupSelectionList(searchQuery);
      this.classList.add("active");
      setTimeout(() => this.classList.remove("active"), 300);
    });
  }
}

