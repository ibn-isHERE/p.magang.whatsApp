// auth-protection.js - FIXED VERSION

// ✅ Check if user is logged in - cek di sessionStorage dulu, baru localStorage
const token = sessionStorage.getItem('token') || localStorage.getItem('token');
const userDataSession = sessionStorage.getItem('user');
const userDataLocal = localStorage.getItem('user');
const currentUser = JSON.parse(userDataSession || userDataLocal || 'null');

if (!token || !currentUser) {
    console.log('❌ No user/token found, redirecting to login...');
    // Redirect to login if not authenticated
    window.location.replace('/index.html');
    throw new Error('Not authenticated'); // Stop execution
}

console.log('✅ User authenticated:', currentUser.name);
console.log('✅ Token exists:', token ? 'YES' : 'NO');

// Display user profile di navbar
function displayUserProfile() {
    const userProfileContainer = document.getElementById('userProfileContainer');
    if (!userProfileContainer) return;

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
            // ✅ Clear all auth data from both storages
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
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
        // ❌ HIDE menus untuk operator
        const restrictedMenus = ['contacts', 'group', 'settings', 'User'];

        restrictedMenus.forEach(menu => {
            const menuButton = document.querySelector(`[data-form="${menu}"]`);
            if (menuButton) {
                menuButton.style.display = 'none';
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

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        displayUserProfile();
        restrictAccess();
    });
} else {
    displayUserProfile();
    restrictAccess();
}

// Make functions available globally
window.handleLogout = handleLogout;
window.currentUser = currentUser;