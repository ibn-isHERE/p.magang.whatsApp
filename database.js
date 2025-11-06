const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Menentukan path ke file database agar tidak salah lokasi
const DB_PATH = path.join(__dirname, "reminders.db");

// Membuat koneksi ke database. File akan dibuat jika belum ada.
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("❌ Gagal membuka database:", err.message);
    } else {
        console.log("✅ Terhubung ke database SQLite.");
    }
});

// Menggunakan db.serialize() untuk memastikan semua perintah pembuatan tabel
// dijalankan secara berurutan satu per satu.
db.serialize(() => {
    console.log("🔧 Creating database tables...\n");

    // ==========================================
    // 1. SCHEDULES TABLE (Message Reminders)
    // ==========================================
    db.run(
        `CREATE TABLE IF NOT EXISTS schedules (
            id TEXT PRIMARY KEY,
            numbers TEXT NOT NULL,
            message TEXT,
            filesData TEXT,
            scheduledTime TEXT NOT NULL,
            status TEXT NOT NULL,
            selectedGroups TEXT,
            groupInfo TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
            if (err) {
                console.error("❌ Gagal membuat tabel 'schedules':", err.message);
            } else {
                console.log("✅ Tabel 'schedules' siap digunakan.");
                
                // Migration: Add missing columns if needed
                db.all("PRAGMA table_info(schedules)", (pragmaErr, columns) => {
                    if (pragmaErr) return;
                    
                    const columnNames = columns.map(col => col.name);
                    
                    if (!columnNames.includes('selectedGroups')) {
                        db.run(`ALTER TABLE schedules ADD COLUMN selectedGroups TEXT`, (alterErr) => {
                            if (!alterErr) {
                                console.log("✅ Added selectedGroups column to schedules");
                            }
                        });
                    }
                    
                    if (!columnNames.includes('groupInfo')) {
                        db.run(`ALTER TABLE schedules ADD COLUMN groupInfo TEXT`, (alterErr) => {
                            if (!alterErr) {
                                console.log("✅ Added groupInfo column to schedules");
                            }
                        });
                    }
                });
            }
        }
    );

    // ==========================================
    // 2. MEETINGS TABLE (Meeting Schedules)
    // ==========================================
    db.run(
        `CREATE TABLE IF NOT EXISTS meetings (
            id TEXT PRIMARY KEY,
            meetingTitle TEXT NOT NULL,
            numbers TEXT NOT NULL,
            meetingRoom TEXT NOT NULL,
            date TEXT NOT NULL,
            startTime TEXT NOT NULL,
            endTime TEXT NOT NULL,
            status TEXT NOT NULL,
            filesData TEXT,
            selectedGroups TEXT,
            groupInfo TEXT,
            start_epoch INTEGER,
            end_epoch INTEGER,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
            if (err) {
                console.error("❌ Gagal membuat tabel 'meetings':", err.message);
            } else {
                console.log("✅ Tabel 'meetings' siap digunakan.");
                
                // Migration: Add missing columns if needed
                db.all("PRAGMA table_info(meetings)", (pragmaErr, columns) => {
                    if (pragmaErr) return;
                    
                    const columnNames = columns.map(col => col.name);
                    
                    if (!columnNames.includes('selectedGroups')) {
                        db.run(`ALTER TABLE meetings ADD COLUMN selectedGroups TEXT`, (alterErr) => {
                            if (!alterErr) {
                                console.log("✅ Added selectedGroups column to meetings");
                            }
                        });
                    }
                    
                    if (!columnNames.includes('groupInfo')) {
                        db.run(`ALTER TABLE meetings ADD COLUMN groupInfo TEXT`, (alterErr) => {
                            if (!alterErr) {
                                console.log("✅ Added groupInfo column to meetings");
                            }
                        });
                    }
                });
            }
        }
    );

    // ==========================================
    // 3. CONTACTS TABLE (Contact Management)
    // ==========================================
    db.run(
        `CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            number TEXT NOT NULL UNIQUE,
            instansi TEXT,
            jabatan TEXT,
            grup TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
            if (err) {
                console.error("❌ Gagal membuat tabel 'contacts':", err.message);
            } else {
                console.log("✅ Tabel 'contacts' siap digunakan.");
                
                // Migration: Make instansi & jabatan optional (if they were NOT NULL before)
                db.all("PRAGMA table_info(contacts)", (pragmaErr, columns) => {
                    if (pragmaErr) return;
                    
                    const instansiCol = columns.find(c => c.name === 'instansi');
                    const jabatanCol = columns.find(c => c.name === 'jabatan');
                    
                    // If columns are NOT NULL, we need to recreate table
                    if ((instansiCol && instansiCol.notnull === 1) || (jabatanCol && jabatanCol.notnull === 1)) {
                        console.log("🔄 Migrating contacts table schema...");
                        
                        db.serialize(() => {
                            db.run(`CREATE TABLE contacts_new (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                name TEXT NOT NULL,
                                number TEXT NOT NULL UNIQUE,
                                instansi TEXT,
                                jabatan TEXT,
                                grup TEXT,
                                createdAt TEXT DEFAULT CURRENT_TIMESTAMP
                            )`);
                            
                            db.run(`INSERT INTO contacts_new SELECT * FROM contacts`);
                            db.run(`DROP TABLE contacts`);
                            
                            db.run(`ALTER TABLE contacts_new RENAME TO contacts`, (err) => {
                                if (!err) {
                                    console.log("✅ Migration berhasil! instansi & jabatan sekarang optional.");
                                }
                            });
                        });
                    }
                });
            }
        }
    );

    // ==========================================
    // 4. GROUPS TABLE (Contact Groups)
    // ==========================================
    db.run(
        `CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            members TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
            if (err) {
                console.error("❌ Gagal membuat tabel 'groups':", err.message);
            } else {
                console.log("✅ Tabel 'groups' siap digunakan.");
            }
        }
    );

    // ==========================================
    // 5. CHATS TABLE (Customer Service Chat)
    // ==========================================
    db.run(
        `CREATE TABLE IF NOT EXISTS chats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fromNumber TEXT NOT NULL,
            message TEXT,
            direction TEXT NOT NULL CHECK(direction IN ('in', 'out')),
            timestamp TEXT NOT NULL,
            messageType TEXT DEFAULT 'chat',
            mediaUrl TEXT,
            mediaData TEXT,
            isRead BOOLEAN DEFAULT FALSE,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'active',
            session_id TEXT
        )`,
        (err) => {
            if (err) {
                console.error("❌ Gagal membuat tabel 'chats':", err.message);
            } else {
                console.log("✅ Tabel 'chats' siap digunakan.");
                
                // Migration: Add columns if they don't exist
                db.all("PRAGMA table_info(chats)", (pragmaErr, columns) => {
                    if (pragmaErr) {
                        console.error("❌ Error checking chats table structure:", pragmaErr);
                        return;
                    }
                    
                    const columnNames = columns.map(col => col.name);
                    
                    const addColumnIfNotExists = (columnName, columnDefinition) => {
                        if (!columnNames.includes(columnName)) {
                            db.run(`ALTER TABLE chats ADD COLUMN ${columnDefinition}`, (alterErr) => {
                                if (alterErr) {
                                    console.error(`❌ Error adding ${columnName} column:`, alterErr);
                                } else {
                                    console.log(`✅ Added ${columnName} column to chats table`);
                                }
                            });
                        } else {
                            console.log(`✓ Column ${columnName} already exists in chats`);
                        }
                    };

                    addColumnIfNotExists('messageType', "messageType TEXT DEFAULT 'chat'");
                    addColumnIfNotExists('isRead', "isRead BOOLEAN DEFAULT FALSE");
                    addColumnIfNotExists('created_at', "created_at TEXT DEFAULT CURRENT_TIMESTAMP");
                    addColumnIfNotExists('mediaUrl', "mediaUrl TEXT NULL");
                    addColumnIfNotExists('mediaData', "mediaData TEXT NULL");
                    addColumnIfNotExists('status', "status TEXT DEFAULT 'active'");
                    addColumnIfNotExists('session_id', "session_id TEXT");
                });
            }
        }
    );

    // ==========================================
    // 6. CREATE INDEXES FOR PERFORMANCE
    // ==========================================
    db.run("CREATE INDEX IF NOT EXISTS idx_chats_fromNumber ON chats(fromNumber)", (err) => {
        if (err) {
            console.error("❌ Error creating fromNumber index:", err);
        } else {
            console.log("✅ Index pada fromNumber siap digunakan.");
        }
    });

    db.run("CREATE INDEX IF NOT EXISTS idx_chats_timestamp ON chats(timestamp)", (err) => {
        if (err) {
            console.error("❌ Error creating timestamp index:", err);
        } else {
            console.log("✅ Index pada timestamp siap digunakan.");
        }
    });

    db.run("CREATE INDEX IF NOT EXISTS idx_chats_direction_isRead ON chats(direction, isRead)", (err) => {
        if (err) {
            console.error("❌ Error creating direction_isRead index:", err);
        } else {
            console.log("✅ Index pada direction dan isRead siap digunakan.");
        }
    });

    db.run("CREATE INDEX IF NOT EXISTS idx_chats_messageType ON chats(messageType)", (err) => {
        if (err) {
            console.error("❌ Error creating messageType index:", err);
        } else {
            console.log("✅ Index pada messageType siap digunakan.");
        }
    });

    db.run("CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status)", (err) => {
        if (err) {
            console.error("❌ Error creating schedules status index:", err);
        } else {
            console.log("✅ Index pada schedules.status siap digunakan.");
        }
    });

    db.run("CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status)", (err) => {
        if (err) {
            console.error("❌ Error creating meetings status index:", err);
        } else {
            console.log("✅ Index pada meetings.status siap digunakan.");
        }
    });

    console.log("\n🎉 Database initialization complete!\n");
});

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================
process.on('SIGINT', () => {
    console.log('\n⚠️ Shutting down gracefully...');
    db.close((err) => {
        if (err) {
            console.error('❌ Error closing database:', err.message);
        } else {
            console.log('✅ Database connection closed.');
        }
        process.exit(0);
    });
});

// Export database instance
module.exports = db;