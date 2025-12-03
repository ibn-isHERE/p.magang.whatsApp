// Cek autentikasi dari localStorage (sudah persisten)
const token = localStorage.getItem('token');
const userDataStr = localStorage.getItem('user');
const currentUser = userDataStr ? JSON.parse(userDataStr) : null;

// Redirect ke login jika tidak ada token/user
if (!token || !currentUser) {
    console.log('Tidak ada autentikasi ditemukan, redirect ke login...');
    window.location.replace('/index.html');
    throw new Error('Not authenticated'); // Hentikan eksekusi script
}

console.log('User terautentikasi:', currentUser.name, `(${currentUser.role})`);

// Tampilkan profil user di navbar
function displayUserProfile() {
    const userProfileContainer = document.getElementById('userProfileContainer');
    if (!userProfileContainer) {
        console.warn('userProfileContainer tidak ditemukan');
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
    
    console.log('Profil user berhasil ditampilkan');
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
            // Hapus semua data autentikasi dari localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('lastActivity');
            
            console.log('Data autentikasi berhasil dihapus');
            
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

// Batasi akses berdasarkan role
function restrictAccess() {
    if (currentUser.role === 'operator') {
        console.log('Menerapkan pembatasan untuk operator...');
        
        // Sembunyikan menu button untuk operator
        const restrictedMenus = ['user'];

        restrictedMenus.forEach(menu => {
            const menuButton = document.querySelector(`[data-form="${menu}"]`);
            if (menuButton) {
                menuButton.style.display = 'none';
                console.log(`Menu disembunyikan: ${menu}`);
            }
        });

        // Sembunyikan container untuk operator
        const restrictedContainers = [
            'userManagementFormContainer',
            'userManagementMainContainer'
        ];

        restrictedContainers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.style.display = 'none';
            }
        });

        console.log('Pembatasan akses operator berhasil diterapkan');
    } else {
        console.log('Admin - akses penuh diberikan');
    }
}

// Activity Tracking - Auto refresh saat ada interaksi user
let activityTimer = null;
const ACTIVITY_CHECK_INTERVAL = 5 * 60 * 1000; // Cek setiap 5 menit
const IDLE_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 hari

// Update timestamp aktivitas terakhir
function updateActivity() {
    const now = Date.now();
    localStorage.setItem('lastActivity', now);
    
    // Hapus timer yang ada
    if (activityTimer) {
        clearTimeout(activityTimer);
    }
    
    // Set timer baru untuk pengecekan
    activityTimer = setTimeout(checkIdleTimeout, ACTIVITY_CHECK_INTERVAL);
}

// Cek apakah user sudah idle terlalu lama
function checkIdleTimeout() {
    const lastActivity = parseInt(localStorage.getItem('lastActivity') || Date.now());
    const now = Date.now();
    const idleTime = now - lastActivity;
    
    console.log(`Waktu idle: ${Math.floor(idleTime / 1000 / 60)} menit`);
    
    if (idleTime > IDLE_TIMEOUT) {
        console.warn('Sesi berakhir karena tidak aktif selama 7 hari');
        Swal.fire({
            icon: 'warning',
            title: 'Session Expired',
            text: 'Anda sudah tidak aktif selama 7 hari. Silakan login kembali.',
            allowOutsideClick: false
        }).then(() => {
            handleLogout();
        });
    } else {
        // Refresh aktivitas di server jika user masih aktif
        refreshActivityOnServer();
    }
}

// Refresh timestamp aktivitas di server
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
            
            // Update token dengan lastActivity baru
            if (data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('lastActivity', data.lastActivity);
                console.log('Aktivitas berhasil di-refresh di server');
            }
        } else if (response.status === 401) {
            // Sesi berakhir di server
            console.warn('Sesi berakhir di server');
            handleLogout();
        }
    } catch (error) {
        console.error('Gagal refresh aktivitas:', error);
    }
}

// Dengarkan interaksi user untuk tracking aktivitas
function setupActivityTracking() {
    // Track berbagai aktivitas user
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    let debounceTimer = null;
    
    activityEvents.forEach(eventName => {
        document.addEventListener(eventName, () => {
            // Debounce: hanya update sekali per menit
            if (debounceTimer) return;
            
            debounceTimer = setTimeout(() => {
                updateActivity();
                debounceTimer = null;
            }, 60000); // Debounce 1 menit
        }, { passive: true });
    });
    
    // Update aktivitas awal
    updateActivity();
    
    console.log('Activity tracking diaktifkan');
}

// Verifikasi validitas token saat halaman dimuat
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
                console.warn('Sesi berakhir: Tidak ada aktivitas selama 7 hari');
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
                console.warn('Verifikasi token gagal - melakukan logout');
                localStorage.clear();
                window.location.replace('/index.html');
            }
        } else {
            console.log('Token terverifikasi - Sesi aktif');
            
            // Update aktivitas terakhir dari server
            if (data.lastActivity) {
                localStorage.setItem('lastActivity', data.lastActivity);
            }
            
            // Setup tracking aktivitas
            setupActivityTracking();
        }
    } catch (error) {
        console.error('Error verifikasi token:', error);
        // Error jaringan - masih izinkan akses tapi beri warning ke user
        console.warn('Bekerja offline - tracking aktivitas terbatas');
    }
}

// Inisialisasi saat DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        displayUserProfile();
        restrictAccess();
        verifyToken(); // Opsional: verifikasi token saat halaman dimuat
    });
} else {
    displayUserProfile();
    restrictAccess();
    verifyToken(); // Opsional: verifikasi token saat halaman dimuat
}

// Buat fungsi tersedia secara global
window.handleLogout = handleLogout;
window.currentUser = currentUser;
window.authToken = token;