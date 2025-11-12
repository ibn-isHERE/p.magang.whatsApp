// sidebar.js - Sidebar Navigation Handler

/**
 * Initialize Sidebar Navigation
 */
export function initSidebar() {
  console.log('🎯 Initializing sidebar...');
  
  const hamburger = document.getElementById('hamburgerBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const menuItems = document.querySelectorAll('.sidebar-menu-item');
  
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
  
  // Handle menu item clicks
  menuItems.forEach(item => {
    item.addEventListener('click', function() {
      const formId = this.dataset.form;
      
      // Remove active class from all items
      menuItems.forEach(i => i.classList.remove('active'));
      
      // Add active class to clicked item
      this.classList.add('active');
      
      // Call showForm function (imported from main)
      if (window.showForm && formId) {
        window.showForm(formId);
      }
      
      // Close sidebar on mobile
      if (window.innerWidth <= 768) {
        closeSidebar();
      }
    });
  });
  
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
  const menuItems = document.querySelectorAll('.sidebar-menu-item');
  menuItems.forEach(item => {
    if (item.dataset.form === formId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}