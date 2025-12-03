// Script ini dijalankan di index.html (halaman login)
// Jika user SUDAH login, langsung redirect ke mainpage.html

(function() {
    // Cek apakah user sudah login
    const token = localStorage.getItem('token');
    const userDataStr = localStorage.getItem('user');
    
    if (token && userDataStr) {
        try {
            const userData = JSON.parse(userDataStr);
            
            // Jika data valid, redirect ke mainpage
            if (userData && userData.email) {
                console.log('User sudah login:', userData.name);
                console.log('Mengalihkan ke mainpage...');
                window.location.replace('/mainpage.html');
            }
        } catch (error) {
            console.warn('Data user tidak valid, membersihkan storage');
            // Jika data corrupt, hapus
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    } else {
        console.log('Tidak ada sesi aktif - menampilkan halaman login');
    }
})();