const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, "reminders.db");

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Gagal membuka database:", err.message);
    } else {
        console.log("Terhubung ke database SQLite.");
    }
});

db.serialize(() => {
    console.log("Membuat tabel database...\n");

    // TABEL USERS (Authentication & Authorization)
    db.run(
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'operator')) DEFAULT 'operator',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
            if (err) {
                console.error("Gagal membuat tabel 'users':", err.message);
            } else {
                createUserIndexes();
                insertDefaultAdmin();
            }
        }
    );
    
    function createUserIndexes() {
        db.run("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)");
        db.run("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)");
        db.run("CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)");
    }
    
    function insertDefaultAdmin() {
        db.get("SELECT COUNT(*) as count FROM users WHERE email = ?", ['admin@example.com'], (countErr, row) => {
            if (!countErr && row.count === 0) {
                const defaultAdminHash = '$2b$10$/yjPYz.a9oIDA04jYR0/S.PXjms64xjEnb9goqOCbbaYaJSnGBTCq';
                
                db.run(
                    `INSERT INTO users (email, password, name, role, is_active, created_at) 
                     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
                    ['admin@example.com', defaultAdminHash, 'Administrator', 'admin', 1],
                    (insertErr) => {
                        if (!insertErr) {
                            console.log("Akun admin default berhasil dibuat (admin@example.com / bps123)");
                        }
                    }
                );
            }
        });
    }

    // TABEL SCHEDULES (Message Reminders)
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
            deliveryResult TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
            if (err) {
                console.error("Gagal membuat tabel 'schedules':", err.message);
            } else {            
                db.all("PRAGMA table_info(schedules)", (pragmaErr, columns) => {
                    if (pragmaErr) return;
                    
                    const columnNames = columns.map(col => col.name);
                    
                    if (!columnNames.includes('deliveryResult')) {
                        db.run(`ALTER TABLE schedules ADD COLUMN deliveryResult TEXT`);
                    }
                });
            }
        }
    );

    // TABEL MEETINGS (Meeting Schedules)
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
            deliveryResult TEXT,
            start_epoch INTEGER,
            end_epoch INTEGER,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
            if (err) {
                console.error("Gagal membuat tabel 'meetings':", err.message);
            } else {            
                db.all("PRAGMA table_info(meetings)", (pragmaErr, columns) => {
                    if (pragmaErr) return;
                    
                    const columnNames = columns.map(col => col.name);
                    
                    if (!columnNames.includes('deliveryResult')) {
                        db.run(`ALTER TABLE meetings ADD COLUMN deliveryResult TEXT`);
                    }
                });
            }
        }
    );

    // TABEL CONTACTS (Contact Management)
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
                console.error("Gagal membuat tabel 'contacts':", err.message);
            } else {                
                db.all("PRAGMA table_info(contacts)", (pragmaErr, columns) => {
                    if (pragmaErr) return;
                    
                    const instansiCol = columns.find(c => c.name === 'instansi');
                    const jabatanCol = columns.find(c => c.name === 'jabatan');
                    
                    if ((instansiCol && instansiCol.notnull === 1) || (jabatanCol && jabatanCol.notnull === 1)) {
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
                            
                            db.run(`ALTER TABLE contacts_new RENAME TO contacts`);
                        });
                    }
                });
            }
        }
    );

    // TABEL GROUPS (Contact Groups)
    db.run(
        `CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            members TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
            if (err) {
                console.error("Gagal membuat tabel 'groups':", err.message);
            }
        }
    );

    // TABEL CHATS (Customer Service Chat)
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
            isRead INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'active',
            session_id TEXT
        )`,
        (err) => {
            if (err) {
                console.error("Gagal membuat tabel 'chats':", err.message);
            } else {                
                db.all("PRAGMA table_info(chats)", (pragmaErr, columns) => {
                    if (pragmaErr) {
                        console.error("Kesalahan saat mengecek struktur tabel chats:", pragmaErr);
                        return;
                    }
                    
                    const columnNames = columns.map(col => col.name);
                    
                    const addColumnIfNotExists = (columnName, columnDefinition) => {
                        if (!columnNames.includes(columnName)) {
                            db.run(`ALTER TABLE chats ADD COLUMN ${columnDefinition}`, (alterErr) => {
                                if (alterErr) {
                                    console.error(`Kesalahan saat menambahkan kolom ${columnName}:`, alterErr);
                                }
                            });
                        }
                    };

                    addColumnIfNotExists('messageType', "messageType TEXT DEFAULT 'chat'");
                    addColumnIfNotExists('isRead', "isRead INTEGER DEFAULT 0");
                    addColumnIfNotExists('created_at', "created_at TEXT DEFAULT CURRENT_TIMESTAMP");
                    addColumnIfNotExists('mediaUrl', "mediaUrl TEXT NULL");
                    addColumnIfNotExists('mediaData', "mediaData TEXT NULL");
                    addColumnIfNotExists('status', "status TEXT DEFAULT 'active'");
                    addColumnIfNotExists('session_id', "session_id TEXT");
                });
            }
        }
    );

    // MEMBUAT INDEX UNTUK PERFORMA
    db.run("CREATE INDEX IF NOT EXISTS idx_chats_fromNumber ON chats(fromNumber)", (err) => {
        if (err) {
            console.error("Kesalahan saat membuat index fromNumber:", err);
        }
    });

    db.run("CREATE INDEX IF NOT EXISTS idx_chats_timestamp ON chats(timestamp)", (err) => {
        if (err) {
            console.error("Kesalahan saat membuat index timestamp:", err);
        }
    });

    db.run("CREATE INDEX IF NOT EXISTS idx_chats_direction_isRead ON chats(direction, isRead)", (err) => {
        if (err) {
            console.error("Kesalahan saat membuat index direction_isRead:", err);
        }
    });

    db.run("CREATE INDEX IF NOT EXISTS idx_chats_messageType ON chats(messageType)", (err) => {
        if (err) {
            console.error("Kesalahan saat membuat index messageType:", err);
        }
    });

    db.run("CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status)", (err) => {
        if (err) {
            console.error("Kesalahan saat membuat index schedules status:", err);
        }
    });

    db.run("CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status)", (err) => {
        if (err) {
            console.error("Kesalahan saat membuat index meetings status:", err);
        }
    });

    // TABEL INSTANSI (Master Data)
    db.run(
        `CREATE TABLE IF NOT EXISTS instansi (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nama TEXT NOT NULL UNIQUE,
            keterangan TEXT,
            aktif INTEGER DEFAULT 1,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
            if (err) {
                console.error("Gagal membuat tabel 'instansi':", err.message);
            } else {                
                db.get("SELECT COUNT(*) as count FROM instansi", (countErr, row) => {
                    if (!countErr && row.count === 0) {
                        const defaultInstansi = [
                            'Tim Zi',
                            'Tim Umum',
                            'Tim Statistik Sosial',
                            'Tim Statistik Distribusi',
                            'Tim Neraca Wilayah dan Analisis Statistik',
                            'Tim Statistik Produksi',
                            'Tim IPDS (TI)',
                            'Tim IPDS (DLS)',
                            'Tim Administrasi',
                            'Tim Humas dan UKK',
                            'Tim Statistik Sektoral',
                            'Tim Manajemen dan Tata Kelola'
                        ];
                        
                        const stmt = db.prepare("INSERT INTO instansi (nama, aktif) VALUES (?, 1)");
                        defaultInstansi.forEach(nama => {
                            stmt.run(nama);
                        });
                        stmt.finalize();
                        
                        console.log("Data default instansi berhasil ditambahkan.");
                    }
                });
            }
        }
    );

    // TABEL JABATAN (Master Data)
    db.run(
        `CREATE TABLE IF NOT EXISTS jabatan (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nama TEXT NOT NULL UNIQUE,
            keterangan TEXT,
            aktif INTEGER DEFAULT 1,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
            if (err) {
                console.error("Gagal membuat tabel 'jabatan':", err.message);
            } else {                
                db.get("SELECT COUNT(*) as count FROM jabatan", (countErr, row) => {
                    if (!countErr && row.count === 0) {
                        const defaultJabatan = [
                            'Kepala Bagian Umum',
                            'Pegawai',
                            'Supervisor',
                            'Manager',
                            'Staff',
                            'magang'
                        ];
                        
                        const stmt = db.prepare("INSERT INTO jabatan (nama, aktif) VALUES (?, 1)");
                        defaultJabatan.forEach(nama => {
                            stmt.run(nama);
                        });
                        stmt.finalize();
                        
                        console.log("Data default jabatan berhasil ditambahkan.");
                    }
                });
            }
        }
    );

    db.run("CREATE INDEX IF NOT EXISTS idx_instansi_aktif ON instansi(aktif)");
    db.run("CREATE INDEX IF NOT EXISTS idx_jabatan_aktif ON jabatan(aktif)");

    // MIGRASI: Menambahkan kolom editedAt ke chats
    db.all("PRAGMA table_info(chats)", [], (err, columns) => {
        if (err) {
            console.error("Kesalahan saat mengecek skema tabel chats:", err);
            return;
        }

        const hasEditedAt = columns.some(col => col.name === 'editedAt');
        
        if (!hasEditedAt) {
            db.run(
                "ALTER TABLE chats ADD COLUMN editedAt TEXT",
                (err) => {
                    if (err) {
                        console.error("Kesalahan saat menambahkan kolom editedAt:", err);
                    }
                }
            );
        }
    });

    // MIGRASI: Menambahkan kolom waMessageId ke chats
    db.all("PRAGMA table_info(chats)", [], (err, columns) => {
        if (err) {
            console.error("Kesalahan saat mengecek skema tabel chats:", err);
            return;
        }

        const hasWaMessageId = columns.some(col => col.name === 'waMessageId');
        
        if (!hasWaMessageId) {
            db.run(
                "ALTER TABLE chats ADD COLUMN waMessageId TEXT",
                (err) => {
                    if (err) {
                        console.error("Kesalahan saat menambahkan kolom waMessageId:", err);
                    }
                }
            );
        }
    });

    console.log("\nInisialisasi database selesai!\n");
});

// GRACEFUL SHUTDOWN
process.on('SIGINT', () => {
    console.log('\nMelakukan shutdown dengan aman...');
    db.close((err) => {
        if (err) {
            console.error('Kesalahan saat menutup database:', err.message);
        } else {
            console.log('Koneksi database ditutup.');
        }
        process.exit(0);
    });
});

module.exports = db