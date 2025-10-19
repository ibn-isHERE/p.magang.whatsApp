// main.js - Main Application Entry Point (FIXED)

import {
  showForm as showFormOriginal,
  showEditModal,
  closeEditModal,
  showMediaModal,
  closeMediaModal,
  closeEditContactModal,
  closeAddMembersModal        
} from './modules/ui/ui-helpers.js';

import {
  initReminderForm,
  initMeetingForm,
  initFileUploadListener,
  initMeetingFileUploadListener,
  initFileUploadLabelHandlers,
  initMediaModalListeners,
  initSmoothAnimations,
  initRealtimeScheduleUpdates,
  showNotification
} from './modules/events/event-handlers.js';

/**
 * Enhanced showForm with proper module loading
 */
async function showForm(formId) {
  showFormOriginal(formId);
  
  if (formId === "contacts") {
    const contactManager = await import('./modules/contacts/contact-manager.js');
    const contactUI = await import('./modules/contacts/contact-ui.js');
    await contactManager.fetchAndRenderContacts();
      contactUI.initBulkDeleteListeners();
    
    const contactMainContainer = document.getElementById("contactMainContainer");
    const groupMainContainer = document.getElementById("groupMainContainer");
    if (contactMainContainer) contactMainContainer.style.display = "flex";
    if (groupMainContainer) groupMainContainer.style.display = "none";
  }
  
  if (formId === "group") {
    const groupManager = await import('./modules/groups/group-manager.js');
    await groupManager.fetchAndRenderGroups();
      contactUI.initBulkDeleteListeners();
    
    const contactMainContainer = document.getElementById("contactMainContainer");
    const groupMainContainer = document.getElementById("groupMainContainer");
    if (contactMainContainer) contactMainContainer.style.display = "none";
    if (groupMainContainer) groupMainContainer.style.display = "flex";
  }
  
  if (formId === "meeting") {
    const contactManager = await import('./modules/contacts/contact-manager.js');
    const contactUI = await import('./modules/contacts/contact-ui.js');
    const contactGroups = await import('./modules/contacts/contact-groups.js');
    
    
    contactUI.renderMeetingContactList();
    contactGroups.renderMeetingGroupSelectionList();
    contactManager.initMeetingFormTabs();
  }
  
  if (formId === "message") {
    const contactManager = await import('./modules/contacts/contact-manager.js');
    const contactUI = await import('./modules/contacts/contact-ui.js');
    const contactGroups = await import('./modules/contacts/contact-groups.js');
    
    contactUI.renderContactList();
    contactGroups.renderGroupSelectionList();
    contactManager.initMessageFormTabs();
    contactUI.initBulkDeleteListeners();
  }
  
  if (formId === "chat") {
    const chatClient = await import('./modules/chat/chat-client.js');
    const { getChatConversations } = chatClient;
    if (getChatConversations) {
      // Load conversations when chat tab is shown
    }
  }
}

/**
 * Main application initialization
 */
async function initApp() {
  console.log("🚀 Starting app initialization...");

  // Load all modules dynamically
  const contactManager = await import('./modules/contacts/contact-manager.js');
  const groupManager = await import('./modules/groups/group-manager.js');
  const groupDetail = await import('./modules/groups/group-detail.js');
  const scheduleManager = await import('./modules/schedule/schedule-manager.js');
  const scheduleRender = await import('./modules/schedule/schedule-render.js');
  const chatClient = await import('./modules/chat/chat-client.js');

  // Export modules to window for onclick handlers
  window.groupModule = {
    fetchAndRenderGroups: groupManager.fetchAndRenderGroups,
    showGroupDetail: groupDetail.showGroupDetail,
    deleteGroup: groupManager.deleteGroup,
    resetGroupForm: groupManager.resetGroupForm,
    renderGroupContactChecklist: groupManager.renderGroupContactChecklist
  };

  window.contactModule = {
    showEditContactForm: contactManager.showEditContactForm,
    deleteContact: contactManager.deleteContact
  };

  // Export UI helpers to window
  window.showForm = showForm;
  window.showEditModal = showEditModal;
  window.closeEditModal = closeEditModal;
  window.showMediaModal = showMediaModal;
  window.closeMediaModal = closeMediaModal;
  window.closeEditContactModal = closeEditContactModal;
  window.closeAddMembersModal = closeAddMembersModal;
  window.showNotification = showNotification;

  // Export contact manager to window for references
  window.contactManagerModule = contactManager;

  // Initialize contact management
  await contactManager.initContactListeners();
  
  // Initialize file uploads
  initFileUploadListener();
  initMeetingFileUploadListener();
  initFileUploadLabelHandlers();
  
  // Initialize schedule management
  scheduleManager.initFilterButtons();
  initReminderForm();
  initMeetingForm();
  await contactManager.initMeetingContactListeners();
  
  // Initialize media modal
  initMediaModalListeners();

  // Initialize realtime updates
  await initRealtimeScheduleUpdates();

  // Contact CRUD form
  const contactForm = document.getElementById("contact-crud-form");
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      await contactManager.handleContactFormSubmit(e);
      await contactManager.fetchGroupsForDropdown();
      window.groupModule.renderGroupContactChecklist(); 
    });
  }

  // Group CRUD form
  const groupForm = document.getElementById("group-crud-form");
  if (groupForm) {
    groupForm.addEventListener("submit", groupManager.handleGroupFormSubmit); 
  }

  // Group Cancel listener
  const groupCancelBtn = document.getElementById("group-crud-cancel");
  if (groupCancelBtn) {
    groupCancelBtn.addEventListener("click", groupManager.resetGroupForm);
  }
  
  // Initialize group form listeners
  groupManager.initGroupFormListeners();

  const contactCancelBtn = document.getElementById("contact-crud-cancel");
  if (contactCancelBtn) {
    contactCancelBtn.addEventListener("click", contactManager.resetContactCrudForm);
  }

  // Load initial data
  console.log("📊 Loading initial data...");
  
  try {
    await groupManager.fetchAndRenderGroups();
    await contactManager.fetchGroupsForDropdown();
    await contactManager.fetchAndRenderContacts();
    
    // Wait for DOM rendering
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const contactUI = await import('./modules/contacts/contact-ui.js');
    const contactGroups = await import('./modules/contacts/contact-groups.js');
    
    contactUI.renderContactList();
    contactUI.renderMeetingContactList();
    contactGroups.renderGroupSelectionList();
    contactGroups.renderMeetingGroupSelectionList();
    window.groupModule.renderGroupContactChecklist(); 
    
    contactManager.initMessageFormTabs();
    contactManager.initMeetingFormTabs();
    
    console.log("✅ Initial data loaded successfully");
  } catch (error) {
    console.error("❌ Error loading initial data:", error);
  }
  
  await scheduleManager.loadMeetingRooms();
  scheduleManager.updateFilterButtonActiveState("all");
  await scheduleRender.renderScheduleTable();

  console.log("💬 Initializing chat system...");
  chatClient.initChatSystem();

  initSmoothAnimations();

  // Start countdown timer updates
  setInterval(() => scheduleRender.updateCountdownTimers(), 1000);

  console.log("✅ App initialization complete");
}

/**
 * Modal click handlers
 */
document.addEventListener('DOMContentLoaded', function() {
  // Close modals on outside click
  document.addEventListener('click', function(e) {
    const detailModal = document.getElementById('detailGroupModal');
    if (detailModal && e.target === detailModal) {
      closeDetailGroupModal();
    }
    
    const addMembersModal = document.getElementById('addMembersModal');
    if (addMembersModal && e.target === addMembersModal) {
      closeAddMembersModal();
    }
  });

  // Initialize app
  initApp();
});