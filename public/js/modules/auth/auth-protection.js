// auth-protection.js - FIXED VERSION (Simplified & Persistent)

// ✅ Cek auth dari localStorage (sudah persisten)
const token = localStorage.getItem('token');
const userDataStr = localStorage.getItem('user');
const currentUser = userDataStr ? JSON.parse(userDataStr) : null;

// ❌ Redirect ke login jika tidak ada token/user
if (!token || !currentUser) {
    console.log('❌ No authentication found, redirecting to login...');
    window.location.replace('/index.html');
    throw new Error('Not authenticated'); // Stop script execution
}

console.log('✅ User authenticated:', currentUser.name, `(${currentUser.role})`);

// Display user profile di navbar
function displayUserProfile() {
    const userProfileContainer = document.getElementById('userProfileContainer');
    if (!userProfileContainer) {
        console.warn('⚠️ userProfileContainer not found');
        return;
    }

    const roleClass = currentUser.role === 'admin' ? 'admin' : 'operator';
    const roleText = currentUser.role === 'admin' ? 'Admin' : 'Operator';

    userProfileContainer.innerHTML = `
        <div class="user-info">
            <div class="user-name">${currentUser.name}</div>
            <span class="user-role-badge ${roleClass}">${roleText}</span>
        </div>
        <button class="logout-btn" onclick="handleLogout()">
            <i class="fa-solid fa-sign-out-alt"></i>
            Logout
        </button>
    `;
    
    console.log('✅ User profile displayed');
}

// Handle logout
function handleLogout() {
    Swal.fire({
        title: 'Konfirmasi Logout',
        text: 'Apakah Anda yakin ingin keluar?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Logout',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#fc8181',
        cancelButtonColor: '#cbd5e0'
    }).then((result) => {
        if (result.isConfirmed) {
            // ✅ Clear semua data auth dari localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('rememberMe');
            
            console.log('✅ Auth data cleared');
            
            Swal.fire({
                icon: 'success',
                title: 'Logout Berhasil',
                text: 'Terima kasih telah menggunakan sistem',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.replace('/index.html');
            });
        }
    });
}

// Restrict access based on role
function restrictAccess() {
    if (currentUser.role === 'operator') {
        console.log('🔒 Applying operator restrictions...');
        
        // ❌ HIDE menu buttons untuk operator
        const restrictedMenus = ['contacts', 'group', 'settings', 'user'];

        restrictedMenus.forEach(menu => {
            const menuButton = document.querySelector(`[data-form="${menu}"]`);
            if (menuButton) {
                menuButton.style.display = 'none';
                console.log(`  ❌ Hidden menu: ${menu}`);
            }
        });

        // ❌ HIDE containers untuk operator
        const restrictedContainers = [
            'contactsFormContainer',
            'contactMainContainer',
            'groupsFormContainer',
            'groupMainContainer',
            'settingsFormContainer',
            'instansiMainContainer',
            'jabatanMainContainer',
            'userManagementFormContainer',
            'userManagementMainContainer'
        ];

        restrictedContainers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.style.display = 'none';
            }
        });

        console.log('🔒 Operator access restrictions applied');
    } else {
        console.log('✅ Admin - full access granted');
    }
}

// ⏰ Activity Tracking - Auto refresh on user interaction
let activityTimer = null;
const ACTIVITY_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const IDLE_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days

// Update last activity timestamp
function updateActivity() {
    const now = Date.now();
    localStorage.setItem('lastActivity', now);
    
    // Clear existing timer
    if (activityTimer) {
        clearTimeout(activityTimer);
    }
    
    // Set new check timer
    activityTimer = setTimeout(checkIdleTimeout, ACTIVITY_CHECK_INTERVAL);
}

// Check if user has been idle too long
function checkIdleTimeout() {
    const lastActivity = parseInt(localStorage.getItem('lastActivity') || Date.now());
    const now = Date.now();
    const idleTime = now - lastActivity;
    
    console.log(`🕐 Idle time: ${Math.floor(idleTime / 1000 / 60)} minutes`);
    
    if (idleTime > IDLE_TIMEOUT) {
        console.warn('⚠️ Session expired due to inactivity (7 days)');
        Swal.fire({
            icon: 'warning',
            title: 'Session Expired',
            text: 'Anda sudah tidak aktif selama 7 hari. Silakan login kembali.',
            allowOutsideClick: false
        }).then(() => {
            handleLogout();
        });
    } else {
        // Refresh activity on server if user still active
        refreshActivityOnServer();
    }
}

// Refresh activity timestamp on server
async function refreshActivityOnServer() {
    try {
        const response = await fetch('/api/auth/refresh-activity', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            
            // Update token with new lastActivity
            if (data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('lastActivity', data.lastActivity);
                console.log('✅ Activity refreshed on server');
            }
        } else if (response.status === 401) {
            // Session expired on server
            console.warn('⚠️ Session expired on server');
            handleLogout();
        }
    } catch (error) {
        console.error('❌ Failed to refresh activity:', error);
    }
}

// Listen to user interactions to track activity
function setupActivityTracking() {
    // Track various user activities
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    let debounceTimer = null;
    
    activityEvents.forEach(eventName => {
        document.addEventListener(eventName, () => {
            // Debounce: only update once per minute
            if (debounceTimer) return;
            
            debounceTimer = setTimeout(() => {
                updateActivity();
                debounceTimer = null;
            }, 60000); // 1 minute debounce
        }, { passive: true });
    });
    
    // Initial activity update
    updateActivity();
    
    console.log('✅ Activity tracking enabled');
}

// Verify token validity on page load
async function verifyToken() {
    try {
        const response = await fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            if (data.reason === 'IDLE_TIMEOUT') {
                console.warn('⚠️ Session expired: No activity for 7 days');
                Swal.fire({
                    icon: 'warning',
                    title: 'Session Expired',
                    text: 'Anda sudah tidak aktif selama 7 hari. Silakan login kembali.',
                    allowOutsideClick: false
                }).then(() => {
                    localStorage.clear();
                    window.location.replace('/index.html');
                });
            } else {
                console.warn('⚠️ Token verification failed - logging out');
                localStorage.clear();
                window.location.replace('/index.html');
            }
        } else {
            console.log('✅ Token verified - Session active');
            
            // Update last activity from server
            if (data.lastActivity) {
                localStorage.setItem('lastActivity', data.lastActivity);
            }
            
            // Setup activity tracking
            setupActivityTracking();
        }
    } catch (error) {
        console.error('❌ Token verification error:', error);
        // Network error - masih allow akses tapi warn user
        console.warn('⚠️ Working offline - activity tracking limited');
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        displayUserProfile();
        restrictAccess();
        verifyToken(); // Optional: verify token on page load
    });
} else {
    displayUserProfile();
    restrictAccess();
    verifyToken(); // Optional: verify token on page load
}

// Make functions available globally
window.handleLogout = handleLogout;
window.currentUser = currentUser;
window.authToken = token;