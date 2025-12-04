// Handler untuk registrasi, update, dan unregistrasi kontak
const templates = require('../config/messageTemplates');
const { toTitleCase } = require('../utils/textHelpers');

class RegistrationHandler {
    constructor(db, client) {
        this.db = db;
        this.client = client;
    }

    /**
     * Normalisasi nomor telepon ke format 0xxx
     * Input: 628xxx atau 62xxx atau 08xxx
     * Output: 08xxx
     */
    normalizePhoneNumber(number) {
        // Hapus semua karakter non-digit
        let cleaned = number.replace(/\D/g, '');
        
        // Jika dimulai dengan 62, ganti dengan 0
        if (cleaned.startsWith('62')) {
            cleaned = '0' + cleaned.substring(2);
        }
        
        // Jika tidak dimulai dengan 0, tambahkan 0
        if (!cleaned.startsWith('0')) {
            cleaned = '0' + cleaned;
        }
        
        return cleaned;
    }

    /**
     * Cek apakah nomor sudah terdaftar di database
     */
    async checkRegistration(fromNumber) {
        return new Promise((resolve, reject) => {
            const normalizedNumber = this.normalizePhoneNumber(fromNumber);
            
            const query = `SELECT * FROM contacts WHERE number = ?`;

            this.db.get(query, [normalizedNumber], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row || null);
                }
            });
        });
    }

    /**
     * Cek apakah user pernah chat sebelumnya
     */
    async hasChattedBefore(fromNumber) {
        return new Promise((resolve, reject) => {
            const query = `SELECT COUNT(*) as count FROM chats WHERE fromNumber = ?`;
            
            this.db.get(query, [fromNumber], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.count > 0);
                }
            });
        });
    }

    /**
     * Menangani perintah UNREG
     */
    async handleUnreg(message, fromNumber) {
        try {
            const contact = await this.checkRegistration(fromNumber);

            if (contact) {
                await new Promise((resolve, reject) => {
                    this.db.run("DELETE FROM contacts WHERE id = ?", [contact.id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                console.log(`Kontak ${contact.number} (ID: ${contact.id}) berhasil dihapus (UNREG)`);
                await this.client.sendMessage(message.from, templates.unregSuccess);
                
                return { handled: true, action: 'unreg_success' };
            } else {
                await this.client.sendMessage(message.from, templates.unregNotFound);
                
                return { handled: true, action: 'unreg_not_found' };
            }
        } catch (error) {
            console.error('Error saat menangani UNREG:', error);
            await this.client.sendMessage(message.from, 'Terjadi kesalahan sistem. Mohon coba lagi.');
            
            return { handled: true, action: 'unreg_error' };
        }
    }

    /**
     * Menangani proses registrasi (parsing REG#...)
     */
    async handleRegistration(message, fromNumber, messageBody) {
        const parts = messageBody.split('#');

        // Validasi format
        if (parts.length !== 4) {
            await this.client.sendMessage(message.from, templates.registrationFormatError);
            return { success: false, reason: 'invalid_format' };
        }

        const nama = parts[1].trim();
        const instansi = toTitleCase(parts[2].trim());  
        const jabatan = toTitleCase(parts[3].trim());   

        // Validasi semua field terisi
        if (!nama || !instansi || !jabatan) {
            await this.client.sendMessage(message.from, templates.registrationFormatError);
            return { success: false, reason: 'empty_fields' };
        }

        try {
            // Cek apakah nomor sudah terdaftar
            const existingContact = await this.checkRegistration(fromNumber);
            
            if (existingContact) {
                console.log(`Nomor ${fromNumber} sudah terdaftar sebagai ${existingContact.name}`);
                await this.client.sendMessage(message.from, templates.alreadyRegistered);
                return { success: false, reason: 'duplicate' };
            }

            // Normalisasi nomor ke format 08xxx sebelum simpan
            const normalizedNumber = this.normalizePhoneNumber(fromNumber);

            // Simpan ke database dengan nomor yang sudah dinormalisasi
            await new Promise((resolve, reject) => {
                const insertSql = "INSERT INTO contacts (name, number, instansi, jabatan) VALUES (?, ?, ?, ?)";
                
                this.db.run(insertSql, [nama, normalizedNumber, instansi, jabatan], function(err) {
                    if (err) {
                        if (err.message.includes('UNIQUE constraint failed')) {
                            reject({ type: 'duplicate', message: err.message });
                        } else {
                            reject({ type: 'database', message: err.message });
                        }
                    } else {
                        resolve(this.lastID);
                    }
                });
            });

            console.log(`Kontak baru berhasil disimpan: ${nama} (${normalizedNumber})`);
            await this.client.sendMessage(message.from, templates.registrationSuccess);

            return { success: true, data: { nama, instansi, jabatan, number: normalizedNumber } };

        } catch (error) {
            if (error.type === 'duplicate') {
                await this.client.sendMessage(message.from, templates.alreadyRegistered);
                return { success: false, reason: 'duplicate' };
            } else {
                console.error('Error saat menyimpan kontak:', error);
                await this.client.sendMessage(message.from, 'Terjadi kesalahan saat menyimpan data. Mohon coba lagi.');
                return { success: false, reason: 'database_error' };
            }
        }
    }

    /**
     * BARU: Menangani proses update data kontak (parsing UPDATE#...)
     */
    async handleUpdate(message, fromNumber, messageBody) {
        const parts = messageBody.split('#');

        // Validasi format
        if (parts.length !== 4) {
            await this.client.sendMessage(message.from, templates.updateFormatError);
            return { success: false, reason: 'invalid_format' };
        }

        const nama = parts[1].trim();
        const instansi = toTitleCase(parts[2].trim());  
        const jabatan = toTitleCase(parts[3].trim());   

        // Validasi semua field terisi
        if (!nama || !instansi || !jabatan) {
            await this.client.sendMessage(message.from, templates.updateFormatError);
            return { success: false, reason: 'empty_fields' };
        }

        try {
            // Cek apakah nomor sudah terdaftar
            const existingContact = await this.checkRegistration(fromNumber);
            
            if (!existingContact) {
                console.log(`Nomor ${fromNumber} belum terdaftar, tidak bisa update`);
                await this.client.sendMessage(message.from, templates.updateNotRegistered);
                return { success: false, reason: 'not_registered' };
            }

            // VALIDASI: Cek apakah ada perubahan data
            const isDataSame = 
                existingContact.name === nama && 
                existingContact.instansi === instansi && 
                existingContact.jabatan === jabatan;

            if (isDataSame) {
                console.log(`Tidak ada perubahan data untuk ${fromNumber}`);
                await this.client.sendMessage(message.from, templates.updateNoChanges);
                return { 
                    success: false, 
                    reason: 'no_changes',
                    currentData: {
                        nama: existingContact.name,
                        instansi: existingContact.instansi,
                        jabatan: existingContact.jabatan
                    }
                };
            }

            // Cek apakah kolom updatedAt ada
            const hasUpdatedAt = await new Promise((resolve, reject) => {
                this.db.all("PRAGMA table_info(contacts)", [], (err, columns) => {
                    if (err) reject(err);
                    else resolve(columns.some(col => col.name === 'updatedAt'));
                });
            });

            // Update data kontak (dengan atau tanpa updatedAt)
            await new Promise((resolve, reject) => {
                const updateSql = hasUpdatedAt 
                    ? `UPDATE contacts SET name = ?, instansi = ?, jabatan = ?, updatedAt = datetime('now') WHERE id = ?`
                    : `UPDATE contacts SET name = ?, instansi = ?, jabatan = ? WHERE id = ?`;
                
                this.db.run(updateSql, [nama, instansi, jabatan, existingContact.id], function(err) {
                    if (err) {
                        reject({ type: 'database', message: err.message });
                    } else {
                        resolve(this.changes);
                    }
                });
            });

            console.log(`Kontak berhasil diupdate: ${nama} (${existingContact.number})`);
            await this.client.sendMessage(
                message.from, 
                templates.updateSuccess(nama, instansi, jabatan)
            );

            return { 
                success: true, 
                data: { nama, instansi, jabatan, number: existingContact.number },
                previousData: {
                    nama: existingContact.name,
                    instansi: existingContact.instansi,
                    jabatan: existingContact.jabatan
                }
            };

        } catch (error) {
            console.error('Error saat mengupdate kontak:', error);
            await this.client.sendMessage(
                message.from, 
                'Terjadi kesalahan saat memperbarui data. Mohon coba lagi.'
            );
            return { success: false, reason: 'database_error' };
        }
    }

    /**
     * Mengirim pesan selamat datang sesuai status user
     */
    async sendWelcomeMessage(message, fromNumber, userState) {
        try {
            // Cek apakah sudah terdaftar
            const contact = await this.checkRegistration(fromNumber);

            if (contact) {
                // User sudah terdaftar - kirim menu dengan nama
                await this.client.sendMessage(
                    message.from, 
                    templates.welcomeRegisteredUser(contact.name, contact.instansi)
                );
                userState[fromNumber] = 'MENU_UTAMA';
                return { registered: true, contact };

            } else {
                // User belum terdaftar - kirim menu biasa
                const hasHistory = await this.hasChattedBefore(fromNumber);

                if (hasHistory) {
                    // User pernah chat tapi belum daftar
                    await this.client.sendMessage(message.from, templates.welcomeReturningUser);
                    userState[fromNumber] = 'MENU_UTAMA';
                } else {
                    // User baru 100%
                    await this.client.sendMessage(message.from, templates.welcomeNewUser);
                    userState[fromNumber] = 'MENU_UTAMA';
                }

                return { registered: false, hasHistory };
            }

        } catch (error) {
            console.error('Error saat mengirim pesan selamat datang:', error);
            // Fallback ke pesan default
            await this.client.sendMessage(message.from, templates.welcomeReturningUser);
            userState[fromNumber] = 'MENU_UTAMA';
            return { registered: false, error: true };
        }
    }

    /**
     * Mendapatkan pesan selamat datang yang sesuai berdasarkan status user
     */
    async getWelcomeMessage(fromNumber) {
        try {
            const contact = await this.checkRegistration(fromNumber);

            if (contact) {
                return templates.welcomeRegisteredUser(contact.name, contact.instansi);
            } else {
                const hasHistory = await this.hasChattedBefore(fromNumber);
                return hasHistory ? templates.welcomeReturningUser : templates.welcomeNewUser;
            }
        } catch (error) {
            console.error('Error saat mendapatkan pesan selamat datang:', error);
            return templates.welcomeReturningUser;
        }
    }
}

module.exports = RegistrationHandler;