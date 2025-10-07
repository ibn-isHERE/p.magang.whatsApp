// handlers/messageHandler.js
// Main orchestrator untuk semua pesan WhatsApp masuk

const path = require('path');
const fs = require('fs');
const RegistrationHandler = require('./registrationHandler');
const MenuHandler = require('./menuHandler');

class MessageHandler {
    constructor(db, client, io, mediaDir) {
        this.db = db;
        this.client = client;
        this.io = io;
        this.mediaDir = mediaDir;
        
        // State management
        this.userState = {};
        
        // Initialize handlers
        this.registrationHandler = new RegistrationHandler(db, client);
        this.menuHandler = new MenuHandler(db, client, io, this.saveNewMessage.bind(this));
        
        // PENTING: Set reference userState ke menuHandler
        this.menuHandler.setUserStateReference(this.userState);
    }

    /**
     * Main message handler - dipanggil dari index.js
     */
    async handleIncomingMessage(message) {
        try {
            // Filter: Hanya terima dari user, bukan dari bot sendiri
            if (!message.from.endsWith('@c.us') || message.fromMe) {
                return;
            }

            const fromNumber = message.from.replace('@c.us', '');
            const messageBody = message.body.trim();
            const messageBodyUpper = messageBody.toUpperCase();
            const messageBodyLower = messageBody.toLowerCase();

            console.log(`📨 Pesan masuk dari ${fromNumber}: ${messageBody}`);

            // ========================================
            // PRIORITAS 1: CEK PERINTAH UNREG
            // ========================================
            if (messageBodyUpper === 'UNREG') {
                await this.registrationHandler.handleUnreg(message, fromNumber);
                return;
            }

            // ========================================
            // PRIORITAS 1.5: CEK FORMAT REG# (Untuk user baru yang langsung registrasi)
            // ========================================
            if (messageBodyUpper.startsWith('REG#')) {
                // User mencoba registrasi, proses langsung
                const result = await this.registrationHandler.handleRegistration(
                    message, 
                    fromNumber, 
                    messageBody
                );

                if (result.success) {
                    // Registrasi berhasil, set state ke MENU_UTAMA
                    this.userState[fromNumber] = 'MENU_UTAMA';
                }
                // Return agar tidak lanjut ke bawah
                return;
            }

            // ========================================
            // PRIORITAS 2: CEK APAKAH SEDANG DALAM PROSES REGISTRASI
            // ========================================
            if (this.userState[fromNumber] === 'MENUNGGU_REGISTRASI') {
                // User dalam state menunggu registrasi tapi tidak balas dengan REG#
                // (Karena kalau balas REG# sudah dihandle di prioritas 1.5)
                // Anggap user skip registrasi, set ke MENU_UTAMA dan proses sebagai menu
                delete this.userState[fromNumber];
                this.userState[fromNumber] = 'MENU_UTAMA';
                // Lanjut ke bawah untuk handle menu choice
            }

            // ========================================
            // PRIORITAS 3: CEK APAKAH SEDANG DALAM MODE CHATTING
            // ========================================
            if (this.userState[fromNumber] === 'CHATTING') {
                await this.menuHandler.handleChatMessage(message, fromNumber);
                return;
            }

            // ========================================
            // PRIORITAS 4: CEK TRIGGER KATA MENU (halo, hi, menu, hai)
            // ========================================
            const menuTriggers = ['halo', 'hi', 'menu', 'hai'];
            if (menuTriggers.includes(messageBodyLower)) {
                await this.registrationHandler.sendWelcomeMessage(message, fromNumber, this.userState);
                return;
            }

            // ========================================
            // PRIORITAS 5: USER BELUM PUNYA STATE - KIRIM WELCOME UNTUK SEMUA PESAN
            // ========================================
            if (!this.userState[fromNumber]) {
                // User baru atau belum punya state
                // Kirim welcome message apapun isi pesannya
                await this.registrationHandler.sendWelcomeMessage(message, fromNumber, this.userState);
                console.log(`🎯 User baru ${fromNumber} - Kirim welcome message, state sekarang: ${this.userState[fromNumber]}`);
                return;
            }

            // ========================================
            // PRIORITAS 6: USER DI STATE MENU_UTAMA - PROSES PILIHAN MENU
            // ========================================
            if (this.userState[fromNumber] === 'MENU_UTAMA') {
                await this.menuHandler.handleMenuChoice(
                    message, 
                    fromNumber, 
                    messageBody, 
                    this.userState,
                    this.registrationHandler
                );
                return;
            }

            // ========================================
            // FALLBACK: Jika sampai sini, berarti ada state yang tidak terduga
            // ========================================
            console.warn(`⚠️ State tidak terduga untuk ${fromNumber}: ${this.userState[fromNumber]}`);
            await this.registrationHandler.sendWelcomeMessage(message, fromNumber, this.userState);

        } catch (error) {
            console.error('❌ Error global di message handler:', error);
            // Kirim pesan error ke user jika perlu
            try {
                await this.client.sendMessage(message.from, 'Maaf, terjadi kesalahan sistem. Silakan coba lagi atau hubungi admin.');
            } catch (sendError) {
                console.error('❌ Error mengirim pesan error:', sendError);
            }
        }
    }

    /**
     * Simpan pesan baru ke database (termasuk media)
     */
    async saveNewMessage(message) {
        const fromNumber = message.from.replace('@c.us', '');
        let messageContent = message.body || '';
        let messageType = 'chat';
        let mediaUrl = null;
        let mediaData = null;

        // Cek apakah ada media
        if (message.hasMedia) {
            try {
                const media = await message.downloadMedia();
                if (media && media.data) {
                    const mimeToExt = {
                        'image/jpeg': '.jpg',
                        'image/png': '.png',
                        'image/gif': '.gif',
                        'image/webp': '.webp',
                        'video/mp4': '.mp4',
                        'video/quicktime': '.mov',
                        'application/pdf': '.pdf',
                        'audio/mpeg': '.mp3',
                        'audio/ogg': '.ogg'
                    };
                    
                    const extension = mimeToExt[media.mimetype] || '.dat';
                    const fileName = `${Date.now()}_${fromNumber}${extension}`;
                    const filePath = path.join(this.mediaDir, fileName);
                    
                    // Simpan file
                    fs.writeFileSync(filePath, Buffer.from(media.data, 'base64'));
                    mediaUrl = `/media/${fileName}`;

                    // Tentukan tipe pesan
                    if (media.mimetype.startsWith('image/')) {
                        messageType = 'image';
                    } else if (media.mimetype.startsWith('video/')) {
                        messageType = 'video';
                    } else if (media.mimetype.startsWith('audio/')) {
                        messageType = 'audio';
                    } else {
                        messageType = 'document';
                    }

                    messageContent = message.body || '';
                    mediaData = {
                        filename: media.filename || fileName,
                        mimetype: media.mimetype,
                        size: media.data.length,
                        url: mediaUrl
                    };
                }
            } catch (mediaError) {
                console.error('❌ Error mengunduh media:', mediaError);
            }
        }

        // Jika tidak ada konten dan tidak ada media, skip
        if (!messageContent && !mediaUrl) {
            console.warn('⚠️ Pesan tanpa konten dan tanpa media, skip save');
            return;
        }

        // Data pesan untuk disimpan
        const messageData = {
            fromNumber: fromNumber,
            message: messageContent,
            direction: 'in',
            timestamp: new Date().toISOString(),
            messageType: messageType,
            mediaUrl: mediaUrl,
            mediaData: mediaData ? JSON.stringify(mediaData) : null,
            isRead: false,
            status: 'active'
        };

        // Simpan ke database
        const insertQuery = `
            INSERT INTO chats (fromNumber, message, direction, timestamp, messageType, mediaUrl, mediaData, isRead, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        return new Promise((resolve, reject) => {
            this.db.run(insertQuery, [
                messageData.fromNumber,
                messageData.message,
                messageData.direction,
                messageData.timestamp,
                messageData.messageType,
                messageData.mediaUrl,
                messageData.mediaData,
                messageData.isRead,
                messageData.status
            ], function(err) {
                if (err) {
                    console.error('❌ Error menyimpan pesan masuk:', err);
                    reject(err);
                    return;
                }

                const completeMessageData = {
                    id: this.lastID,
                    ...messageData,
                    mediaData: mediaData
                };

                // Emit ke Socket.IO untuk update real-time di admin
                this.io.emit('newIncomingMessage', completeMessageData);
                console.log(`✅ Pesan dari ${fromNumber} berhasil disimpan (ID: ${this.lastID})`);
                
                resolve(completeMessageData);
            }.bind(this));
        });
    }

    /**
     * Get user state untuk nomor tertentu
     */
    getUserState(fromNumber) {
        return this.userState[fromNumber] || null;
    }

    /**
     * Set user state
     */
    setUserState(fromNumber, state) {
        this.userState[fromNumber] = state;
    }

    /**
     * Clear user state
     */
    clearUserState(fromNumber) {
        delete this.userState[fromNumber];
        this.menuHandler.clearInactivityTimer(fromNumber);
    }

    /**
     * Get semua active states (untuk debugging)
     */
    getActiveStates() {
        return { ...this.userState };
    }
}

module.exports = MessageHandler;