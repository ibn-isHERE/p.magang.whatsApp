// ui-helpers.js - UI Helper Functions Module (FIXED - Clear selections on modal close)

/**
 * Shows a specific form/tab and hides others
 */
export function showForm(formId) {
  document.querySelectorAll(".form-content").forEach((form) => {
    form.style.display = "none";
    form.classList.remove("active");
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.remove("active");
  });

  const scheduleContainer = document.getElementById("scheduleContainer");
  const chatMainContainer = document.getElementById("chatMainContainer");
  const contactMainContainer = document.getElementById("contactMainContainer");
  const groupMainContainer = document.getElementById("groupMainContainer");

  if (scheduleContainer) scheduleContainer.style.display = "none";
  if (chatMainContainer) chatMainContainer.style.display = "none";
  if (contactMainContainer) contactMainContainer.style.display = "none";
  if (groupMainContainer) groupMainContainer.style.display = "none";

  if (formId === "message") {
    const messageForm = document.getElementById("messageFormContainer");
    if (messageForm) {
      messageForm.style.display = "block";
      messageForm.classList.add("active");
    }
    if (scheduleContainer) scheduleContainer.style.display = "block";
  } 
  else if (formId === "meeting") {
    const meetingForm = document.getElementById("meetingFormContainer");
    if (meetingForm) {
      meetingForm.style.display = "block";
      meetingForm.classList.add("active");
    }
    if (scheduleContainer) scheduleContainer.style.display = "block";
  } 
  else if (formId === "contacts") {
    const contactsForm = document.getElementById("contactsFormContainer");
    if (contactsForm) {
      contactsForm.style.display = "block";
      contactsForm.classList.add("active");
    }
    if (contactMainContainer) contactMainContainer.style.display = "flex";
  } 
  else if (formId === "group") {
    const groupsForm = document.getElementById("groupsFormContainer");
    if (groupsForm) {
      groupsForm.style.display = "block";
      groupsForm.classList.add("active");
    }
    if (groupMainContainer) groupMainContainer.style.display = "flex";
  } 
  else if (formId === "chat") {
    const chatForm = document.getElementById("chatSidebarContainer");
    if (chatForm) {
      chatForm.style.display = "block";
      chatForm.classList.add("active");
    }
    if (chatMainContainer) chatMainContainer.style.display = "flex";
  }

  const selectedTab = document.querySelector(`[onclick="showForm('${formId}')"]`);
  if (selectedTab) {
    selectedTab.classList.add("active");
  }
}

/**
 * Shows edit modal with specified title
 */
export function showEditModal(title) {
  const modal = document.getElementById("editModal");
  document.getElementById("editModalTitle").textContent = title;
  modal.style.display = "block";
}

/**
 * Closes edit modal and resets content
 * ✅ FIXED: Now clears selected contacts to prevent carryover to new schedules
 */
export async function closeEditModal() {
  const modal = document.getElementById("editModal");
  modal.style.display = "none";
  document.getElementById("editModalBody").innerHTML = "";
  
  // ✅ CRITICAL FIX: Clear selected numbers when closing edit modal
  try {
    const contactManager = await import('../contacts/contact-manager.js');
    
    // Clear message form selections
    if (contactManager.selectedNumbers) {
      const prevCount = contactManager.selectedNumbers.size;
      contactManager.selectedNumbers.clear();
      console.log(`✅ Cleared ${prevCount} selectedNumbers on modal close`);
    }
    
    // Clear meeting form selections  
    if (contactManager.selectedMeetingNumbers) {
      const prevCount = contactManager.selectedMeetingNumbers.size;
      contactManager.selectedMeetingNumbers.clear();
      console.log(`✅ Cleared ${prevCount} selectedMeetingNumbers on modal close`);
    }
    
    // Re-render contact lists to reflect cleared selections
    // Small delay to ensure DOM is ready
    setTimeout(async () => {
      try {
        const contactUI = await import('../contacts/contact-ui.js');
        if (contactUI.renderContactList) {
          contactUI.renderContactList();
        }
        if (contactUI.renderMeetingContactList) {
          contactUI.renderMeetingContactList();
        }
        console.log('✅ Contact lists re-rendered after clearing selections');
      } catch (err) {
        console.error('Error re-rendering contact lists:', err);
      }
    }, 100);
    
    console.log('✅ Contact selections cleared successfully on modal close');
    
  } catch (error) {
    console.error('❌ Error clearing selections on modal close:', error);
  }
}

/**
 * Shows media modal with image or video
 */
export function showMediaModal(url, type) {
  const modal = document.getElementById("mediaModal");
  const modalContent = document.getElementById("modalContent");
  const downloadLink = document.getElementById("downloadLink");

  modalContent.innerHTML = "";

  if (type === "image") {
    const img = document.createElement("img");
    img.src = url;
    modalContent.appendChild(img);
  } else if (type === "video") {
    const video = document.createElement("video");
    video.src = url;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    modalContent.appendChild(video);
  }

  downloadLink.href = url;
  modal.style.display = "flex";
}

/**
 * Closes media modal
 */
export function closeMediaModal() {
  const modal = document.getElementById("mediaModal");
  const modalContent = document.getElementById("modalContent");

  const video = modalContent.querySelector("video");
  if (video) {
    video.pause();
  }

  modal.style.display = "none";
  modalContent.innerHTML = "";
}

/**
 * Formats time difference for countdown display
 */
export function formatTimeDifference(scheduledTimeStr) {
  const scheduledTime = new Date(scheduledTimeStr);
  const now = new Date();
  const diffMs = scheduledTime.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Telah Lewat";
  }

  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  const startOfDayScheduled = new Date(
    scheduledTime.getFullYear(),
    scheduledTime.getMonth(),
    scheduledTime.getDate()
  );
  const startOfDayNow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const diffDaysFull = Math.round(
    (startOfDayScheduled.getTime() - startOfDayNow.getTime()) / (1000 * 60 * 60 * 24)
  );

  const timeOptions = { hour: "2-digit", minute: "2-digit", hour12: false };
  const dateOptionsFull = { day: "numeric", month: "short", year: "numeric" };

  if (diffSeconds < 60) {
    return `${diffSeconds} detik lagi`;
  } else if (diffMinutes < 60) {
    return `${diffMinutes} menit lagi`;
  } else if (diffHours < 24 && diffDaysFull === 0) {
    return `${diffHours} jam lagi (${scheduledTime.toLocaleTimeString("id-ID", timeOptions)})`;
  } else if (diffDaysFull === 0) {
    return `Hari ini (${scheduledTime.toLocaleTimeString("id-ID", timeOptions)})`;
  } else if (diffDaysFull === 1) {
    return `Besok (${scheduledTime.toLocaleTimeString("id-ID", timeOptions)})`;
  } else if (diffDaysFull === 2) {
    return `Lusa (${scheduledTime.toLocaleTimeString("id-ID", timeOptions)})`;
  } else if (diffDaysFull > 2 && diffDaysFull < 7) {
    const dayName = scheduledTime.toLocaleDateString("id-ID", { weekday: "long" });
    return `${diffDaysFull} hari lagi (${dayName}) (${scheduledTime.toLocaleDateString("id-ID", dateOptionsFull)})`;
  } else if (diffDaysFull >= 7 && diffDaysFull < 30) {
    const diffWeeks = Math.floor(diffDaysFull / 7);
    const remainingDays = diffDaysFull % 7;
    let weekText = `${diffWeeks} minggu`;
    let dayText = remainingDays > 0 ? ` ${remainingDays} hari` : "";
    let totalDaysText = `(total ${diffDaysFull} hari)`;
    let scheduledDateFormatted = scheduledTime.toLocaleDateString("id-ID", dateOptionsFull);
    let finalString = `${weekText}${dayText} lagi ${totalDaysText} (${scheduledDateFormatted})`;
    if (diffWeeks === 1 && remainingDays === 0) {
      finalString = `Seminggu lagi ${totalDaysText} (${scheduledDateFormatted})`;
    } else if (diffWeeks > 0 && remainingDays === 0) {
      finalString = `${weekText} lagi ${totalDaysText} (${scheduledDateFormatted})`;
    }
    return finalString;
  } else if (diffDaysFull < 365) {
    const diffMonths = Math.floor(diffDaysFull / 30);
    return `${diffMonths} bulan lagi (total ${diffDaysFull} hari) (${scheduledTime.toLocaleDateString("id-ID", dateOptionsFull)})`;
  } else {
    const diffYears = Math.floor(diffDaysFull / 365);
    return `${diffYears} tahun lagi (total ${diffDaysFull} hari) (${scheduledTime.toLocaleDateString("id-ID", { dateStyle: "medium" })})`;
  }
}

/**
 * Plays notification sound
 */
export function playNotificationSound() {
  console.log("Playing notification sound...");
  
  let audio = document.getElementById("notificationSound");
  if (!audio) {
    audio = document.createElement("audio");
    audio.id = "notificationSound";
    audio.preload = "auto";
    document.body.appendChild(audio);
  }
  
  audio.play().catch((e) => {
    console.log("Could not play notification sound:", e.message);
  });
}

/**
 * Shows browser notification
 */
export function showBrowserNotification(messageData) {
  console.log("Showing browser notification for:", messageData);
  
  if ("Notification" in window) {
    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          showNotification(messageData);
        }
      });
    } else if (Notification.permission === "granted") {
      showNotification(messageData);
    }
  }
}

/**
 * Show edit contact modal
 */
export function showEditContactModal() {
  const modal = document.getElementById("editContactModal");
  if (modal) {
    modal.style.display = "block";
  }
}

/**
 * Close edit contact modal
 */
export function closeEditContactModal() {
  const modal = document.getElementById("editContactModal");
  if (modal) {
    modal.style.display = "none";
    document.getElementById("editContactModalBody").innerHTML = "";
  }
}

/**
 * 🆕 Show detail group modal
 */
export function showDetailGroupModal() {
  const modal = document.getElementById('detailGroupModal');
  if (!modal) return;
  modal.style.display = 'block';
}

/**
 * 🆕 Close detail group modal
 */
export function closeDetailGroupModal() {
  const modal = document.getElementById('detailGroupModal');
  if (!modal) return;
  modal.style.display = 'none';
}

/**
 * 🆕 Close add members modal
 */
export function closeAddMembersModal() {
  const modal = document.getElementById('addMembersModal');
  if (!modal) return;
  modal.style.display = 'none';
}

/**
 * Close edit group modal (legacy - still needed for add form)
 */
export function closeEditGroupModal() {
  const modal = document.getElementById('editGroupModal');
  if (!modal) return;
  modal.style.display = 'none';
}

/**
 * Show edit group modal (legacy - still needed for add form)
 */
export function showEditGroupModal() {
  const modal = document.getElementById('editGroupModal');
  if (!modal) return;
  modal.style.display = 'block';
}

/**
 * Internal function to show notification
 */
function showNotification(messageData) {
  const notification = new Notification("Pesan WhatsApp Baru", {
    body: `${messageData.contactName || messageData.fromNumber}: ${messageData.message}`,
    icon: "/favicon.ico",
    tag: "whatsapp-message",
    requireInteraction: false,
  });

  notification.onclick = function () {
    window.focus();
    notification.close();
  };

  setTimeout(() => notification.close(), 5000);
}