// main.js - Main Application Entry Point (DEBUGGING VERSION)

import {
  showForm as showFormOriginal,
  showEditModal,
  closeEditModal,
  showMediaModal,
  closeMediaModal,
  closeEditContactModal,
  closeAddMembersModal,
  closeDetailGroupModal
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

//  IMPORT SIDEBAR MODULE
import { 
  initSidebar, 
  updateChatBadge, 
  setActiveMenuItem 
} from './modules/ui/sidebar.js';

/**
 * Enhanced showForm with proper module loading
 */
async function showForm(formId) {
  showFormOriginal(formId);
  
  //  UPDATE SIDEBAR ACTIVE STATE
  if (window.setActiveMenuItem) {
    window.setActiveMenuItem(formId);
  }
  
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
  
  if (formId === "settings") {
    const instansiManager = await import('./modules/settings/instansi-manager.js');
    const jabatanManager = await import('./modules/settings/jabatan-manager.js');
    
    // Show settings containers
    const instansiContainer = document.getElementById("instansiMainContainer");
    const jabatanContainer = document.getElementById("jabatanMainContainer");
    const contactMainContainer = document.getElementById("contactMainContainer");
    const groupMainContainer = document.getElementById("groupMainContainer");
    
    if (contactMainContainer) contactMainContainer.style.display = "none";
    if (groupMainContainer) groupMainContainer.style.display = "none";
    
    // Load initial data
    await instansiManager.fetchInstansi();
    await jabatanManager.fetchJabatan();
    
    // Show instansi by default
    if (instansiContainer) instansiContainer.style.display = "flex";
    if (jabatanContainer) jabatanContainer.style.display = "none";
    
    // Initialize settings tabs
    initSettingsTabs();
  }
}

function initSettingsTabs() {
  const tabs = document.querySelectorAll('.settings-tab-button');
  const instansiPanel = document.getElementById('instansiPanel');
  const jabatanPanel = document.getElementById('jabatanPanel');
  const instansiContainer = document.getElementById('instansiMainContainer');
  const jabatanContainer = document.getElementById('jabatanMainContainer');

  tabs.forEach(tab => {
    tab.addEventListener('click', async function() {
      const targetTab = this.dataset.tab;

      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');

      // Show/hide panels
      if (targetTab === 'instansi') {
        if (instansiPanel) instansiPanel.style.display = 'block';
        if (jabatanPanel) jabatanPanel.style.display = 'none';
        if (instansiContainer) instansiContainer.style.display = 'flex';
        if (jabatanContainer) jabatanContainer.style.display = 'none';
      } else if (targetTab === 'jabatan') {
        if (instansiPanel) instansiPanel.style.display = 'none';
        if (jabatanPanel) jabatanPanel.style.display = 'block';
        if (instansiContainer) instansiContainer.style.display = 'none';
        if (jabatanContainer) jabatanContainer.style.display = 'flex';
      }
    });
  });
}

/**
 * Main application initialization
 */
async function initApp() {
  console.log("🚀 Starting app initialization...");

  try {
    //  INITIALIZE SIDEBAR FIRST
    console.log("🎯 Initializing sidebar...");
    initSidebar();
    
    // Load all modules dynamically
    const contactManager = await import('./modules/contacts/contact-manager.js');
    const groupManager = await import('./modules/groups/group-manager.js');
    const groupDetail = await import('./modules/groups/group-detail.js');
    const scheduleManager = await import('./modules/schedule/schedule-manager.js');
    const scheduleRender = await import('./modules/schedule/schedule-render.js');
    const chatClient = await import('./modules/chat/chat-client.js');
    const instansiManager = await import('./modules/settings/instansi-manager.js');
    const jabatanManager = await import('./modules/settings/jabatan-manager.js');

    // Export modules to window for onclick handlers
    window.instansiModule = {
      fetchInstansi: instansiManager.fetchInstansi,
      editInstansi: instansiManager.editInstansi,
      showEditInstansiModal: instansiManager.showEditInstansiModal,
      deleteInstansi: instansiManager.deleteInstansi,
      restoreInstansi: instansiManager.restoreInstansi
    };

    window.jabatanModule = {
      fetchJabatan: jabatanManager.fetchJabatan,
      editJabatan: jabatanManager.editJabatan,
      showEditJabatanModal: jabatanManager.showEditJabatanModal,
      deleteJabatan: jabatanManager.deleteJabatan,
      restoreJabatan: jabatanManager.restoreJabatan
    };

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
    window.closeDetailGroupModal = closeDetailGroupModal;
    window.showNotification = showNotification;
    
    //  EXPORT SIDEBAR FUNCTIONS TO WINDOW
    window.updateChatBadge = updateChatBadge;
    window.setActiveMenuItem = setActiveMenuItem;

    // Export contact manager to window for references
    window.contactManagerModule = contactManager;

    // Initialize contact management
    await contactManager.initContactListeners();
    instansiManager.initInstansiListeners();
    jabatanManager.initJabatanListeners();

    
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
        
        //  Update instansi & jabatan dropdowns
        await instansiManager.fetchInstansi();
        await jabatanManager.fetchJabatan();
        
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
    
    await groupManager.fetchAndRenderGroups();
    await contactManager.fetchGroupsForDropdown();
    await contactManager.fetchAndRenderContacts();
    await instansiManager.fetchInstansi();
    await jabatanManager.fetchJabatan();
    
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
    
    console.log(" Initial data loaded successfully");
    
    await scheduleManager.loadMeetingRooms();
    scheduleManager.updateFilterButtonActiveState("all");
    await scheduleRender.renderScheduleTable();

    console.log("💬 Initializing chat system...");
    chatClient.initChatSystem();

    initSmoothAnimations();

    // Start countdown timer updates
    setInterval(() => scheduleRender.updateCountdownTimers(), 1000);

    console.log(" App initialization complete");
    
  } catch (error) {
    console.error("❌ Error during app initialization:", error);
    showNotification('Error', 'Gagal menginisialisasi aplikasi. Silakan refresh halaman.', 'error');
  }
}

/**
 * Setup button listeners PROPERLY
 */
function setupImportButtons() {
  console.log('🔧 Setting up import buttons...');
  
  // CSV Template Button
  const csvBtn = document.getElementById('downloadCSVTemplate');
  if (csvBtn) {
    // Remove old listeners by cloning
    const newCsvBtn = csvBtn.cloneNode(true);
    csvBtn.replaceWith(newCsvBtn);
    
    newCsvBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log(' CSV button clicked, calling downloadCSVTemplate');
      window.downloadCSVTemplate();
    });
    console.log(' CSV Template button setup complete');
  } else {
    console.warn('⚠️ CSV button not found in DOM');
  }
  
  // Excel Guide Button
  const excelBtn = document.getElementById('showExcelGuide');
  if (excelBtn) {
    const newExcelBtn = excelBtn.cloneNode(true);
    excelBtn.replaceWith(newExcelBtn);
    
    newExcelBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log(' Excel button clicked, calling downloadExcelTemplate');
      window.downloadExcelTemplate();
    });
    console.log(' Excel Guide button setup complete');
  } else {
    console.warn('⚠️ Excel button not found in DOM');
  }
  
  // Help Button
  const helpBtn = document.querySelector('.import-help-btn');
  if (helpBtn) {
    const newHelpBtn = helpBtn.cloneNode(true);
    helpBtn.replaceWith(newHelpBtn);
    
    newHelpBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log(' Help button clicked, calling showImportHelp');
      window.showImportHelp();
    });
    console.log(' Help button setup complete');
  } else {
    console.warn('⚠️ Help button not found in DOM');
  }
}

/**
 * Initialize import functionality
 */
async function initImportSystem() {
  try {
    console.log(' Starting import system initialization...');
    
    const importModule = await import('./modules/contacts/contact-import.js');
    const { 
      initContactImport, 
      downloadCSVTemplate, 
      downloadExcelTemplate,
      showImportHelp 
    } = importModule;
    
    console.log(' Import module loaded successfully');
    
    // Export functions to window IMMEDIATELY
    window.downloadCSVTemplate = downloadCSVTemplate;
    window.downloadExcelTemplate = downloadExcelTemplate;
    window.showImportHelp = showImportHelp;
    
    console.log(' Functions exported to window:');
    console.log('   - window.downloadCSVTemplate:', typeof window.downloadCSVTemplate);
    console.log('   - window.downloadExcelTemplate:', typeof window.downloadExcelTemplate);
    console.log('   - window.showImportHelp:', typeof window.showImportHelp);
    
    // Initialize form handlers
    initContactImport();
    console.log(' initContactImport() called');
    
    // Small delay to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Setup button listeners
    setupImportButtons();
    
    console.log(' Import system fully initialized');
    
  } catch (error) {
    console.error('❌ Error initializing import system:', error);
    console.error('Stack:', error.stack);
  }
}

/**
 * DOM Content Loaded Handler
 */
document.addEventListener('DOMContentLoaded', async function() {
  console.log('📄 DOM Content Loaded - Starting initialization');
  
  try {
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

    // Initialize import system FIRST with error handling
    console.log('Step 1: Initializing import system...');
    await initImportSystem();
    console.log('Step 1:  Import system ready');
    
    // Initialize main app
    console.log('Step 2: Initializing main app...');
    await initApp();
    console.log('Step 2:  Main app ready');
    
    console.log(' ALL INITIALIZATION COMPLETE ');
    
  } catch (error) {
    console.error('❌ Critical error during initialization:', error);
    console.error('Stack trace:', error.stack);
    
    // Show user-friendly error message
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memuat Aplikasi',
        html: `
          <div style="text-align: left; padding: 10px;">
            <p style="color: #e53e3e; margin-bottom: 12px;">
              <strong>Terjadi kesalahan saat memuat aplikasi.</strong>
            </p>
            <div style="background: #fff5f5; padding: 12px; border-radius: 6px; border-left: 4px solid #f56565;">
              <small style="color: #742a2a; font-family: monospace; word-break: break-word;">${error.message}</small>
            </div>
            <p style="margin-top: 16px; color: #4a5568; font-size: 13px;">
              Silakan refresh halaman atau hubungi administrator jika masalah berlanjut.
            </p>
          </div>
        `,
        confirmButtonText: 'Refresh Halaman',
        confirmButtonColor: '#4299e1',
        showCancelButton: true,
        cancelButtonText: 'Tutup',
        cancelButtonColor: '#718096'
      }).then((result) => {
        if (result.isConfirmed) {
          location.reload();
        }
      });
    } else {
      alert('Gagal memuat aplikasi. Error: ' + error.message);
    }
  }
});

/**
 * Handle page visibility change
 */
document.addEventListener('visibilitychange', function() {
  if (!document.hidden) {
    console.log('📱 Page became visible - checking for updates...');
  }
});

/**
 * Handle before unload (cleanup)
 */
window.addEventListener('beforeunload', function() {
  console.log('👋 Page unloading - cleaning up...');
});

/**
 * Global error handler
 */
window.addEventListener('error', function(event) {
  console.error('🔴 Global error caught:', event.error);
});

/**
 * Unhandled promise rejection handler
 */
window.addEventListener('unhandledrejection', function(event) {
  console.error('🔴 Unhandled promise rejection:', event.reason);
});

console.log(' main.js loaded and ready');