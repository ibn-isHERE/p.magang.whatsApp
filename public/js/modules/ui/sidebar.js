// sidebar.js - Sidebar Navigation Handler (Simplified)

/**
 * Initialize Sidebar Navigation
 */
export function initSidebar() {
  console.log('🎯 Initializing sidebar...');
  
  const hamburger = document.getElementById('hamburgerBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const menuItems = document.querySelectorAll('.sidebar-menu-item:not(.sidebar-logout-btn)');
  
  if (!hamburger || !sidebar || !overlay) {
    console.error('❌ Sidebar elements not found');
    return;
  }
  
  // Toggle Sidebar
  function toggleSidebar() {
    const isActive = sidebar.classList.contains('active');
    
    if (isActive) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }
  
  // Open Sidebar
  function openSidebar() {
    sidebar.classList.add('active');
    overlay.classList.add('active');
    hamburger.classList.add('active');
    document.body.classList.add('sidebar-open');
  }
  
  // Close Sidebar
  function closeSidebar() {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    hamburger.classList.remove('active');
    document.body.classList.remove('sidebar-open');
  }
  
  // Event Listeners
  hamburger.addEventListener('click', toggleSidebar);
  overlay.addEventListener('click', closeSidebar);
  
  // Handle menu item clicks (excluding logout button)
  menuItems.forEach(item => {
    item.addEventListener('click', function() {
      const formId = this.dataset.form;
      
      // Skip if it's logout button or no form id
      if (!formId || this.classList.contains('sidebar-logout-btn')) {
        return;
      }
      
      // Remove active class from all items (except logout)
      menuItems.forEach(i => i.classList.remove('active'));
      
      // Add active class to clicked item
      this.classList.add('active');
      
      // ✅ SPECIAL HANDLING for User Management
      if (formId === 'User') {
        showUserManagement();
      } else {
        // Call showForm function (imported from main)
        if (window.showForm && formId) {
          window.showForm(formId);
        }
      }
      
      // Close sidebar on mobile
      if (window.innerWidth <= 768) {
        closeSidebar();
      }
    });
  });
  
  // ✅ Function to show User Management
  function showUserManagement() {
    // Hide all form containers
    document.querySelectorAll('.form-content').forEach(container => {
      container.classList.remove('active');
      container.classList.add('hidden');
    });

    // Show user management form
    const userMgmtForm = document.getElementById('userManagementFormContainer');
    if (userMgmtForm) {
      userMgmtForm.classList.remove('hidden');
      userMgmtForm.classList.add('active');
    }

    // Hide all main containers
    const allMainContainers = [
      'scheduleContainer',
      'chatMainContainer',
      'contactMainContainer',
      'groupMainContainer',
      'instansiMainContainer',
      'jabatanMainContainer',
      'userManagementMainContainer'
    ];

    allMainContainers.forEach(containerId => {
      const container = document.getElementById(containerId);
      if (container) {
        container.style.display = 'none';
      }
    });

    // Show user management main container
    const userMgmtMain = document.getElementById('userManagementMainContainer');
    if (userMgmtMain) {
      userMgmtMain.style.display = 'block';
    }

    // Initialize user management if not already initialized
    if (typeof window.initializeUserManagement === 'function') {
      window.initializeUserManagement();
    }
  }
  
  // ✅ TIDAK PERLU EVENT DELEGATION LAGI - Logout sudah pakai onclick di HTML
  
  // Close sidebar on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('active')) {
      closeSidebar();
    }
  });
  
  // Handle window resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth > 768 && sidebar.classList.contains('active')) {
        // Keep sidebar open on desktop
      }
    }, 250);
  });
  
  console.log('✅ Sidebar initialized successfully');
}

/**
 * Update Chat Badge Count
 */
export function updateChatBadge(count) {
  const badge = document.querySelector('.sidebar-menu-item[data-form="chat"] .notification-badge');
  if (badge) {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

/**
 * Set Active Menu Item
 */
export function setActiveMenuItem(formId) {
  const menuItems = document.querySelectorAll('.sidebar-menu-item:not(.sidebar-logout-btn)');
  menuItems.forEach(item => {
    if (item.dataset.form === formId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}