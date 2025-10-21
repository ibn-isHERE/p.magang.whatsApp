const express = require("express");
const bodyParser = require("body-parser");
const http = require('http');
const cors = require("cors");
const db = require('./database');
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const path = require("path");

const { Server } = require('socket.io');

const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const xlsx = require('xlsx');

// ========================================
// IMPORT MESSAGE HANDLER BARU
// ========================================
const MessageHandler = require('./handlers/messageHandler');

const app = express();
const port = 3000;

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware Express
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static("public"));

const mediaDir = path.join(__dirname, 'media');
if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
}
app.use('/media', express.static(mediaDir));

const chatMediaDir = path.join(__dirname, 'uploads', 'chat_media');
if (!fs.existsSync(chatMediaDir)) {
    fs.mkdirSync(chatMediaDir, { recursive: true });
}
app.use('/uploads/chat_media', express.static(chatMediaDir));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const chatMediaStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, mediaDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, uniqueSuffix + extension);
    }
});

const uploadChatMedia = multer({ 
    storage: chatMediaStorage,
    limits: { 
        fileSize: 16 * 1024 * 1024 // 16MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/quicktime', 'video/x-msvideo',
            'audio/mpeg', 'audio/wav', 'audio/ogg',
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('File type not supported'), false);
        }
    }
});

const upload = multer({ dest: uploadDir });

// Inisialisasi Client WhatsApp
const client = new Client({
    puppeteer: {
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        headless: true,
    },
    authStrategy: new LocalAuth(),
});
app.locals.whatsappClient = client;

app.set('whatsappClient', client);
app.set('io', io);

// ========================================
// INISIALISASI MESSAGE HANDLER
// ========================================
let messageHandler;

client.on("qr", (qr) => {
    console.log("Pindai kode QR ini dengan aplikasi WhatsApp Anda:");
    qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
    console.log("Client WhatsApp siap digunakan!");
    
    // Inisialisasi message handler setelah client ready
    messageHandler = new MessageHandler(db, client, io, mediaDir);
    console.log("✅ Message Handler initialized");
    
    // PENTING: Set messageHandler ke app agar bisa diakses dari routes
    app.set('messageHandler', messageHandler);
    console.log("✅ MessageHandler set to app");
    
    // Set client ke schedules module
    schedulesModule.setWhatsappClient(client);
    
    // Load schedules yang existing
    schedulesModule.loadAndScheduleExistingMessages();
    
    // Inisialisasi meetings module jika ada
    if (meetingsModule.initializeMeetings) {
        meetingsModule.initializeMeetings(db, client);
    }
});

// ========================================
// EVENT HANDLER UNTUK PESAN MASUK - VERSI BARU (SIMPLIFIED)
// ========================================
client.on('message', async (message) => {
    if (!messageHandler) {
        console.warn('⚠️ Message handler belum siap');
        return;
    }
    
    // Delegate semua logic ke MessageHandler
    await messageHandler.handleIncomingMessage(message);
});

client.on("auth_failure", (msg) => {
    console.error("Gagal autentikasi WhatsApp:", msg);
});

client.on("disconnected", (reason) => {
    console.log("Client WhatsApp terputus:", reason);
    client.initialize();
});

client.initialize();

// Import modules
const schedulesModule = require("./routes/schedules.js");
const meetingsModule = require("./routes/meetings");
const createContactsRouter = require("./routes/contacts");
const createChatsRouter = require("./routes/chats");
const createGroupsRouter = require('./routes/groups');

// Setup routers
app.use("/", schedulesModule.router);
app.use("/", meetingsModule.router);
app.use("/api/contacts", createContactsRouter(db));
app.use("/api/chats", createChatsRouter(db, client, io));
app.use('/api/groups', createGroupsRouter(db));

// Endpoint untuk mengirim media
app.post('/api/chats/send-media', uploadChatMedia.single('media'), async (req, res) => {
    try {
        const { to, message: caption } = req.body;
        
        if (!to) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nomor tujuan harus diisi' 
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'File media harus dipilih' 
            });
        }

        if (!client || !client.info) {
            return res.status(500).json({ 
                success: false, 
                message: 'WhatsApp client tidak tersedia' 
            });
        }

        const media = MessageMedia.fromFilePath(req.file.path);
        const formattedNumber = to.includes('@c.us') ? to : `${to}@c.us`;

        await client.sendMessage(formattedNumber, media, { caption: caption || '' });

        // Reset timer inaktivitas jika ada
        if (messageHandler && messageHandler.getUserState(to) === 'CHATTING') {
            messageHandler.menuHandler.setInactivityTimer(to);
        }

        const permanentPath = path.join(mediaDir, req.file.filename);
        fs.renameSync(req.file.path, permanentPath);
        
        const mediaUrl = `/media/${req.file.filename}`;
        
        let messageType = 'document';
        if (req.file.mimetype.startsWith('image/')) messageType = 'image';
        else if (req.file.mimetype.startsWith('video/')) messageType = 'video';
        else if (req.file.mimetype.startsWith('audio/')) messageType = 'audio';

        const timestamp = new Date().toISOString();
        const displayMessage = caption || `[${messageType.charAt(0).toUpperCase() + messageType.slice(1)}]`;
        
        const mediaData = {
            filename: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            url: mediaUrl
        };

        const insertQuery = `
            INSERT INTO chats (fromNumber, message, direction, timestamp, messageType, mediaUrl, mediaData, isRead)
            VALUES (?, ?, 'out', ?, ?, ?, ?, TRUE)
        `;
        
        db.run(insertQuery, [
            to, displayMessage, timestamp, messageType, mediaUrl, JSON.stringify(mediaData)
        ], function(err) {
            if (err) {
                console.error('Error menyimpan media keluar:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Media terkirim tapi gagal disimpan ke database' 
                });
            }
            
            const messageData = {
                id: this.lastID,
                fromNumber: to,
                message: displayMessage,
                direction: 'out',
                timestamp: timestamp,
                messageType: messageType,
                mediaUrl: mediaUrl,
                mediaData: mediaData,
                isRead: true
            };
            
            io.emit('messageSent', messageData);
            
            res.json({ 
                success: true, 
                message: 'Media berhasil dikirim',
                data: messageData
            });
        });
        
    } catch (error) {
        console.error('Error sending media:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengirim media',
            details: error.message 
        });
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('👤 Admin connected:', socket.id);
    
    socket.on('test', (data) => {
        console.log('🧪 Test event received from frontend:', data);
        socket.emit('testResponse', { message: 'Backend received test' });
    });
    
    socket.on('disconnect', () => {
        console.log('👤 Admin disconnected:', socket.id);
    });
    
    socket.onAny((eventName, ...args) => {
        console.log('📡 Socket event from client:', eventName, args);
    });
});

app.get("/get-all-schedules", (req, res) => {
  const { status } = req.query;

  let scheduleQuery = `SELECT *, 'message' as type FROM schedules`;
  let scheduleParams = [];
  
  let meetingQuery = `SELECT
    id,
    numbers,
    meetingTitle as message,
    filesData,
    datetime(start_epoch / 1000, 'unixepoch', 'localtime') as scheduledTime,
    status,
    meetingRoom,
    date,
    startTime,
    endTime,
    datetime(end_epoch / 1000, 'unixepoch', 'localtime') as meetingEndTime, 
    'meeting' as type
  FROM meetings`;
  
  let meetingParams = [];

  if (status && status !== "all") {
    scheduleQuery += ` WHERE status = ?`;
    meetingQuery += ` WHERE status = ?`;
    scheduleParams.push(status);
    meetingParams.push(status);
  }

  db.all(scheduleQuery, scheduleParams, (err, scheduleRows) => {
    if (err) {
      console.error("Gagal mengambil data schedules:", err.message);
      return res.status(500).json({ error: "Gagal mengambil data schedules." });
    }

    db.all(meetingQuery, meetingParams, (errMeeting, meetingRows) => {
      if (errMeeting) {
        console.error("Gagal mengambil data meetings:", errMeeting.message);
        return res.status(500).json({ error: "Gagal mengambil data meetings." });
      }

      try {
        const processedSchedules = scheduleRows.map((row) => {
          return {
            id: row.id,
            numbers: JSON.parse(row.numbers || '[]'),
            message: row.message,
            filesData: JSON.parse(row.filesData || '[]'),
            scheduledTime: row.scheduledTime,
            status: row.status,
            type: "message",
          };
        });

        const processedMeetings = meetingRows.map((row) => {
          return {
            id: row.id,
            numbers: JSON.parse(row.numbers || '[]'),
            originalNumbers: JSON.parse(row.numbers || '[]'),
            message: row.message,
            meetingTitle: row.message,
            filesData: JSON.parse(row.filesData || '[]'),
            scheduledTime: row.scheduledTime,
            meetingEndTime: row.meetingEndTime,
            status: row.status,
            type: "meeting",
            meetingRoom: row.meetingRoom,
            date: row.date,
            startTime: row.startTime,
            endTime: row.endTime,
          };
        });

        const allSchedules = [...processedSchedules, ...processedMeetings];
        
        allSchedules.sort((a, b) => {
          const isActiveA = a.status === "terjadwal" || a.status === "terkirim";
          const isActiveB = b.status === "terjadwal" || b.status === "terkirim";
          if (isActiveA && !isActiveB) return -1;
          if (!isActiveA && isActiveB) return 1;
          if (isActiveA && isActiveB) {
            return new Date(a.scheduledTime) - new Date(b.scheduledTime);
          } else {
            return new Date(b.scheduledTime) - new Date(a.scheduledTime);
          }
        });

        res.json(allSchedules);
      } catch (error) {
        console.error("Error processing combined schedule data:", error);
        res.status(500).json({ error: "Error processing combined schedule data" });
      }
    });
  });
});

app.get("/system-stats", (req, res) => {
  db.get(
    `SELECT COUNT(*) as totalMessages FROM schedules`,
    (err, messageCount) => {
      if (err) {
        return res.status(500).json({ error: "Error getting message stats" });
      }

      db.get(
        `SELECT COUNT(*) as totalMeetings FROM meetings`,
        (errMeeting, meetingCount) => {
          if (errMeeting) {
            return res
              .status(500)
              .json({ error: "Error getting meeting stats" });
          }

          db.get(
            `SELECT COUNT(*) as totalContacts FROM contacts`,
            (errContacts, contactCount) => {
              db.get(
                `SELECT COUNT(*) as totalChats, 
                        COUNT(CASE WHEN direction = 'in' AND isRead = FALSE THEN 1 END) as unreadMessages,
                        COUNT(DISTINCT fromNumber) as uniqueContacts
                 FROM chats`,
                (errChats, chatStats) => {
                  const stats = {
                    messages: {
                      total: messageCount ? messageCount.totalMessages : 0,
                    },
                    meetings: {
                      total: meetingCount ? meetingCount.totalMeetings : 0,
                    },
                    contacts: {
                      total: contactCount ? contactCount.totalContacts : 0,
                    },
                    chats: {
                      total: chatStats ? chatStats.totalChats : 0,
                      unread: chatStats ? chatStats.unreadMessages : 0,
                      uniqueContacts: chatStats ? chatStats.uniqueContacts : 0,
                    },
                    whatsappStatus: client.info ? "connected" : "disconnected",
                    serverUptime: process.uptime(),
                    timestamp: new Date().toISOString(),
                  }; 

                  db.all(
                    `SELECT status, COUNT(*) as count FROM schedules GROUP BY status`,
                    (errStatus, statusRows) => {
                      if (!errStatus && statusRows) {
                        stats.messages.byStatus = {};

                        statusRows.forEach((row) => {
                          stats.messages.byStatus[row.status] = row.count;
                        });
                      }

                      db.all(
                        `SELECT status, COUNT(*) as count FROM meetings GROUP BY status`,
                        (errMeetingStatus, meetingStatusRows) => {
                          if (!errMeetingStatus && meetingStatusRows) {
                            stats.meetings.byStatus = {};

                            meetingStatusRows.forEach((row) => {
                              stats.meetings.byStatus[row.status] = row.count;
                            });
                          }

                          res.json(stats);
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    whatsapp: client.info ? "connected" : "disconnected",
  });
});

function validatePhoneNumber(number) {
  const cleaned = String(number).trim().replace(/[^\d+]/g, '');
  
  if (!cleaned) {
    return { valid: false, message: 'Nomor telepon tidak boleh kosong' };
  }

  const digitOnly = cleaned.replace(/\+/g, '');
  if (digitOnly.length < 10) {
    return { valid: false, message: 'Nomor telepon minimal 10 digit' };
  }
  
  if (digitOnly.length > 15) {
    return { valid: false, message: 'Nomor telepon maksimal 15 digit' };
  }

  const patterns = [
    /^08\d{8,13}$/,
    /^\+628\d{8,13}$/,
    /^628\d{8,13}$/
  ];

  const isValidFormat = patterns.some(pattern => pattern.test(cleaned));
  
  if (!isValidFormat) {
    return { valid: false, message: 'Format nomor tidak valid' };
  }

  let normalized = cleaned;
  if (normalized.startsWith('+62')) {
    normalized = '0' + normalized.slice(3);
  } else if (normalized.startsWith('628')) {
    normalized = '0' + normalized.slice(2);
  } else if (normalized.startsWith('62') && !normalized.startsWith('620')) {
    normalized = '0' + normalized.slice(2);
  }

  return {
    valid: true,
    message: 'Nomor telepon valid',
    normalized: normalized
  };
}

function parseGroupsFromImport(grupValue) {
  if (!grupValue) return [];
  
  const stringValue = String(grupValue).trim();
  
  // Jika kosong
  if (stringValue.length === 0) return [];
  
  // Cek apakah JSON array
  if (stringValue.startsWith('[') && stringValue.endsWith(']')) {
    try {
      const parsed = JSON.parse(stringValue);
      if (Array.isArray(parsed)) {
        return parsed
          .map(g => String(g).trim())
          .filter(g => g.length > 0);
      }
    } catch (e) {
      console.warn('Failed to parse JSON array:', stringValue);
    }
  }
  
  // Deteksi separator (koma atau pipe)
  let separator = ',';
  if (stringValue.includes('|') && !stringValue.includes(',')) {
    separator = '|';
  }
  
  // Split dan clean
  const groups = stringValue
    .split(separator)
    .map(g => g.trim())
    .filter(g => g.length > 0);
  
  return groups;
}

app.post('/api/import', upload.single('contactFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Tidak ada file yang diunggah.' 
        });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    let contactsToImport = [];

    const processAndSave = async (contacts) => {
    if (!contacts || contacts.length === 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ 
          success: false, 
          message: 'File tidak mengandung data kontak yang valid' 
        });
    }

    let imported = 0;
    let skipped = 0;
    let errors = [];
    let groupsCreated = 0;
    let groupsSynced = 0;
    const groupsToCreate = new Set();
    const groupMemberMap = {};

    try {
        console.log("📋 STEP 1: Validating contacts...");
        
        for (let index = 0; index < contacts.length; index++) {
            const contact = contacts[index];
            
            console.log(`\n📝 Baris ${index + 1}:`, {
                name: contact.name,
                number: contact.number,
                instansi: contact.instansi,
                jabatan: contact.jabatan,
                grup: contact.grup
            });
            
            try {
                // Validate name
                if (!contact.name || contact.name.trim().length < 2) {
                    skipped++;
                    errors.push(`Baris ${index + 1}: Nama tidak valid`);
                    continue;
                }

                // Validate and normalize phone number
                const phoneValidation = validatePhoneNumber(contact.number);
                if (!phoneValidation.valid) {
                    skipped++;
                    errors.push(`Baris ${index + 1}: ${phoneValidation.message}`);
                    continue;
                }

                const normalizedNumber = phoneValidation.normalized;

                // Check if number already exists
                const existingContact = await new Promise((resolve, reject) => {
                    db.get('SELECT id FROM contacts WHERE number = ?', [normalizedNumber], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });

                if (existingContact) {
                    skipped++;
                    console.log(`⏭️  Nomor ${normalizedNumber} sudah ada - skip`);
                    continue;
                }

                // ✅ PARSE GROUPS - SUPPORT MULTIPLE FORMAT
                const grupArray = parseGroupsFromImport(contact.grup);
                console.log(`👥 Groups untuk kontak ini:`, grupArray);

                const instansi = contact.instansi && contact.instansi.trim() ? contact.instansi.trim() : null;
                const jabatan = contact.jabatan && contact.jabatan.trim() ? contact.jabatan.trim() : null;
                
                console.log(`✅ Akan menyimpan:`, {
                    name: contact.name.trim(),
                    number: normalizedNumber,
                    instansi,
                    jabatan,
                    groups: grupArray
                });

                // Insert contact ke database
                const contactId = await new Promise((resolve, reject) => {
                    db.run(
                        `INSERT INTO contacts (name, number, instansi, jabatan, grup) VALUES (?, ?, ?, ?, ?)`,
                        [
                            contact.name.trim(), 
                            normalizedNumber, 
                            instansi, 
                            jabatan,
                            grupArray.length > 0 ? JSON.stringify(grupArray) : null
                        ],
                        function(err) {
                            if (err) reject(err);
                            else {
                                imported++;
                                resolve(this.lastID);
                            }
                        }
                    );
                });

                // Track semua groups untuk sync
                for (const groupName of grupArray) {
                    groupsToCreate.add(groupName);
                    
                    if (!groupMemberMap[groupName]) {
                        groupMemberMap[groupName] = [];
                    }
                    groupMemberMap[groupName].push(normalizedNumber);
                }

            } catch (error) {
                skipped++;
                errors.push(`Baris ${index + 1}: ${error.message}`);
                console.error(`❌ Error pada baris ${index + 1}:`, error);
            }
        }

        console.log("\n📊 STEP 1 Complete - Summary:");
        console.log(`  ✅ Imported: ${imported}`);
        console.log(`  ⏭️  Skipped: ${skipped}`);
        console.log(`  👥 Groups to sync: ${Array.from(groupsToCreate).length}`);

        // STEP 2: Sync ke existing groups (jika ada)
        console.log("\n📋 STEP 2: Syncing with existing groups...");
        
        for (const groupName of groupsToCreate) {
            try {
                const existingGroup = await new Promise((resolve, reject) => {
                    db.get('SELECT id, members FROM groups WHERE name = ?', [groupName], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });

                const memberNumbers = groupMemberMap[groupName] || [];

                if (existingGroup) {
                    // Grup sudah ada - merge members
                    let existingMembers = [];
                    try {
                        existingMembers = existingGroup.members ? JSON.parse(existingGroup.members) : [];
                    } catch (e) {
                        existingMembers = [];
                    }

                    if (!Array.isArray(existingMembers)) {
                        existingMembers = [];
                    }

                    const mergedSet = new Set([
                        ...existingMembers.map(String),
                        ...memberNumbers.map(String)
                    ]);
                    const mergedArray = Array.from(mergedSet);
                    const mergedJson = JSON.stringify(mergedArray);

                    await new Promise((resolve, reject) => {
                        db.run(
                            'UPDATE groups SET members = ? WHERE id = ?',
                            [mergedJson, existingGroup.id],
                            (err) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });

                    console.log(`📝 Updated grup "${groupName}" dengan ${memberNumbers.length} member baru`);
                    groupsSynced++;
                } else {
                    console.log(`⏸️  Grup "${groupName}" belum ada - akan dibuat manual oleh user`);
                }

            } catch (syncError) {
                console.error(`❌ Error syncing grup "${groupName}":`, syncError);
                errors.push(`Group sync error: ${groupName}`);
            }
        }

        fs.unlinkSync(filePath);

        console.log("\n✅ Import Complete!");
        res.json({
            success: true,
            message: `Import selesai - ${imported} kontak berhasil ditambahkan`,
            stats: {
                imported: imported,
                skipped: skipped,
                total: contacts.length,
                groupsToSync: Array.from(groupsToCreate).length,
                groupsSynced: groupsSynced
            },
            details: {
                groupList: Array.from(groupsToCreate),
                errorSummary: errors.slice(0, 10)
            },
            errors: errors.slice(0, 10)
        });

    } catch (error) {
        console.error("Import processing error:", error);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat memproses import',
            error: error.message
        });
    }
};

    try {
        if (fileExt === '.csv') {
            // Process CSV
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => contactsToImport.push(row))
                .on('end', () => processAndSave(contactsToImport))
                .on('error', (error) => {
                    console.error('CSV parsing error:', error);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    res.status(500).json({
                        success: false,
                        message: 'Gagal membaca file CSV',
                        error: error.message
                    });
                });
                
        } else if (fileExt === '.xlsx' || fileExt === '.xls') {
            // Process Excel
            const workbook = xlsx.readFile(filePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            contactsToImport = xlsx.utils.sheet_to_json(sheet);
            await processAndSave(contactsToImport);
            
        } else if (fileExt === '.json') {
            // Process JSON
            contactsToImport = JSON.parse(fs.readFileSync(filePath));
            await processAndSave(contactsToImport);
            
        } else {
            fs.unlinkSync(filePath);
            res.status(400).json({ 
              success: false, 
              message: 'Tipe file tidak didukung. Harap gunakan CSV, Excel, atau JSON.' 
            });
        }
    } catch (error) {
        console.error("Gagal memproses file import:", error);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).json({ 
          success: false, 
          message: 'Terjadi kesalahan saat memproses file.',
          error: error.message 
        });
    }
});

function emitScheduleStatusUpdate(scheduleId, newStatus, message = null) {
  if (io) {
    io.emit('schedule-status-updated', {
      scheduleId,
      newStatus,
      message,
      timestamp: new Date().toISOString()
    });
    console.log(`📡 Emitted schedule-status-updated: ${scheduleId} -> ${newStatus}`);
  }
}

/**
 * Helper function untuk emit meeting status update
 */
function emitMeetingStatusUpdate(scheduleId, newStatus, message = null) {
  if (io) {
    io.emit('meeting-status-updated', {
      scheduleId,
      newStatus,
      message,
      timestamp: new Date().toISOString()
    });
    console.log(`📡 Emitted meeting-status-updated: ${scheduleId} -> ${newStatus}`);
  }
}

/**
 * Helper function untuk emit schedule created
 */
function emitScheduleCreated(scheduleData) {
  if (io) {
    io.emit('schedule-created', {
      schedule: scheduleData,
      timestamp: new Date().toISOString()
    });
    console.log(`📡 Emitted schedule-created: ${scheduleData.id}`);
  }
}

/**
 * Helper function untuk emit schedule deleted
 */
function emitScheduleDeleted(scheduleId) {
  if (io) {
    io.emit('schedule-deleted', {
      scheduleId,
      timestamp: new Date().toISOString()
    });
    console.log(`📡 Emitted schedule-deleted: ${scheduleId}`);
  }
}

// Export helper functions agar bisa digunakan di module lain
global.emitScheduleStatusUpdate = emitScheduleStatusUpdate;
global.emitMeetingStatusUpdate = emitMeetingStatusUpdate;
global.emitScheduleCreated = emitScheduleCreated;
global.emitScheduleDeleted = emitScheduleDeleted;

// Juga set io ke global untuk akses mudah
global.io = io;

console.log("✅ Socket.IO helper functions registered globally");

// Error handling middleware
app.use((error, req, res, next) => {
    console.error(error.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: "Not Found",
        message: `Route ${req.method} ${req.path} not found`,
    });
});

// Graceful shutdown
process.on("SIGTERM", () => {
    console.log("SIGTERM received. Shutting down gracefully...");
    client.destroy();
    db.close((err) => {
        if (err) {
            console.error("Error closing database:", err.message);
        } else {
            console.log("Database connection closed.");
        }
        process.exit(0);
    });
});

process.on("SIGINT", () => {
    console.log("SIGINT received. Shutting down gracefully...");
    client.destroy();
    db.close((err) => {
        if (err) {
            console.error("Error closing database:", err.message);
        } else {
            console.log("Database connection closed.");
        }
        process.exit(0);
    });
});

// Gunakan server.listen() bukan app.listen() untuk Socket.IO
server.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
    console.log(`Socket.IO server ready`);
    console.log(`Media folder: ${mediaDir}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log("=".repeat(50));
});

module.exports = app;