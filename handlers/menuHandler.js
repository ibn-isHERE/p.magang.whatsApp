// Handler untuk menu layanan BPS dan chat dengan admin
// MODIFIED: Tidak ada pesan "pilihan tidak valid", langsung masuk chat mode

const templates = require('../config/messageTemplates');

class MenuHandler {
    constructor(db, client, io, saveMessageFunction) {
        this.db = db;
        this.client = client;
        this.io = io;
        this.saveMessageFunction = saveMessageFunction;
        this.inactivityTimers = {};
        this.userState = null; // Akan diset oleh MessageHandler
    }

    /**
     * Mengatur referensi ke userState dari MessageHandler
     */
    setUserStateReference(userStateRef) {
        this.userState = userStateRef;
    }

    /**
     * Menangani pilihan menu dari user
     */
    async handleMenuChoice(message, fromNumber, choice, userState, registrationHandler) {
        const menuChoice = choice.trim();

        // Handle menu 5 - Panduan Registrasi
        if (menuChoice === '5') {
            const contact = await registrationHandler.checkRegistration(fromNumber);
            
            if (contact) {
                // User sudah terdaftar
                await this.client.sendMessage(
                    message.from, 
                    templates.registrationGuideAlreadyRegistered(contact.name)
                );
            } else {
                // User belum terdaftar
                await this.client.sendMessage(
                    message.from, 
                    templates.registrationGuideNotRegistered
                );
            }
            
            return { valid: true, action: 'registration_guide' };
        }

        // Cek apakah pilihan valid (1, 2, 3, 4)
        if (!templates.menuResponses[menuChoice]) {
            // Tidak kirim pesan error, hanya return invalid
            // Biarkan messageHandler yang handle (akan masuk ke chat mode)
            return { valid: false };
        }

        // Pilihan 4: Chat dengan admin
        if (menuChoice === '4') {
            // Set state ke CHATTING_WAITING (menunggu admin reply)
            userState[fromNumber] = 'CHATTING_WAITING';
            await this.client.sendMessage(message.from, templates.chatWithAdmin);
            
            // Simpan pesan ke database
            await this.saveMessageFunction(message);
            
            console.log(`User ${fromNumber} masuk mode CHATTING_WAITING (menunggu admin)`);

            return { valid: true, action: 'start_chat' };
        }

        // Pilihan 1, 2, 3: Kirim response
        await this.client.sendMessage(message.from, templates.menuResponses[menuChoice]);
        
        return { valid: true, action: 'menu_response', choice: menuChoice };
    }

    /**
     * Menangani pesan dari user yang sedang dalam mode CHATTING
     */
    async handleChatMessage(message, fromNumber) {
        // Hanya reset timer jika sudah dalam mode CHATTING_ACTIVE
        if (this.userState && this.userState[fromNumber] === 'CHATTING_ACTIVE') {
            this.setInactivityTimer(fromNumber);
            console.log(`Timer direset untuk ${fromNumber} (user mengirim pesan)`);
        }

        // Cek apakah chat di history
        return new Promise((resolve, reject) => {
            this.db.get(
                "SELECT id FROM chats WHERE fromNumber = ? AND status = 'history' LIMIT 1", 
                [fromNumber], 
                async (err, row) => {
                    if (err) {
                        console.error("Error saat mengecek status history chat:", err);
                        reject(err);
                        return;
                    }

                    if (row) {
                        // Aktivkan kembali percakapan
                        console.log(`Pesan masuk dari nomor di history (${fromNumber}). Mengaktifkan kembali seluruh percakapan.`);
                        
                        this.db.run(
                            "UPDATE chats SET status = 'active' WHERE fromNumber = ?", 
                            [fromNumber], 
                            async (updateErr) => {
                                if (updateErr) {
                                    console.error("Gagal mengaktifkan kembali percakapan:", updateErr);
                                } else {
                                    console.log(`Percakapan untuk ${fromNumber} berhasil diaktifkan kembali.`);
                                }
                                
                                await this.saveMessageFunction(message);
                                resolve({ reactivated: true });
                            }
                        );
                    } else {
                        // Simpan pesan biasa
                        await this.saveMessageFunction(message);
                        resolve({ reactivated: false });
                    }
                }
            );
        });
    }

    /**
     * Dipanggil ketika admin mengirim reply pertama kali
     * Ini akan mengubah state dari CHATTING_WAITING ke CHATTING_ACTIVE
     * dan memulai timer inaktivitas
     */
    activateChatSession(fromNumber) {
        if (this.userState && this.userState[fromNumber] === 'CHATTING_WAITING') {
            this.userState[fromNumber] = 'CHATTING_ACTIVE';
            this.setInactivityTimer(fromNumber);
            console.log(`Chat session diaktifkan untuk ${fromNumber} - Timer dimulai!`);
            return true;
        }
        return false;
    }

    /**
     * Mengatur timer inaktivitas untuk sesi chat
     */
    setInactivityTimer(fromNumber) {
        // Hapus timer lama jika ada
        if (this.inactivityTimers[fromNumber]) {
            clearTimeout(this.inactivityTimers[fromNumber].warning);
            clearTimeout(this.inactivityTimers[fromNumber].end);
        }

        this.inactivityTimers[fromNumber] = {
            // Timer 1: Peringatan setelah 30 menit
            warning: setTimeout(async () => {
                await this.client.sendMessage(`${fromNumber}@c.us`, templates.inactivityWarning);
                console.log(`Mengirim peringatan inaktivitas ke ${fromNumber}.`);

                // Simpan pesan peringatan ke database
                const warningData = {
                    fromNumber: fromNumber,
                    message: templates.systemWarning(templates.inactivityWarning),
                    direction: 'out',
                    timestamp: new Date().toISOString(),
                    messageType: 'system',
                    isRead: true,
                    status: 'active'
                };

                const insertQuery = `
                    INSERT INTO chats (fromNumber, message, direction, timestamp, messageType, isRead, status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;

                this.db.run(insertQuery, [
                    warningData.fromNumber, warningData.message, warningData.direction,
                    warningData.timestamp, warningData.messageType, warningData.isRead, warningData.status
                ], (err) => {
                    if (err) {
                        console.error('Error saat menyimpan pesan peringatan:', err);
                    } else {
                        const completeMessageData = { id: this.lastID, ...warningData };
                        this.io.emit('newIncomingMessage', completeMessageData);
                        console.log(`Pesan peringatan untuk ${fromNumber} berhasil disimpan.`);
                    }
                });

                // Timer 2: Akhiri sesi 10 menit setelah peringatan
                this.inactivityTimers[fromNumber].end = setTimeout(() => {
                    this.endChatSession(fromNumber);
                }, 10 * 60 * 1000); // 10 menit

            }, 30 * 60 * 1000), // 30 menit
            end: null
        };
        
        console.log(`Timer inaktivitas diset untuk ${fromNumber} (30 menit + 10 menit)`);
    }

    /**
     * Mengakhiri sesi chat karena inaktivitas
     */
    async endChatSession(fromNumber) {
        console.log(`Mengakhiri sesi untuk ${fromNumber} karena tidak aktif.`);

        const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        const endMessageText = templates.systemSessionEnd(timestamp);

        // Kirim notifikasi ke pengguna
        await this.client.sendMessage(`${fromNumber}@c.us`, templates.sessionEnded);

        // Simpan pesan sistem di database
        const sessionEndData = {
            fromNumber: fromNumber,
            message: endMessageText,
            direction: 'out',
            timestamp: new Date().toISOString(),
            messageType: 'system',
            isRead: true,
            status: 'history'
        };

        const insertQuery = `
            INSERT INTO chats (fromNumber, message, direction, timestamp, messageType, isRead, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        this.db.run(insertQuery, [
            sessionEndData.fromNumber, sessionEndData.message, sessionEndData.direction,
            sessionEndData.timestamp, sessionEndData.messageType, sessionEndData.isRead, sessionEndData.status
        ], (err) => {
            if (err) {
                console.error('Error saat menyimpan pesan akhir sesi:', err);
                return;
            }

            const completeMessageData = { id: this.lastID, ...sessionEndData };
            this.io.emit('newIncomingMessage', completeMessageData);
            console.log(`Pesan akhir sesi untuk ${fromNumber} berhasil disimpan.`);
        });

        // Hapus state dan timer
        if (this.userState) {
            delete this.userState[fromNumber];
            console.log(`State dihapus untuk ${fromNumber}`);
        }
        
        if (this.inactivityTimers[fromNumber]) {
            clearTimeout(this.inactivityTimers[fromNumber].warning);
            clearTimeout(this.inactivityTimers[fromNumber].end);
            delete this.inactivityTimers[fromNumber];
            console.log(`Timer dihapus untuk ${fromNumber}`);
        }

        // Pindahkan chat ke history
        this.db.run("UPDATE chats SET status = 'history' WHERE fromNumber = ?", [fromNumber], (err) => {
            if (err) {
                console.error(`Gagal memindahkan chat ${fromNumber} ke history:`, err);
            } else {
                console.log(`Chat untuk ${fromNumber} berhasil dipindahkan ke history.`);
                this.io.emit('sessionEnded', { fromNumber });
            }
        });
    }

    /**
     * Menghapus timer untuk nomor tertentu
     */
    clearInactivityTimer(fromNumber) {
        if (this.inactivityTimers[fromNumber]) {
            clearTimeout(this.inactivityTimers[fromNumber].warning);
            clearTimeout(this.inactivityTimers[fromNumber].end);
            delete this.inactivityTimers[fromNumber];
            console.log(`Timer dihapus secara manual untuk ${fromNumber}`);
        }
    }

    /**
     * Mendapatkan semua timer inaktivitas yang aktif (untuk debugging)
     */
    getActiveTimers() {
        return Object.keys(this.inactivityTimers);
    }
}

module.exports = MenuHandler;