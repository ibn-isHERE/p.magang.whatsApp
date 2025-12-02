const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { MessageMedia } = require("whatsapp-web.js");

function createChatsRouter(db, whatsappClient, io) {
  const router = express.Router();

  // ==========================================
// CACHE untuk menyimpan message objects dari WhatsApp
// ==========================================
const messageCache = new Map();
const MAX_CACHE_SIZE = 1000;

// Cleanup cache secara periodik (setiap 1 jam)
setInterval(() => {
  if (messageCache.size > MAX_CACHE_SIZE) {
    const entriesToDelete = messageCache.size - MAX_CACHE_SIZE;
    const keys = Array.from(messageCache.keys()).slice(0, entriesToDelete);
    keys.forEach(key => messageCache.delete(key));
    console.log(`🧹 Cache cleaned: removed ${entriesToDelete} old entries`);
  }
}, 3600000);

  // --- Multer setup untuk menyimpan media chat ---
  const uploadDir = path.join(__dirname, "..", "uploads", "chat_media");
  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const uniqueName = `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${ext}`;
      cb(null, uniqueName);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
  });

  // Endpoint untuk mendapatkan daftar percakapan unik dengan info kontak
  router.get("/conversations", (req, res) => {
    const { status } = req.query;
    const whereClause =
      status === "history"
        ? "WHERE status = 'history'"
        : "WHERE status IS NULL OR status = 'active'";

    const query = `
        SELECT
            c.fromNumber,
            MAX(c.timestamp) as lastTimestamp,
            (SELECT message FROM chats WHERE fromNumber = c.fromNumber ORDER BY timestamp DESC LIMIT 1) as lastMessage,
            (SELECT direction FROM chats WHERE fromNumber = c.fromNumber ORDER BY timestamp DESC LIMIT 1) as direction,
            (SELECT messageType FROM chats WHERE fromNumber = c.fromNumber ORDER BY timestamp DESC LIMIT 1) as messageType,
            (SELECT COUNT(*) FROM chats WHERE fromNumber = c.fromNumber AND direction = 'in' AND isRead = 0 AND (status IS NULL OR status = 'active')) as unreadCount,
            COALESCE(contacts.name, c.fromNumber) as contactName
        FROM chats c
        LEFT JOIN contacts ON 
            contacts.number = c.fromNumber OR 
            contacts.number = ('0' || SUBSTR(c.fromNumber, 3)) OR 
            contacts.number = ('62' || SUBSTR(c.fromNumber, 2))
        ${whereClause}
        GROUP BY c.fromNumber
        ORDER BY lastTimestamp DESC
    `;

    db.all(query, [], (err, rows) => {
      if (err) {
        console.error("Error getting conversations:", err.message);
        return res
          .status(500)
          .json({
            success: false,
            message: "Gagal mengambil data dari database.",
          });
      }
      res.json({ success: true, data: rows });
    });
  });

  // Endpoint untuk mendapatkan riwayat chat dengan nomor tertentu
  router.get("/conversation/:number", (req, res) => {
    const number = req.params.number;

    const query = `
            SELECT
                c.*,
                contacts.name as contactName
            FROM chats c
            LEFT JOIN contacts ON contacts.number = c.fromNumber
                OR contacts.number = ('+' || c.fromNumber)
                OR contacts.number = ('62' || SUBSTR(c.fromNumber, 2))
            WHERE c.fromNumber = ?
            ORDER BY c.timestamp ASC
        `;

    db.all(query, [number], (err, rows) => {
      if (err) {
        console.error("Error getting conversation history:", err);
        res.status(500).json({ error: err.message });
        return;
      }

      // Mark messages as read when conversation is opened
      db.run(
        'UPDATE chats SET isRead = TRUE WHERE fromNumber = ? AND direction = "in" AND isRead = FALSE',
        [number],
        (updateErr) => {
          if (updateErr) {
            console.error("Error marking messages as read:", updateErr);
          } else {
            io.emit("messagesMarkedAsRead", { fromNumber: number });
          }
        }
      );

      res.json({
        success: true,
        data: {
          messages: rows,
          contactName: rows.length > 0 ? rows[0].contactName || number : number,
          totalMessages: rows.length,
        },
      });
    });
  });

  // Endpoint untuk mencari chat berdasarkan nomor atau nama
  router.get("/search/:query", (req, res) => {
    const searchQuery = req.params.query.toLowerCase();

    const query = `
            SELECT 
                c.fromNumber,
                MAX(c.timestamp) as lastTimestamp,
                c.message as lastMessage,
                c.direction,
                COUNT(CASE WHEN c.direction = 'in' AND c.isRead = FALSE THEN 1 END) as unreadCount,
                contacts.name as contactName
            FROM chats c
            LEFT JOIN contacts ON contacts.number = c.fromNumber 
                OR contacts.number = ('+' || c.fromNumber)
                OR contacts.number = ('62' || SUBSTR(c.fromNumber, 2))
            WHERE 
                c.fromNumber LIKE ? 
                OR LOWER(contacts.name) LIKE ?
                OR LOWER(c.message) LIKE ?
            GROUP BY c.fromNumber 
            ORDER BY lastTimestamp DESC
        `;

    const searchParam = `%${searchQuery}%`;
    db.all(query, [searchParam, searchParam, searchParam], (err, rows) => {
      if (err) {
        console.error("Error searching conversations:", err);
        res.status(500).json({ error: err.message });
        return;
      }

      const conversations = rows.map((row) => ({
        fromNumber: row.fromNumber,
        contactName: row.contactName || row.fromNumber,
        lastMessage: row.lastMessage,
        lastTimestamp: row.lastTimestamp,
        direction: row.direction,
        unreadCount: row.unreadCount,
        hasUnread: row.unreadCount > 0,
      }));

      res.json(conversations);
    });
  });

  router.put("/end-chat/:number", async (req, res) => {
    const { number } = req.params;
    const endMessage = `--- Sesi chat berakhir pada ${new Date().toLocaleString(
      "id-ID",
      { timeZone: "Asia/Jakarta" }
    )} WIB ---`;

    // Kirim notifikasi ke user terlebih dahulu
    try {
      const formattedNumber = number.includes('@c.us') ? number : `${number}@c.us`;
      await whatsappClient.sendMessage(
        formattedNumber, 
        '✅ *Sesi chat telah diakhiri oleh admin.*\n\nTerima kasih telah menggunakan layanan AsaMPedaS BPS Provinsi Riau.\n\nKetik *menu* untuk memulai percakapan baru.'
      );
      console.log(`📤 Notifikasi end session dikirim ke ${number}`);
    } catch (sendError) {
      console.error(`❌ Error mengirim notifikasi ke ${number}:`, sendError);
    }

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      db.run(
        `UPDATE chats SET status = 'history' WHERE fromNumber = ?`,
        [number],
        function (err) {
          if (err) {
            db.run("ROLLBACK");
            console.error("Error updating chat status to history:", err);
            return res
              .status(500)
              .json({
                success: false,
                message: "Gagal mengupdate status chat.",
              });
          }

          const insertQuery = `
                INSERT INTO chats (fromNumber, message, direction, timestamp, messageType, status) 
                VALUES (?, ?, 'out', ?, 'system', 'history')
            `;

          db.run(
            insertQuery,
            [number, endMessage, new Date().toISOString()],
            function (err) {
              if (err) {
                db.run("ROLLBACK");
                console.error("Error inserting end-of-session message:", err);
                return res
                  .status(500)
                  .json({
                    success: false,
                    message: "Gagal menambahkan pesan akhir sesi.",
                  });
              }

              db.run("COMMIT", (err) => {
                if (err) {
                  console.error("Error committing transaction:", err);
                  return res
                    .status(500)
                    .json({
                      success: false,
                      message: "Gagal melakukan commit transaksi.",
                    });
                }

                console.log(
                  `[LOGIC] Sesi untuk ${number} telah diakhiri dan dipindahkan ke history.`
                );

                // Clear state dan timer via messageHandler
                const messageHandler = req.app.get('messageHandler');
                if (messageHandler) {
                  messageHandler.clearUserState(number);
                  console.log(`🔄 State dan timer cleared untuk ${number} (manual end)`);
                }

                res.json({
                  success: true,
                  message: "Chat berhasil diarsipkan.",
                });
              });
            }
          );
        }
      );
    });
  });

  // ⭐ ENDPOINT DIPERBAIKI: Mengirim pesan balasan + Aktivasi Session
  router.post("/send", async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({
      success: false,
      message: "Nomor tujuan dan pesan harus diisi",
    });
  }

  try {
    if (!whatsappClient || !whatsappClient.info) {
      return res.status(500).json({
        success: false,
        message: "WhatsApp client tidak tersedia atau tidak terhubung",
      });
    }

    const formattedNumber = to.includes("@c.us") ? to : `${to}@c.us`;
    
    // 🆕 SIMPAN return value dari sendMessage
    const sentMessage = await whatsappClient.sendMessage(formattedNumber, message);

    // 🆕 SIMPAN MESSAGE OBJECT ke cache untuk keperluan delete nanti
    if (sentMessage && sentMessage.id) {
      messageCache.set(sentMessage.id.id, sentMessage);
      console.log(`📦 Message cached: ${sentMessage.id.id}`);
    }

    const dbResult = await new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString();
      const query = `
        INSERT INTO chats (fromNumber, message, direction, timestamp, messageType, isRead, waMessageId)
        VALUES (?, ?, 'out', ?, 'chat', 1, ?)
      `;
      
      const waMessageId = sentMessage && sentMessage.id ? sentMessage.id.id : null;
      
      db.run(query, [to, message, timestamp, waMessageId], function (err) {
        if (err) {
          console.error("Error menyimpan pesan keluar:", err);
          return reject(new Error("Pesan terkirim tapi gagal disimpan ke database"));
        }
        resolve({
          id: this.lastID,
          timestamp: timestamp,
          waMessageId: waMessageId
        });
      });
    });

    const messageData = {
      id: dbResult.id,
      fromNumber: to,
      message: message,
      direction: "out",
      timestamp: dbResult.timestamp,
      messageType: "chat",
      isRead: true,
    };

    // ⭐ Aktifkan chat session jika user dalam CHATTING_WAITING
    const messageHandler = req.app.get('messageHandler');
    if (messageHandler) {
      const fromNumberClean = to.replace("@c.us", "");
      const userState = messageHandler.getUserState(fromNumberClean);
      
      if (userState === 'CHATTING_WAITING') {
        const activated = messageHandler.activateChatSessionForNumber(fromNumberClean);
        if (activated) {
          console.log(`✅ Chat session ACTIVATED untuk ${fromNumberClean} - Admin telah reply!`);
        }
      }
    }

    io.emit("messageSent", messageData);

    res.json({
      success: true,
      message: "Pesan berhasil dikirim dan disimpan",
      data: messageData,
    });
  } catch (error) {
    console.error("Error dalam proses mengirim pesan:", error.message);

    if (error.message && error.message.includes("phone number is not registered")) {
      return res.status(400).json({ 
        success: false, 
        message: "Nomor WhatsApp tidak terdaftar" 
      });
    }

    res.status(500).json({
      success: false,
      message: "Gagal mengirim pesan",
      details: error.message,
    });
  }
});

  // ⭐ ENDPOINT DIPERBAIKI: Mengirim media + Aktivasi Session
  router.post("/send-media", upload.array("media", 12), async (req, res) => {
    const to = req.body.to;
    const caption = req.body.caption || "";
    if (!to || !req.files || req.files.length === 0) {
      (req.files || []).forEach((f) => f.path && fs.unlink(f.path, () => {}));
      return res
        .status(400)
        .json({
          success: false,
          message: "Nomor tujuan dan file harus disediakan",
        });
    }

    try {
      if (!whatsappClient || !whatsappClient.info) {
        (req.files || []).forEach((f) => f.path && fs.unlink(f.path, () => {}));
        return res
          .status(500)
          .json({ success: false, message: "WhatsApp client tidak tersedia" });
      }

      const formattedNumber = to.includes("@c.us") ? to : `${to}@c.us`;
      const results = [];

      for (const file of req.files) {
        const filePath = file.path;
        const publicUrl = `${req.protocol}://${req.get(
          "host"
        )}/uploads/chat_media/${encodeURIComponent(file.filename)}`;

        let mtype = "document";
        if (file.mimetype.startsWith("image/")) mtype = "image";
        else if (file.mimetype.startsWith("video/")) mtype = "video";

        const media = MessageMedia.fromFilePath(filePath);
        const options = { caption };
        if (mtype === "document") options.sendMediaAsDocument = true;

        // 🆕 SIMPAN RETURN VALUE dari sendMessage
        const sentMessage = await whatsappClient.sendMessage(formattedNumber, media, options);

        // 🆕 SIMPAN MESSAGE OBJECT ke cache
        if (sentMessage && sentMessage.id) {
          messageCache.set(sentMessage.id.id, sentMessage);
          console.log(`📦 Media message cached: ${sentMessage.id.id}`);
        }

        const messageObj = {
          url: publicUrl,
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          caption,
        };

        const dbResult = await new Promise((resolve, reject) => {
          const timestamp = new Date().toISOString();
          // 🆕 TAMBAHKAN waMessageId ke query
          const query = `
            INSERT INTO chats (fromNumber, message, direction, timestamp, messageType, isRead, waMessageId)
            VALUES (?, ?, 'out', ?, ?, TRUE, ?)
          `;
          db.run(
            query,
            [to, JSON.stringify(messageObj), timestamp, mtype, sentMessage.id.id], // 🆕 tambah parameter
            function (err) {
              if (err) return reject(err);
              resolve({ id: this.lastID, timestamp });
            }
          );
        });

        const resultMessage = {
          id: dbResult.id,
          fromNumber: to,
          message: messageObj,
          direction: "out",
          timestamp: dbResult.timestamp,
          messageType: mtype,
          isRead: true,
        };

        results.push(resultMessage);
      }

      // ⭐ TAMBAHAN BARU: Aktifkan chat session jika user dalam CHATTING_WAITING
      const messageHandler = req.app.get('messageHandler');
      if (messageHandler) {
        const fromNumberClean = to.replace("@c.us", "");
        const userState = messageHandler.getUserState(fromNumberClean);
        
        if (userState === 'CHATTING_WAITING') {
          const activated = messageHandler.activateChatSessionForNumber(fromNumberClean);
          if (activated) {
            console.log(`✅ Chat session ACTIVATED untuk ${fromNumberClean} - Admin kirim media! Timer dimulai.`);
          }
        } else if (userState === 'CHATTING_ACTIVE') {
          console.log(`🔄 User ${fromNumberClean} sudah dalam CHATTING_ACTIVE, timer akan di-reset saat user reply.`);
        }
      }

      results.forEach((m) => io.emit("messageSent", m));

      res.json({
        success: true,
        message: "Media berhasil dikirim",
        data: results,
      });
    } catch (err) {
      console.error("Error send-media:", err);
      (req.files || []).forEach((f) => f.path && fs.unlink(f.path, () => {}));
      res
        .status(500)
        .json({
          success: false,
          message: "Gagal mengirim media",
          details: err.message,
        });
    }
  });

  // Endpoint untuk mendapatkan jumlah pesan yang belum dibaca
  router.get("/unread-count", (req, res) => {
    const query = `
            SELECT 
                COUNT(*) as totalUnread,
                COUNT(DISTINCT fromNumber) as conversationsWithUnread
            FROM chats 
            WHERE direction = 'in' AND isRead = 0
        `;

    db.get(query, [], (err, row) => {
      if (err) {
        console.error("Error getting unread count:", err);
        return res.status(500).json({ error: err.message });
      }

      const result = {
        totalUnread: row.totalUnread || 0,
        conversationsWithUnread: row.conversationsWithUnread || 0,
      };

      res.json(result);
    });
  });

  router.put("/mark-read/:number", (req, res) => {
    const { number } = req.params;

    if (!number) {
      return res.status(400).json({
        success: false,
        message: "Nomor telepon harus disediakan di URL",
      });
    }

    const query = `
            UPDATE chats 
            SET isRead = TRUE 
            WHERE fromNumber = ? AND direction = 'in' AND isRead = FALSE
        `;

    db.run(query, [number], function (err) {
      if (err) {
        console.error("Error marking messages as read:", err);
        return res.status(500).json({ success: false, message: err.message });
      }

      io.emit("messagesMarkedAsRead", {
        fromNumber: number,
        updatedCount: this.changes,
      });

      res.json({
        success: true,
        message: "Pesan berhasil ditandai sebagai sudah dibaca",
        updatedCount: this.changes,
      });
    });
  });

  router.get("/stats", (req, res) => {
    const statsQuery = `
            SELECT 
                COUNT(*) as totalMessages,
                COUNT(CASE WHEN direction = 'in' THEN 1 END) as incomingMessages,
                COUNT(CASE WHEN direction = 'out' THEN 1 END) as outgoingMessages,
                COUNT(CASE WHEN direction = 'in' AND isRead = FALSE THEN 1 END) as unreadMessages,
                COUNT(DISTINCT fromNumber) as uniqueContacts,
                DATE(timestamp) as today
            FROM chats
            WHERE DATE(timestamp) = DATE('now')
            
            UNION ALL
            
            SELECT 
                COUNT(*) as totalMessages,
                COUNT(CASE WHEN direction = 'in' THEN 1 END) as incomingMessages,
                COUNT(CASE WHEN direction = 'out' THEN 1 END) as outgoingMessages,
                COUNT(CASE WHEN direction = 'in' AND isRead = FALSE THEN 1 END) as unreadMessages,
                COUNT(DISTINCT fromNumber) as uniqueContacts,
                'total' as today
            FROM chats
        `;

    db.all(statsQuery, [], (err, rows) => {
      if (err) {
        console.error("Error getting chat stats:", err);
        res.status(500).json({ error: err.message });
        return;
      }

      const todayStats = rows.find((row) => row.today !== "total") || {};
      const totalStats = rows.find((row) => row.today === "total") || {};

      res.json({
        today: {
          totalMessages: todayStats.totalMessages || 0,
          incomingMessages: todayStats.incomingMessages || 0,
          outgoingMessages: todayStats.outgoingMessages || 0,
          unreadMessages: todayStats.unreadMessages || 0,
          uniqueContacts: todayStats.uniqueContacts || 0,
        },
        total: {
          totalMessages: totalStats.totalMessages || 0,
          incomingMessages: totalStats.incomingMessages || 0,
          outgoingMessages: totalStats.outgoingMessages || 0,
          unreadMessages: totalStats.unreadMessages || 0,
          uniqueContacts: totalStats.uniqueContacts || 0,
        },
      });
    });
  });

  router.delete("/conversation/:number", (req, res) => {
    const number = req.params.number;
    const deleteQuery = "DELETE FROM chats WHERE fromNumber = ?";

    db.run(deleteQuery, [number], function (err) {
      if (err) {
        console.error("Error deleting conversation:", err);
        res.status(500).json({ error: err.message });
        return;
      }

      io.emit("conversationDeleted", {
        fromNumber: number,
        deletedCount: this.changes,
      });

      res.json({
        success: true,
        message: "Percakapan berhasil dihapus",
        deletedCount: this.changes,
      });
    });
  });

  router.get("/contact-info/:number", (req, res) => {
    const number = req.params.number;

    const contactQuery = `
            SELECT 
                contacts.name,
                contacts.number,
                COUNT(chats.id) as totalMessages,
                MAX(chats.timestamp) as lastMessageTime,
                MIN(chats.timestamp) as firstMessageTime
            FROM contacts
            LEFT JOIN chats ON (
                contacts.number = chats.fromNumber 
                OR contacts.number = ('+' || chats.fromNumber)
                OR contacts.number = ('62' || SUBSTR(chats.fromNumber, 2))
            )
            WHERE contacts.number = ? 
                OR contacts.number = ('+' || ?)
                OR contacts.number = ('62' || SUBSTR(?, 2))
            GROUP BY contacts.id
        `;

    db.get(contactQuery, [number, number, number], (err, contact) => {
      if (err) {
        console.error("Error getting contact info:", err);
        res.status(500).json({ error: err.message });
        return;
      }

      if (!contact) {
        const chatQuery = `
                    SELECT 
                        fromNumber as number,
                        COUNT(*) as totalMessages,
                        MAX(timestamp) as lastMessageTime,
                        MIN(timestamp) as firstMessageTime
                    FROM chats 
                    WHERE fromNumber = ?
                `;

        db.get(chatQuery, [number], (chatErr, chatInfo) => {
          if (chatErr) {
            console.error("Error getting chat info:", chatErr);
            res.status(500).json({ error: chatErr.message });
            return;
          }

          res.json({
            name: null,
            number: number,
            totalMessages: chatInfo ? chatInfo.totalMessages : 0,
            lastMessageTime: chatInfo ? chatInfo.lastMessageTime : null,
            firstMessageTime: chatInfo ? chatInfo.firstMessageTime : null,
            isContact: false,
          });
        });
      } else {
        res.json({
          name: contact.name,
          number: contact.number,
          totalMessages: contact.totalMessages || 0,
          lastMessageTime: contact.lastMessageTime,
          firstMessageTime: contact.firstMessageTime,
          isContact: true,
        });
      }
    });
  });

  router.get("/backup/:number", (req, res) => {
    const number = req.params.number;
    const query =
      "SELECT * FROM chats WHERE fromNumber = ? ORDER BY timestamp ASC";

    db.all(query, [number], (err, rows) => {
      if (err) {
        console.error("Error getting backup data:", err);
        return res.status(500).json({ error: err.message });
      }

      const filename = `chat_backup_${number}_${
        new Date().toISOString().split("T")[0]
      }.json`;

      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.json({
        exportDate: new Date().toISOString(),
        totalMessages: rows.length,
        filterNumber: number,
        messages: rows,
      });
    });
  });

  router.get("/backup", (req, res) => {
    const query = "SELECT * FROM chats ORDER BY timestamp ASC";

    db.all(query, [], (err, rows) => {
      if (err) {
        console.error("Error getting backup data:", err);
        return res.status(500).json({ error: err.message });
      }

      const filename = `chat_backup_all_${
        new Date().toISOString().split("T")[0]
      }.json`;

      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.json({
        exportDate: new Date().toISOString(),
        totalMessages: rows.length,
        filterNumber: null,
        messages: rows,
      });
    });
  });

  router.put("/message/:messageId", (req, res) => {
    const messageId = req.params.messageId;
    const { newMessage } = req.body;

    if (!newMessage || newMessage.trim() === "") {
      return res.status(400).json({ 
        success: false, 
        message: "Pesan baru harus diisi" 
      });
    }

    // Get message data first
    db.get(
      "SELECT fromNumber, direction FROM chats WHERE id = ?",
      [messageId],
      (err, messageData) => {
        if (err) {
          console.error("Error getting message data:", err);
          return res.status(500).json({ error: err.message });
        }

        if (!messageData) {
          return res.status(404).json({ error: "Pesan tidak ditemukan" });
        }

        // Update message
        db.run(
          "UPDATE chats SET message = ?, editedAt = ? WHERE id = ?",
          [newMessage.trim(), new Date().toISOString(), messageId],
          function (updateErr) {
            if (updateErr) {
              console.error("Error updating message:", updateErr);
              return res.status(500).json({ error: updateErr.message });
            }

            // Emit socket event
            io.emit("messageEdited", {
              messageId: messageId,
              fromNumber: messageData.fromNumber,
              newMessage: newMessage.trim(),
              editedAt: new Date().toISOString()
            });

            res.json({
              success: true,
              message: "Pesan berhasil diupdate",
              data: {
                messageId: messageId,
                newMessage: newMessage.trim()
              }
            });
          }
        );
      }
    );
  });

  // Update existing delete message endpoint untuk emit yang lebih baik
  router.delete("/message/:messageId", async (req, res) => {
  const messageId = req.params.messageId;

  try {
    // Get message data
    const messageData = await new Promise((resolve, reject) => {
      db.get(
        "SELECT fromNumber, direction, messageType, waMessageId, message FROM chats WHERE id = ?",
        [messageId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!messageData) {
      return res.status(404).json({ 
        success: false,
        message: "Pesan tidak ditemukan" 
      });
    }

    let deletedFromWhatsApp = false;

    // Coba hapus dari WhatsApp jika pesan outgoing dan ada waMessageId
    if (messageData.direction === 'out' && messageData.waMessageId) {
      const cachedMessage = messageCache.get(messageData.waMessageId);
      
      if (cachedMessage) {
        try {
          await cachedMessage.delete(true); // true = delete for everyone
          deletedFromWhatsApp = true;
          messageCache.delete(messageData.waMessageId);
          console.log(`✅ Pesan berhasil dihapus dari WhatsApp (ID: ${messageData.waMessageId})`);
        } catch (deleteErr) {
          console.error('❌ Gagal hapus dari WhatsApp:', deleteErr.message);
          
          // Fallback: kirim notifikasi jika gagal hapus
          const fromNumber = messageData.fromNumber;
          const formattedNumber = fromNumber.includes('@c.us') ? fromNumber : `${fromNumber}@c.us`;
          const notificationText = `🗑️ *Pesan Dihapus oleh Admin*\n\nPesan: "${messageData.message}"\n\nMohon abaikan pesan tersebut.`;
          
          try {
            await whatsappClient.sendMessage(formattedNumber, notificationText);
            console.log(`📤 Notifikasi penghapusan terkirim ke ${fromNumber}`);
          } catch (notifErr) {
            console.error('❌ Gagal kirim notifikasi:', notifErr);
          }
        }
      } else {
        console.log(`⚠️ Message object tidak ditemukan di cache (ID: ${messageData.waMessageId})`);
        
        // Kirim notifikasi sebagai fallback
        const fromNumber = messageData.fromNumber;
        const formattedNumber = fromNumber.includes('@c.us') ? fromNumber : `${fromNumber}@c.us`;
        const notificationText = `🗑️ *Pesan Dihapus oleh Admin*\n\nPesan: "${messageData.message}"\n\nMohon abaikan pesan tersebut.`;
        
        try {
          await whatsappClient.sendMessage(formattedNumber, notificationText);
          console.log(`📤 Notifikasi penghapusan terkirim (fallback) ke ${fromNumber}`);
        } catch (notifErr) {
          console.error('❌ Gagal kirim notifikasi:', notifErr);
        }
      }
    }

    // Hapus dari database
    await new Promise((resolve, reject) => {
      db.run("DELETE FROM chats WHERE id = ?", [messageId], function (err) {
        if (err) reject(err);
        else resolve();
      });
    });

    io.emit("messageDeleted", {
      messageId: messageId,
      fromNumber: messageData.fromNumber,
      deletedFromWhatsApp: deletedFromWhatsApp
    });

    res.json({
      success: true,
      message: deletedFromWhatsApp 
        ? "Pesan berhasil dihapus dari WhatsApp dan database" 
        : "Pesan dihapus dari database (notifikasi terkirim ke user)",
      deletedFromWhatsApp: deletedFromWhatsApp
    });

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus pesan",
      details: error.message
    });
  }
});


   router.post("/unsend/:messageId", async (req, res) => {
    const messageId = req.params.messageId;

    try {
      // Get message data
      const messageData = await new Promise((resolve, reject) => {
        db.get(
          "SELECT fromNumber, message, direction FROM chats WHERE id = ?",
          [messageId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!messageData) {
        return res.status(404).json({
          success: false,
          message: "Pesan tidak ditemukan"
        });
      }

      // Hanya bisa unsend pesan outgoing (dari admin)
      if (messageData.direction !== 'out') {
        return res.status(400).json({
          success: false,
          message: "Hanya pesan admin yang bisa di-unsend"
        });
      }

      const fromNumber = messageData.fromNumber;
      const formattedNumber = fromNumber.includes('@c.us') ? fromNumber : `${fromNumber}@c.us`;

      // Kirim notifikasi pembatalan ke user
      const notificationText = `❌ *Pesan Dibatalkan*\n\nPesan sebelumnya: "${messageData.message}"\n\nMohon abaikan pesan tersebut.`;

      // Kirim ke WhatsApp
      await whatsappClient.sendMessage(formattedNumber, notificationText);

      // Simpan notifikasi ke database
      const timestamp = new Date().toISOString();
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO chats (fromNumber, message, direction, timestamp, messageType, isRead)
           VALUES (?, ?, 'out', ?, 'chat', TRUE)`,
          [fromNumber, notificationText, timestamp],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      // Update pesan original dengan status unsent
      await new Promise((resolve, reject) => {
        db.run(
          "UPDATE chats SET message = ?, editedAt = ? WHERE id = ?",
          [
            `[DIBATALKAN] ${messageData.message}`,
            new Date().toISOString(),
            messageId
          ],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Emit socket event
      io.emit("messageUnsent", {
        messageId: messageId,
        fromNumber: fromNumber
      });

      res.json({
        success: true,
        message: "Pesan berhasil dibatalkan dan notifikasi terkirim ke user",
        data: {
          messageId: messageId
        }
      });

    } catch (error) {
      console.error('Error unsending message:', error);
      res.status(500).json({
        success: false,
        message: "Gagal membatalkan pesan",
        details: error.message
      });
    }
  });

  // ==========================================
  // ENDPOINT: Edit Message dengan Notifikasi ke User
  // ==========================================
  router.put("/message/:messageId/with-notification", async (req, res) => {
    const messageId = req.params.messageId;
    const { newMessage } = req.body;

    if (!newMessage || newMessage.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Pesan baru harus diisi"
      });
    }

    try {
      // Get message data
      const messageData = await new Promise((resolve, reject) => {
        db.get(
          "SELECT fromNumber, message, direction, messageType FROM chats WHERE id = ?",
          [messageId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!messageData) {
        return res.status(404).json({
          success: false,
          message: "Pesan tidak ditemukan"
        });
      }

      // Only allow editing outgoing text messages
      if (messageData.direction !== 'out' || messageData.messageType !== 'chat') {
        return res.status(400).json({
          success: false,
          message: "Hanya pesan teks admin yang bisa diedit"
        });
      }

      const fromNumber = messageData.fromNumber;
      const formattedNumber = fromNumber.includes('@c.us') ? fromNumber : `${fromNumber}@c.us`;

      // Kirim notifikasi koreksi ke user
      const correctionText = `🔄 *Koreksi Pesan*\n\n❌ Pesan sebelumnya:\n"${messageData.message}"\n\n✅ Yang benar:\n"${newMessage.trim()}"`;
      
      await whatsappClient.sendMessage(formattedNumber, correctionText);

      // Update di database
      const editedAt = new Date().toISOString();
      await new Promise((resolve, reject) => {
        db.run(
          "UPDATE chats SET message = ?, editedAt = ? WHERE id = ?",
          [newMessage.trim(), editedAt, messageId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Simpan pesan koreksi juga ke database
      const timestamp = new Date().toISOString();
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO chats (fromNumber, message, direction, timestamp, messageType, isRead)
           VALUES (?, ?, 'out', ?, 'chat', TRUE)`,
          [fromNumber, correctionText, timestamp],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      // Emit socket event
      io.emit("messageEdited", {
        messageId: messageId,
        fromNumber: fromNumber,
        newMessage: newMessage.trim(),
        editedAt: editedAt,
        notificationSent: true
      });

      res.json({
        success: true,
        message: "Pesan berhasil diupdate dan koreksi terkirim ke user",
        data: {
          messageId: messageId,
          newMessage: newMessage.trim(),
          editedAt: editedAt
        }
      });

    } catch (error) {
      console.error('Error editing message with notification:', error);
      res.status(500).json({
        success: false,
        message: "Gagal mengedit pesan",
        details: error.message
      });
    }
  });

  return router;

}

module.exports = createChatsRouter;