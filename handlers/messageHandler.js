// Main orchestrator untuk semua pesan WhatsApp masuk
// MODIFIED: Auto-save semua chat tanpa perlu pilih menu 4

const path = require("path");
const fs = require("fs");
const RegistrationHandler = require("./registrationHandler");
const MenuHandler = require("./menuHandler");

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
    this.menuHandler = new MenuHandler(
      db,
      client,
      io,
      this.saveNewMessage.bind(this)
    );

    // Set reference userState ke menuHandler
    this.menuHandler.setUserStateReference(this.userState);

    // Setup WhatsApp event listeners
    this.setupWhatsAppListeners();
  }

  /**
   * Setup WhatsApp event listeners untuk message_revoke dan message_edit
   */
  setupWhatsAppListeners() {
    // Listener untuk pesan yang dihapus (revoked)
    this.client.on("message_revoke_everyone", async (after, before) => {
      try {
        if (before) {
          console.log("Pesan dihapus oleh user:", before.id._serialized);
          await this.handleMessageRevoke(before);
        }
      } catch (error) {
        console.error("Error saat menangani penghapusan pesan:", error);
      }
    });

    // Listener untuk pesan yang diedit
    this.client.on("message_edit", async (message, newBody, prevBody) => {
      try {
        console.log("Pesan diedit oleh user");
        console.log("Sebelumnya:", prevBody);
        console.log("Baru:", newBody);
        await this.handleMessageEdit(message, newBody, prevBody);
      } catch (error) {
        console.error("Error saat menangani edit pesan:", error);
      }
    });
  }

  /**
   * Menangani pesan yang dihapus oleh user
   */
  async handleMessageRevoke(message) {
    const fromNumber = message.from.replace("@c.us", "");
    const waMessageId = message.id._serialized;

    console.log(
      `Memproses pesan yang dihapus dari ${fromNumber}, WA ID: ${waMessageId}`
    );

    const timestamp = new Date(message.timestamp * 1000).toISOString();

    return new Promise((resolve, reject) => {
      const query = `
                SELECT id, message, timestamp 
                FROM chats 
                WHERE fromNumber = ? 
                AND direction = 'in'
                AND datetime(timestamp) BETWEEN datetime(?, '-5 seconds') AND datetime(?, '+5 seconds')
                ORDER BY ABS(julianday(timestamp) - julianday(?))
                LIMIT 1
            `;

      this.db.get(
        query,
        [fromNumber, timestamp, timestamp, timestamp],
        (err, row) => {
          if (err) {
            console.error("Error saat mencari pesan yang dihapus:", err);
            reject(err);
            return;
          }

          if (row) {
            console.log(`Pesan ditemukan di database (ID: ${row.id}), menghapus...`);

            this.db.run(
              "DELETE FROM chats WHERE id = ?",
              [row.id],
              (deleteErr) => {
                if (deleteErr) {
                  console.error(
                    "Error saat menghapus pesan yang di-revoke:",
                    deleteErr
                  );
                  reject(deleteErr);
                  return;
                }

                console.log(`Pesan ${row.id} berhasil dihapus dari database`);

                this.io.emit("messageDeleted", {
                  messageId: row.id,
                  fromNumber: fromNumber,
                });

                resolve({ deleted: true, messageId: row.id });
              }
            );
          } else {
            console.log("Pesan yang di-revoke tidak ditemukan di database");
            resolve({ deleted: false });
          }
        }
      );
    });
  }

  /**
   * Menangani pesan yang diedit oleh user
   */
  async handleMessageEdit(message, newBody, prevBody) {
    const fromNumber = message.from.replace("@c.us", "");
    const timestamp = new Date(message.timestamp * 1000).toISOString();

    return new Promise((resolve, reject) => {
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

      this.db.get(
        query,
        [fromNumber, prevBody, timestamp, timestamp, timestamp],
        (err, row) => {
          if (err) {
            console.error("Error saat mencari pesan yang diedit:", err);
            reject(err);
            return;
          }

          if (row) {
            console.log(`Pesan ditemukan di database (ID: ${row.id}), memperbarui...`);

            const editedAt = new Date().toISOString();

            this.db.run(
              "UPDATE chats SET message = ?, editedAt = ? WHERE id = ?",
              [newBody, editedAt, row.id],
              (updateErr) => {
                if (updateErr) {
                  console.error("Error saat memperbarui pesan yang diedit:", updateErr);
                  reject(updateErr);
                  return;
                }

                console.log(`Pesan ${row.id} berhasil diperbarui di database`);

                this.io.emit("messageEdited", {
                  messageId: row.id,
                  fromNumber: fromNumber,
                  newMessage: newBody,
                  editedAt: editedAt,
                });

                resolve({
                  updated: true,
                  messageId: row.id,
                  newMessage: newBody,
                });
              }
            );
          } else {
            console.log("Pesan yang diedit tidak ditemukan di database");
            resolve({ updated: false });
          }
        }
      );
    });
  }

  /**
   * Main message handler - dipanggil dari index.js
   * MODIFIED: Otomatis masuk ke mode chat, menu hanya via trigger
   * ADDED: Handler untuk UPDATE command
   */
  async handleIncomingMessage(message) {
    try {
      // Filter: Hanya terima dari user, bukan dari bot sendiri
      if (!message.from.endsWith("@c.us") || message.fromMe) {
        return;
      }

      const fromNumber = message.from.replace("@c.us", "");
      const messageBody = message.body.trim();
      const messageBodyUpper = messageBody.toUpperCase();
      const messageBodyLower = messageBody.toLowerCase();

      console.log(`Pesan masuk dari ${fromNumber}: ${messageBody}`);

      // PRIORITAS 1: Cek perintah UNREG
      if (messageBodyUpper === "UNREG") {
        await this.registrationHandler.handleUnreg(message, fromNumber);
        return;
      }

      // PRIORITAS 2: Cek trigger kata menu (halo, hi, menu, hai)
      const menuTriggers = ["halo", "hi", "menu", "hai"];
      if (menuTriggers.includes(messageBodyLower)) {
        await this.registrationHandler.sendWelcomeMessage(
          message,
          fromNumber,
          this.userState
        );
        return;
      }

      // PRIORITAS 3: Cek format REG# (untuk registrasi)
      if (messageBodyUpper.startsWith("REG#")) {
        const result = await this.registrationHandler.handleRegistration(
          message,
          fromNumber,
          messageBody
        );

        if (result.success) {
          // Registrasi berhasil, set state ke CHATTING_WAITING
          this.userState[fromNumber] = "CHATTING_WAITING";

          // Kirim pesan otomatis bahwa chat sudah bisa dimulai
          await this.client.sendMessage(
            message.from,
            "✅ Registrasi berhasil! Sekarang Anda bisa langsung mengirim pesan dan admin akan menerimanya.\n\nKetik *menu* kapan saja untuk melihat menu layanan."
          );
        }
        return;
      }

      // PRIORITAS 4: Cek format UPDATE# (untuk update data kontak)
      if (messageBodyUpper.startsWith("UPDATE#")) {
        const result = await this.registrationHandler.handleUpdate(
          message,
          fromNumber,
          messageBody
        );

        if (result.success) {
          console.log(`✅ Data kontak ${fromNumber} berhasil diupdate`);
          console.log(`📋 Data sebelumnya:`, result.previousData);
          console.log(`📋 Data baru:`, result.data);
        } else if (result.reason === 'no_changes') {
          console.log(`ℹ️  Tidak ada perubahan data untuk ${fromNumber}`);
          console.log(`📋 Data saat ini:`, result.currentData);
        } else {
          console.log(`❌ Update gagal untuk ${fromNumber}, alasan: ${result.reason}`);
        }
        return;
      }

      // PRIORITAS 5: Cek apakah user di state MENU_UTAMA
      // Jika ya, cek apakah pilihan menu valid (1-5)
      // Jika tidak valid, langsung masuk ke chat mode dan save pesan
      if (this.userState[fromNumber] === "MENU_UTAMA") {
        const result = await this.menuHandler.handleMenuChoice(
          message,
          fromNumber,
          messageBody,
          this.userState,
          this.registrationHandler
        );

        // Jika pilihan valid, return
        if (result && result.valid) {
          return;
        }

        // Jika pilihan tidak valid, ubah state ke CHATTING_WAITING
        // dan simpan pesan ke database, lalu return
        this.userState[fromNumber] = "CHATTING_WAITING";
        console.log(
          `User ${fromNumber} input bukan menu, otomatis masuk mode CHATTING_WAITING`
        );

        // Simpan pesan ini ke database
        await this.menuHandler.handleChatMessage(message, fromNumber);
        return;
      }

      // PRIORITAS 6: Semua pesan lainnya otomatis masuk ke chat
      // User langsung dalam mode CHATTING_WAITING

      // Jika belum punya state, set ke CHATTING_WAITING
      if (!this.userState[fromNumber]) {
        this.userState[fromNumber] = "CHATTING_WAITING";
        console.log(
          `User ${fromNumber} otomatis masuk mode CHATTING_WAITING`
        );
      }

      // Simpan pesan ke database
      await this.menuHandler.handleChatMessage(message, fromNumber);
    } catch (error) {
      console.error("Error global di message handler:", error);
      try {
        await this.client.sendMessage(
          message.from,
          "Maaf, terjadi kesalahan sistem. Silakan coba lagi atau hubungi admin."
        );
      } catch (sendError) {
        console.error("Error saat mengirim pesan error:", sendError);
      }
    }
  }

  /**
   * Simpan pesan baru ke database (termasuk media)
   */
  async saveNewMessage(message) {
    const fromNumber = message.from.replace("@c.us", "");
    let messageContent = message.body || "";
    let messageType = "chat";
    let mediaUrl = null;
    let mediaData = null;

    // Cek apakah ada media
    if (message.hasMedia) {
      try {
        const media = await message.downloadMedia();
        if (media && media.data) {
          const mimeToExt = {
            // Images
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/gif": ".gif",
            "image/webp": ".webp",

            // Videos
            "video/mp4": ".mp4",
            "video/quicktime": ".mov",
            "video/3gpp": ".3gp",
            "video/x-msvideo": ".avi",

            // Documents - PDF
            "application/pdf": ".pdf",

            // Documents - Microsoft Office (Legacy .doc, .xls, .ppt)
            "application/msword": ".doc",
            "application/vnd.ms-excel": ".xls",
            "application/vnd.ms-powerpoint": ".ppt",

            // Documents - Microsoft Office (Modern .docx, .xlsx, .pptx)
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
              ".docx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
              ".xlsx",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation":
              ".pptx",

            // Documents - OpenDocument Format
            "application/vnd.oasis.opendocument.text": ".odt",
            "application/vnd.oasis.opendocument.spreadsheet": ".ods",
            "application/vnd.oasis.opendocument.presentation": ".odp",

            // Audio
            "audio/mpeg": ".mp3",
            "audio/ogg": ".ogg",
            "audio/wav": ".wav",
            "audio/webm": ".weba",
            "audio/aac": ".aac",

            // Archives
            "application/zip": ".zip",
            "application/x-zip-compressed": ".zip",
            "application/x-zip": ".zip",
            "multipart/x-zip": ".zip",
            "application/x-rar-compressed": ".rar",
            "application/x-rar": ".rar",
            "application/x-7z-compressed": ".7z",

            // Text
            "text/plain": ".txt",
            "text/csv": ".csv",
            "application/json": ".json",
          };

          const extension = mimeToExt[media.mimetype] || ".dat";
          const fileName = `${Date.now()}_${fromNumber}${extension}`;
          const filePath = path.join(this.mediaDir, fileName);

          // Simpan file
          fs.writeFileSync(filePath, Buffer.from(media.data, "base64"));
          mediaUrl = `/media/${fileName}`;

          // Tentukan tipe pesan
          if (media.mimetype.startsWith("image/")) {
            messageType = "image";
          } else if (media.mimetype.startsWith("video/")) {
            messageType = "video";
          } else if (media.mimetype.startsWith("audio/")) {
            messageType = "audio";
          } else {
            messageType = "document";
          }

          messageContent = message.body || "";
          mediaData = {
            filename: media.filename || fileName,
            mimetype: media.mimetype,
            size: media.data.length,
            url: mediaUrl,
          };
        }
      } catch (mediaError) {
        console.error("Error saat mengunduh media:", mediaError);
      }
    }

    // Jika tidak ada konten dan tidak ada media, skip
    if (!messageContent && !mediaUrl) {
      console.warn("Pesan tanpa konten dan tanpa media, tidak disimpan");
      return;
    }

    // Data pesan untuk disimpan
    const messageData = {
      fromNumber: fromNumber,
      message: messageContent,
      direction: "in",
      timestamp: new Date().toISOString(),
      messageType: messageType,
      mediaUrl: mediaUrl,
      mediaData: mediaData ? JSON.stringify(mediaData) : null,
      isRead: false,
      status: "active",
    };

    // Simpan ke database
    const insertQuery = `
            INSERT INTO chats (fromNumber, message, direction, timestamp, messageType, mediaUrl, mediaData, isRead, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

    return new Promise((resolve, reject) => {
      this.db.run(
        insertQuery,
        [
          messageData.fromNumber,
          messageData.message,
          messageData.direction,
          messageData.timestamp,
          messageData.messageType,
          messageData.mediaUrl,
          messageData.mediaData,
          messageData.isRead,
          messageData.status,
        ],
        function (err) {
          if (err) {
            console.error("Error saat menyimpan pesan masuk:", err);
            reject(err);
            return;
          }

          const completeMessageData = {
            id: this.lastID,
            ...messageData,
            mediaData: mediaData,
          };

          // Emit ke Socket.IO untuk update real-time di admin
          this.io.emit("newIncomingMessage", completeMessageData);
          console.log(
            `Pesan dari ${fromNumber} berhasil disimpan (ID: ${this.lastID})`
          );

          resolve(completeMessageData);
        }.bind(this)
      );
    });
  }

  /**
   * Mendapatkan user state untuk nomor tertentu
   */
  getUserState(fromNumber) {
    return this.userState[fromNumber] || null;
  }

  /**
   * Mengatur user state
   */
  setUserState(fromNumber, state) {
    this.userState[fromNumber] = state;
  }

  /**
   * Menghapus user state
   */
  clearUserState(fromNumber) {
    delete this.userState[fromNumber];
    this.menuHandler.clearInactivityTimer(fromNumber);
  }

  /**
   * Mendapatkan semua active states (untuk debugging)
   */
  getActiveStates() {
    return { ...this.userState };
  }

  /**
   * Method untuk mengaktifkan chat session
   * Dipanggil ketika admin mengirim reply pertama kali
   */
  activateChatSessionForNumber(fromNumber) {
    return this.menuHandler.activateChatSession(fromNumber);
  }
}

module.exports = MessageHandler;