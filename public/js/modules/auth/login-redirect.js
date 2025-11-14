// login-redirect.js
// Script ini dijalankan di index.html (halaman login)
// Jika user SUDAH login, langsung redirect ke mainpage.html

(function() {
    // ✅ Cek apakah user sudah login
    const token = localStorage.getItem('token');
    const userDataStr = localStorage.getItem('user');
    
    if (token && userDataStr) {
        try {
            const userData = JSON.parse(userDataStr);
            
            // Jika data valid, redirect ke mainpage
            if (userData && userData.email) {
                console.log('✅ User already logged in:', userData.name);
                console.log('🔄 Redirecting to mainpage...');
                window.location.replace('/mainpage.html');
            }
        } catch (error) {
            console.warn('⚠️ Invalid user data, clearing storage');
            // Jika data corrupt, hapus
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    } else {
        console.log('ℹ️ No active session - showing login page');
    }
})();