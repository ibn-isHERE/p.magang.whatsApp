// init.js - SIMPLIFIED VERSION (NO INFINITE LOOP)
// Location: public/js/init.js

(function() {
  'use strict';
  
  console.log('🔧 Loading init.js...');
  
  // Track if modules are loaded
  let modulesReady = false;
  let moduleCheckAttempts = 0;
  const MAX_ATTEMPTS = 200; // 10 seconds (50ms * 200)
  
  // Store pending calls
  const pendingCalls = [];
  
  /**
   * Process a pending call
   */
  function processPendingCall(call) {
    try {
      if (window[call.fnName] && typeof window[call.fnName] === 'function') {
        window[call.fnName].apply(call.context, call.args);
        return true;
      }
    } catch (e) {
      console.error('[init.js] Error executing', call.fnName, ':', e);
    }
    return false;
  }
  
  /**
   * Wait for modules to load
   */
  function waitForModules() {
    const interval = setInterval(() => {
      moduleCheckAttempts++;
      
      // Check if main module function is available
      if (window.moduleShowForm || (window.showForm && window.showForm !== tempShowForm)) {
        clearInterval(interval);
        modulesReady = true;
        console.log('✅ Modules loaded!');
        
        // Replace temp functions with real ones
        if (window.moduleShowForm) {
          window.showForm = window.moduleShowForm;
        }
        
        // Process pending calls
        if (pendingCalls.length > 0) {
          console.log(`Processing ${pendingCalls.length} pending calls...`);
          pendingCalls.forEach(processPendingCall);
          pendingCalls.length = 0;
        }
        
        return;
      }
      
      // Timeout after MAX_ATTEMPTS
      if (moduleCheckAttempts >= MAX_ATTEMPTS) {
        clearInterval(interval);
        console.error('❌ Modules failed to load after 10 seconds');
        console.error('Please check:');
        console.error('1. Is main.js loaded correctly?');
        console.error('2. Check browser console for import errors');
        console.error('3. Check Network tab for 404 errors');
      }
    }, 50);
  }
  
  /**
   * Temporary showForm function
   */
  function tempShowForm(formId) {
    console.log('[init.js] showForm called:', formId);
    
    // If modules ready, call real function
    if (modulesReady && window.moduleShowForm) {
      return window.moduleShowForm(formId);
    }
    
    // Otherwise, queue the call
    console.log('[init.js] Queueing call to showForm');
    pendingCalls.push({
      fnName: 'moduleShowForm',
      args: [formId],
      context: this
    });
  }
  
  /**
   * Create temporary stubs
   */
  window.showForm = tempShowForm;
  
  window.showEditModal = function(title) {
    if (modulesReady && window.moduleShowEditModal) {
      return window.moduleShowEditModal(title);
    }
    pendingCalls.push({ fnName: 'moduleShowEditModal', args: [title], context: this });
  };
  
  window.closeEditModal = function() {
    if (modulesReady && window.moduleCloseEditModal) {
      return window.moduleCloseEditModal();
    }
    pendingCalls.push({ fnName: 'moduleCloseEditModal', args: [], context: this });
  };
  
  window.showMediaModal = function(url, type) {
    if (modulesReady && window.moduleShowMediaModal) {
      return window.moduleShowMediaModal(url, type);
    }
    pendingCalls.push({ fnName: 'moduleShowMediaModal', args: [url, type], context: this });
  };
  
  window.closeMediaModal = function() {
    if (modulesReady && window.moduleCloseMediaModal) {
      return window.moduleCloseMediaModal();
    }
    pendingCalls.push({ fnName: 'moduleCloseMediaModal', args: [], context: this });
  };
  
  window.showEditContactModal = function() {
    if (modulesReady && window.moduleShowEditContactModal) {
      return window.moduleShowEditContactModal();
    }
    pendingCalls.push({ fnName: 'moduleShowEditContactModal', args: [], context: this });
  };
  
  window.closeEditContactModal = function() {
    if (modulesReady && window.moduleCloseEditContactModal) {
      return window.moduleCloseEditContactModal();
    }
    pendingCalls.push({ fnName: 'moduleCloseEditContactModal', args: [], context: this });
  };
  
  window.closeDetailGroupModal = function() {
    if (modulesReady && window.moduleCloseDetailGroupModal) {
      return window.moduleCloseDetailGroupModal();
    }
    pendingCalls.push({ fnName: 'moduleCloseDetailGroupModal', args: [], context: this });
  };
  
  window.closeAddMembersModal = function() {
    if (modulesReady && window.moduleCloseAddMembersModal) {
      return window.moduleCloseAddMembersModal();
    }
    pendingCalls.push({ fnName: 'moduleCloseAddMembersModal', args: [], context: this });
  };
  
  // Create module stubs
  window.contactModule = window.contactModule || {
    showEditContactForm: function() { console.log('⏳ contactModule not ready'); },
    deleteContact: function() { console.log('⏳ contactModule not ready'); }
  };
  
  window.groupModule = window.groupModule || {
    showGroupDetail: function() { console.log('⏳ groupModule not ready'); },
    deleteGroup: function() { console.log('⏳ groupModule not ready'); }
  };
  
  // Start waiting for modules
  waitForModules();
  
  console.log('✅ init.js loaded, waiting for modules...');
  
})();