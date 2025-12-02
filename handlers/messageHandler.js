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
        
        // Track message IDs (WhatsApp ID -> Database ID)
        this.messageIdMap = new Map();
        
        // Initialize handlers
        this.registrationHandler = new RegistrationHandler(db, client);
        this.menuHandler = new MenuHandler(db, client, io, this.saveNewMessage.bind(this));
        
        // PENTING: Set reference userState ke menuHandler
        this.menuHandler.setUserStateReference(this.userState);
        
        // Setup WhatsApp event listeners
        this.setupWhatsAppListeners();
    }

    /**
     * Setup WhatsApp event listeners untuk message_revoke dan message_edit
     */
    setupWhatsAppListeners() {
        // Listener untuk pesan yang dihapus (revoked)
        this.client.on('message_revoke_everyone', async (after, before) => {
            try {
                if (before) {
                    console.log('🗑️ Message revoked by user:', before.id._serialized);
                    await this.handleMessageRevoke(before);
                }
            } catch (error) {
                console.error('❌ Error handling message revoke:', error);
            }
        });

        // Listener untuk pesan yang diedit
        this.client.on('message_edit', async (message, newBody, prevBody) => {
            try {
                console.log('✏️ Message edited by user');
                console.log('Previous:', prevBody);
                console.log('New:', newBody);
                await this.handleMessageEdit(message, newBody, prevBody);
            } catch (error) {
                console.error('❌ Error handling message edit:', error);
            }
        });

        console.log('✅ WhatsApp event listeners for edit/delete initialized');
    }

    /**
     * Handle pesan yang dihapus oleh user
     */
    async handleMessageRevoke(message) {
        const fromNumber = message.from.replace('@c.us', '');
        const waMessageId = message.id._serialized;

        console.log(`🗑️ Processing revoked message from ${fromNumber}, WA ID: ${waMessageId}`);

        // Cari di database berdasarkan timestamp dan fromNumber
        // WhatsApp message biasanya punya timestamp yang bisa kita gunakan
        const timestamp = new Date(message.timestamp * 1000).toISOString();
        
        return new Promise((resolve, reject) => {
            // Query untuk mencari pesan berdasarkan fromNumber dan timestamp yang mendekati
            const query = `
                SELECT id, message, timestamp 
                FROM chats 
                WHERE fromNumber = ? 
                AND direction = 'in'
                AND datetime(timestamp) BETWEEN datetime(?, '-5 seconds') AND datetime(?, '+5 seconds')
                ORDER BY ABS(julianday(timestamp) - julianday(?))
                LIMIT 1
            `;

            this.db.get(query, [fromNumber, timestamp, timestamp, timestamp], (err, row) => {
                if (err) {
                    console.error('❌ Error finding revoked message:', err);
                    reject(err);
                    return;
                }

                if (row) {
                    console.log(`✅ Found message in DB (ID: ${row.id}), deleting...`);
                    
                    // Hapus pesan dari database
                    this.db.run('DELETE FROM chats WHERE id = ?', [row.id], (deleteErr) => {
                        if (deleteErr) {
                            console.error('❌ Error deleting revoked message:', deleteErr);
                            reject(deleteErr);
                            return;
                        }

                        console.log(`✅ Message ${row.id} deleted from database`);

                        // Emit socket event untuk update real-time di admin dashboard
                        this.io.emit('messageDeleted', {
                            messageId: row.id,
                            fromNumber: fromNumber
                        });

                        resolve({ deleted: true, messageId: row.id });
                    });
                } else {
                    console.log('⚠️ Revoked message not found in database');
                    resolve({ deleted: false });
                }
            });
        });
    }

    /**
     * Handle pesan yang diedit oleh user
     */
    async handleMessageEdit(message, newBody, prevBody) {
        const fromNumber = message.from.replace('@c.us', '');
        const timestamp = new Date(message.timestamp * 1000).toISOString();

        console.log(`✏️ Processing edited message from ${fromNumber}`);
        console.log(`Previous: "${prevBody}" -> New: "${newBody}"`);

        return new Promise((resolve, reject) => {
            // Cari pesan berdasarkan fromNumber dan konten lama
            const query = `
                SELECT id, message, timestamp 
                FROM chats 
                WHERE fromNumber = ? 
                AND direction = 'in'
                AND message = ?
                AND datetime(timestamp) BETWEEN datetime(?, '-10 seconds') AND datetime(?, '+10 seconds')
                ORDER BY ABS(julianday(timestamp) - julianday(?))
                LIMIT 1
            `;

            this.db.get(query, [fromNumber, prevBody, timestamp, timestamp, timestamp], (err, row) => {
                if (err) {
                    console.error('❌ Error finding edited message:', err);
                    reject(err);
                    return;
                }

                if (row) {
                    console.log(`✅ Found message in DB (ID: ${row.id}), updating...`);
                    
                    const editedAt = new Date().toISOString();
                    
                    // Update pesan di database
                    this.db.run(
                        'UPDATE chats SET message = ?, editedAt = ? WHERE id = ?',
                        [newBody, editedAt, row.id],
                        (updateErr) => {
                            if (updateErr) {
                                console.error('❌ Error updating edited message:', updateErr);
                                reject(updateErr);
                                return;
                            }

                            console.log(`✅ Message ${row.id} updated in database`);

                            // Emit socket event untuk update real-time
                            this.io.emit('messageEdited', {
                                messageId: row.id,
                                fromNumber: fromNumber,
                                newMessage: newBody,
                                editedAt: editedAt
                            });

                            resolve({ 
                                updated: true, 
                                messageId: row.id,
                                newMessage: newBody 
                            });
                        }
                    );
                } else {
                    console.log('⚠️ Edited message not found in database');
                    resolve({ updated: false });
                }
            });
        });
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
            // PRIORITAS 3: CEK APAKAH SEDANG DALAM MODE CHATTING (WAITING atau ACTIVE)
            // ========================================
            if (this.userState[fromNumber] === 'CHATTING_WAITING' || 
                this.userState[fromNumber] === 'CHATTING_ACTIVE') {
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

    /**
     * BARU: Method untuk mengaktifkan chat session
     * Dipanggil ketika admin mengirim reply pertama kali
     */
    activateChatSessionForNumber(fromNumber) {
        return this.menuHandler.activateChatSession(fromNumber);
    }
}

module.exports = MessageHandler;