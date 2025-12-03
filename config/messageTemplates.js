// Template pesan untuk bot WhatsApp BPS

module.exports = {
  // Pesan untuk user BARU 100% (belum daftar + belum pernah chat)
  welcomeNewUser: `*Selamat Datang di AsaMPedaS BPS Provinsi Riau!*
(Aplikasi Manajemen Pengguna Data Statistik)

📞 Hotline: 0811 751 1400
📧 Email: pstriau@bps.go.id

━━━━━━━━━━━━━━━━━━━━━━

*Ingin mendapatkan broadcast rutin?*
Informasi statistik, diseminasi data, dan sosialisasi langsung ke WhatsApp Anda!

Daftar sekarang dengan format:
*REG#Nama Lengkap#Nama Instansi#Jabatan*

Contoh: 
REG#Budi Santoso#Dinas Pendidikan#Kepala Seksi

_(Pendaftaran bersifat opsional)_

━━━━━━━━━━━━━━━━━━━━━━

*Menu Layanan:*
1. Permintaan Data Statistik
2. Publikasi Statistik  
3. Konsultasi Statistik
4. Chat dengan Petugas Layanan
5. Panduan Registrasi & Unregistrasi

_Ketik nomor pilihan Anda_`,

  // Pesan untuk user PERNAH CHAT (tapi belum daftar)
  welcomeReturningUser: `Selamat datang kembali di Layanan BPS Provinsi Riau.

*Ingin dapat broadcast rutin?*
Daftar dengan: *REG#Nama#Instansi#Jabatan*

━━━━━━━━━━━━━━━━━━━━━━

*Menu Layanan:*
1. Permintaan Data Statistik
2. Publikasi Statistik
3. Konsultasi Statistik
4. Chat dengan Petugas Layanan
5. Panduan Registrasi & Unregistrasi`,

  // Pesan untuk user SUDAH DAFTAR
  welcomeRegisteredUser: (
    name,
    instansi
  ) => `Selamat datang, *${name}* dari *${instansi}*!

*Menu Layanan:*
1. Permintaan Data Statistik
2. Publikasi Statistik
3. Konsultasi Statistik
4. Chat dengan Petugas Layanan
5. Panduan Registrasi & Unregistrasi

━━━━━━━━━━━━━━━━━━━━━━
✅ _Anda terdaftar untuk menerima broadcast rutin dari BPS_
🔕 _Ketik *UNREG* untuk berhenti menerima broadcast_`,

  // BARU: Pesan menu 5 - Panduan Registrasi untuk yang BELUM TERDAFTAR
  registrationGuideNotRegistered: `📋 *Panduan Registrasi & Unregistrasi*

━━━━━━━━━━━━━━━━━━━━━━

*CARA REGISTRASI:*

Untuk mendapatkan broadcast rutin dari BPS, daftar dengan format:

*REG#Nama Lengkap#Nama Instansi#Jabatan*

*Contoh:*
REG#Budi Santoso#Dinas Pendidikan#Kepala Seksi

━━━━━━━━━━━━━━━━━━━━━━

*Keuntungan Registrasi:*
- Mendapat informasi statistik terbaru
- Broadcast diseminasi data
- Update sosialisasi dari BPS

━━━━━━━━━━━━━━━━━━━━━━

*Ketik REG#... sekarang untuk mendaftar!*`,

  // BARU: Pesan menu 5 - Panduan untuk yang SUDAH TERDAFTAR
  registrationGuideAlreadyRegistered: (
    name
  ) => `📋 *Panduan Registrasi & Unregistrasi*

━━━━━━━━━━━━━━━━━━━━━━

✅ *Anda sudah terdaftar sebagai: ${name}*

Anda saat ini menerima broadcast rutin dari BPS Provinsi Riau.

━━━━━━━━━━━━━━━━━━━━━━

*🔕 CARA BERHENTI BERLANGGANAN (UNREG):*

Jika ingin berhenti menerima broadcast, ketik:

*UNREG*

Data Anda akan dihapus dari sistem dan Anda tidak akan menerima broadcast lagi.

━━━━━━━━━━━━━━━━━━━━━━

_Anda tetap dapat menggunakan layanan menu lainnya kapan saja._`,

  // Pesan sukses registrasi
  registrationSuccess: `*Terima kasih telah mendaftar!*

Data Anda telah berhasil disimpan.

Anda akan menerima informasi dan broadcast rutin dari BPS Provinsi Riau.

━━━━━━━━━━━━━━━━━━━━━━

*Menu Layanan:*
1. Permintaan Data Statistik
2. Publikasi Statistik
3. Konsultasi Statistik
4. Chat dengan Petugas Layanan
5. Panduan Registrasi & Unregistrasi`,

  // Pesan error format registrasi
  registrationFormatError: `❌ *Format registrasi salah!*

Pastikan menggunakan format:
*REG#Nama Lengkap#Nama Instansi#Jabatan*

Contoh: 
REG#Budi Santoso#Dinas Pendidikan#Kepala Seksi

━━━━━━━━━━━━━━━━━━━━━━

_Ketik ulang dengan format yang benar atau lanjutkan ke menu layanan_`,

  // Pesan konfirmasi UNREG
  unregSuccess: `*Data Anda telah berhasil dihapus.*

Terima kasih telah menggunakan layanan AsaMPedaS BPS Provinsi Riau.

Anda tidak akan menerima broadcast lagi mulai sekarang.

━━━━━━━━━━━━━━━━━━━━━━

Ingin mendaftar kembali?
Ketik: *REG#Nama#Instansi#Jabatan*

Tetap dapat mengakses menu layanan kapan saja!`,

  // Pesan jika user UNREG tapi tidak terdaftar
  unregNotFound: `Anda tidak terdaftar di sistem kami.

Tidak ada data yang perlu dihapus.

━━━━━━━━━━━━━━━━━━━━━━

Ingin mendaftar untuk menerima broadcast?
Ketik: *REG#Nama#Instansi#Jabatan*`,

  // Pesan jika nomor sudah terdaftar
  alreadyRegistered: `Nomor Anda sudah terdaftar dalam sistem.

Anda sudah menerima broadcast rutin dari BPS.

━━━━━━━━━━━━━━━━━━━━━━

*Menu Layanan:*
1. Permintaan Data Statistik
2. Publikasi Statistik
3. Konsultasi Statistik
4. Chat dengan Petugas Layanan
5. Panduan Registrasi & Unregistrasi`,

  // Menu responses
  menuResponses: {
    1: "Anda dapat mencari dan mengunduh data statistik melalui website resmi BPS di https://riau.bps.go.id/id.",
    2: "Untuk melihat publikasi terbaru dari BPS, silakan kunjungi halaman publikasi kami di https://riau.bps.go.id/id/publication.",
    3: 'Layanan konsultasi statistik tersedia pada jam kerja (Senin-Jumat, 08:00 - 16:00 WIB). Untuk memulai, silakan pilih opsi "Chat dengan Admin" pada menu sebelumnya.',
    4: "Anda sekarang terhubung dengan petugas layanan kami. Silakan sampaikan pertanyaan atau keperluan Anda.",
    5: null, // Handled by special function
  },

  // Pesan pilihan tidak valid
  invalidMenuChoice: (
    welcomeMessage
  ) => `❌ Pilihan tidak valid. Silakan pilih nomor dari menu.

${welcomeMessage}`,

  // Pesan chat dengan admin
  chatWithAdmin: `✅ Anda sekarang terhubung dengan petugas layanan kami. 

Silakan sampaikan pertanyaan atau keperluan Anda.

Tim kami akan merespons secepatnya.`,

  // Pesan peringatan inaktivitas
  inactivityWarning: `Apakah masih ada yang perlu dibantu? 

Jika tidak, cukup abaikan pesan ini, maka sesi ini akan ditutup dalam 10 menit. 

Terima kasih.`,

  // Pesan sesi berakhir
  sessionEnded: `Sesi chat Anda telah berakhir karena tidak ada aktivitas. 

Ketik *menu* untuk memulai kembali. 

Terima kasih telah menggunakan layanan AsaMPedaS BPS Provinsi Riau.`,

  // Pesan sistem untuk admin (akhir sesi)
  systemSessionEnd: (timestamp) =>
    `--- Sesi berakhir otomatis pada ${timestamp} WIB ---`,

  // Pesan sistem untuk admin (peringatan)
  systemWarning: (message) => `[Pesan Otomatis] ${message}`,
};