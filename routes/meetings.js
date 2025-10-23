const express = require("express");
const router = express.Router();

// Import modules
const {
    ROOMS,
    formatNumber,
    validateMeetingInput,
    checkRoomConflict,
} = require("./meetings/validation.js");

const {
    dateTimeToEpoch,
    epochToDateTime,
    parseDateTime,
    isMeetingActive,
    formatNumbersForDisplay,
    parseFilesData,
    parseNumbers,
} = require("./meetings/helpers.js");

const {
    upload,
    deleteFileIfExists,
    processUploadedFiles,
    cleanupUploadedFiles,
    deleteFilesFromData,
    mergeFilesForEdit,
} = require("./meetings/fileHandler.js");

const {
    setDatabase,
    getDatabase,
    updateMeetingStatus,
    updateExpiredMeetings,
    getMeetingById,
    insertMeeting,
    updateMeeting,
    deleteMeeting,
    getAllMeetings,
} = require("./meetings/dbOperations.js");

const {
    setWhatsappClient,
    scheduleMeetingReminder,
    cancelMeetingJob,
    loadAndScheduleExistingMeetings,
    sendCancellationNotification,
} = require("./meetings/scheduler.js");

// Middleware untuk parsing JSON body
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

/**
 * Inisialisasi modul meetings dengan database dan WhatsApp client
 */
function initializeMeetings(database, whatsappClient) {
    setDatabase(database);
    setWhatsappClient(whatsappClient);
    
    console.log("✅ Meeting module initialized");
    
    // CATATAN: Tabel meetings sudah dibuat di database.js root folder
    // Tidak perlu createMeetingsTable() lagi di sini
    
    // Load dan schedule existing meetings
    setTimeout(() => {
        loadAndScheduleExistingMeetings();
    }, 1000);
}

// Auto update expired meetings setiap 5 detik
setInterval(() => {
    updateExpiredMeetings();
}, 5 * 1000);

// ===== ROUTES =====

/**
 * GET semua meetings
 */
router.get("/meetings", async (req, res) => {
    const db = getDatabase();
    if (!db) return res.status(500).json({ error: "Database tidak tersedia" });
    
    try {
        await updateExpiredMeetings();
        const rows = await getAllMeetings();
        
        const meetings = rows.map(m => ({
            ...m,
            numbers: parseNumbers(m.numbers),
            filesData: parseFilesData(m.filesData),
            scheduledTime: new Date(m.start_epoch).toISOString(),
            meetingEndTime: new Date(m.end_epoch).toISOString(),
            type: 'meeting'
        }));
        
        res.json(meetings);
    } catch (error) {
        console.error("Error getting meetings:", error);
        res.status(500).json({ error: "Gagal memproses permintaan." });
    }
});

/**
 * GET meeting by ID
 */
router.get("/meeting/:id", async (req, res) => {
    const { id } = req.params;
    const db = getDatabase();
    
    if (!db) {
        return res.status(500).json({ error: "Database tidak tersedia" });
    }

    try {
        const row = await getMeetingById(id);

        if (!row) {
            return res.status(404).json({ error: "Meeting tidak ditemukan" });
        }

        // Format numbers for display
        const displayNumbers = formatNumbersForDisplay(row.numbers);
        
        // Parse files data
        const filesData = parseFilesData(row.filesData);

        const meeting = {
            ...row,
            numbers: displayNumbers,
            startDateTime: `${row.date}T${row.startTime}`,
            endDateTime: `${row.date}T${row.endTime}`,
            files: filesData,
            filesData: filesData
        };

        res.json(meeting);
    } catch (error) {
        console.error("Error mengambil meeting:", error);
        res.status(500).json({ error: "Gagal mengambil data meeting" });
    }
});

/**
 * GET daftar ruangan
 */
router.get("/meeting-rooms", (req, res) => {
    res.json(ROOMS);
});

/**
 * GET active meetings
 */
router.get("/active-meetings", async (req, res) => {
    const db = getDatabase();
    if (!db) {
        return res.status(500).json({ error: "Database tidak tersedia" });
    }

    try {
        await updateExpiredMeetings();
        
        const rows = await getAllMeetings(
            `WHERE status IN ('terjadwal', 'terkirim')`,
            []
        );

        const activeMeetings = rows.filter(meeting => isMeetingActive(meeting));
        
        res.json({
            total: activeMeetings.length,
            meetings: activeMeetings.map(m => ({
                id: m.id,
                title: m.meetingTitle,
                room: m.meetingRoom,
                date: m.date,
                startTime: m.startTime,
                endTime: m.endTime,
                status: m.status,
                filesData: parseFilesData(m.filesData)
            }))
        });
    } catch (error) {
        console.error("Error getting active meetings:", error);
        res.status(500).json({ error: "Error mengambil active meetings" });
    }
});

/**
 * POST cek ketersediaan ruangan
 */
router.post("/check-room-availability", async (req, res) => {
    try {
        const { roomId, startTime, endTime, excludeId } = req.body;
        const db = getDatabase();

        if (!roomId || !startTime || !endTime) {
            return res.json({
                available: false,
                message: "Data tidak lengkap (roomId, startTime, endTime harus diisi)",
            });
        }

        const startParsed = parseDateTime(startTime);
        const endParsed = parseDateTime(endTime);

        await updateExpiredMeetings();
        
        const conflictingMeeting = await checkRoomConflict(
            db,
            startParsed.date,
            startParsed.time,
            endParsed.time,
            roomId,
            excludeId
        );

        if (conflictingMeeting) {
            const conflictMessage = 
                `<strong>Ruangan ${roomId} sudah terpakai pada waktu tersebut:</strong><br><br>` +
                `<strong>${conflictingMeeting.meetingTitle}</strong><br>` +
                `&nbsp;&nbsp;&nbsp;Waktu: ${conflictingMeeting.startTime} - ${conflictingMeeting.endTime}<br>` +
                `&nbsp;&nbsp;&nbsp;Status: ${conflictingMeeting.status}<br><br>` +
                `<small>Silakan pilih waktu atau ruangan lain.</small>`;

            return res.json({
                available: false,
                message: conflictMessage,
            });
        }

        res.json({
            available: true,
            message: "Ruangan tersedia",
        });
        
    } catch (error) {
        console.error("Error checking room availability:", error);
        res.json({
            available: false,
            message: "Terjadi kesalahan server saat memeriksa ketersediaan ruangan",
        });
    }
});

/**
 * POST tambah meeting
 */
router.post("/add-meeting", upload.array('files', 5), async (req, res) => {
    try {
        console.log("\n--- [CHECK] DATA DITERIMA DI /add-meeting ---");
        console.log("Isi dari req.files:", req.files);
        
        const { meetingTitle, numbers, meetingRoom, startTime, endTime } = req.body;
        const db = getDatabase();

        // Validasi input
        const validationError = validateMeetingInput(meetingTitle, numbers, meetingRoom, startTime, endTime);
        if (validationError) {
            return res.status(400).json({ success: false, message: validationError });
        }

        const startParsed = parseDateTime(startTime);
        const endParsed = parseDateTime(endTime);

        // Cek conflict
        const conflictingMeeting = await checkRoomConflict(
            db,
            startParsed.date,
            startParsed.time,
            endParsed.time,
            meetingRoom
        );

        if (conflictingMeeting) {
            return res.status(400).json({
                success: false,
                message: `Ruangan ${meetingRoom} sudah terpakai pada ${conflictingMeeting.startTime} - ${conflictingMeeting.endTime} untuk rapat "${conflictingMeeting.meetingTitle}"`,
                conflictingMeeting: {
                    title: conflictingMeeting.meetingTitle,
                    startTime: conflictingMeeting.startTime,
                    endTime: conflictingMeeting.endTime,
                    status: conflictingMeeting.status
                }
            });
        }

        // Process files
        const { filesData, filesArray } = processUploadedFiles(req.files);

        // Proses nomor
        const numbersArray = parseNumbers(numbers);
        const formattedNumbers = numbersArray.map((n) => {
            let num = String(n).trim().replace(/\D/g, "");
            if (num.startsWith("0")) num = "62" + num.slice(1);
            return num + "@c.us";
        });

        const meetingId = Date.now().toString();
        
        const meetingData = {
            id: meetingId,
            meetingTitle,
            numbers: JSON.stringify(formattedNumbers),
            meetingRoom,
            date: startParsed.date,
            startTime: startParsed.time,
            endTime: endParsed.time,
            start_epoch: startParsed.epoch,
            end_epoch: endParsed.epoch,
            filesData
        };

        await insertMeeting(meetingData);

        console.log("Meeting berhasil disimpan ke database");

        // Schedule reminder
        const scheduleData = {
            ...meetingData,
            status: "terjadwal"
        };
        
        scheduleMeetingReminder(scheduleData);

        res.json({
            success: true,
            message: "Meeting berhasil dijadwalkan",
            data: {
                id: meetingId,
                title: meetingTitle,
                room: meetingRoom,
                startTime: startTime,
                endTime: endTime,
                participants: numbersArray,
                files: filesArray.map(f => f.name),
                filesData: filesArray
            },
        });
        
    } catch (error) {
        console.error("Error adding meeting:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});

/**
 * PUT edit meeting
 */
router.put("/edit-meeting/:id", upload.array('files', 5), async (req, res) => {
    const { id } = req.params;
    const { meetingTitle, numbers, meetingRoom, startTime, endTime, deletedFiles, keepExistingFiles } = req.body;
    const newFiles = req.files;

    try {
        // 1. Validasi input
        const validationError = validateMeetingInput(meetingTitle, numbers, meetingRoom, startTime, endTime);
        if (validationError) {
            cleanupUploadedFiles(newFiles);
            return res.status(400).json({ success: false, message: validationError });
        }

        // 2. Ambil data meeting lama
        const currentMeeting = await getMeetingById(id);

        if (!currentMeeting) {
            cleanupUploadedFiles(newFiles);
            return res.status(404).json({ success: false, message: "Jadwal rapat tidak ditemukan." });
        }

        // 3. Parse parameters
        let deletedNames = [];
        if (deletedFiles) {
            try {
                deletedNames = Array.isArray(deletedFiles) ? deletedFiles : JSON.parse(deletedFiles);
            } catch (e) {
                deletedNames = [];
            }
        }

        let keepExistingNames = [];
        if (keepExistingFiles) {
            try {
                keepExistingNames = Array.isArray(keepExistingFiles) ? keepExistingFiles : JSON.parse(keepExistingFiles);
            } catch (e) {
                keepExistingNames = [];
            }
        }

        // 4. Merge files
        const { finalFilesData } = mergeFilesForEdit(
            currentMeeting.filesData,
            newFiles,
            keepExistingNames,
            deletedNames
        );

        console.log(`[Meeting ${id}] Files merged successfully`);

        // 5. Update database with new data
        const startParsed = parseDateTime(startTime);
        const endParsed = parseDateTime(endTime);
        const numbersArray = parseNumbers(numbers);
        const formattedNumbers = numbersArray.map(num => formatNumber(num)).filter(Boolean);
        
        const updateData = {
            meetingTitle,
            numbers: JSON.stringify(formattedNumbers),
            meetingRoom,
            date: startParsed.date,
            startTime: startParsed.time,
            endTime: endParsed.time,
            start_epoch: startParsed.epoch,
            end_epoch: endParsed.epoch,
            filesData: finalFilesData
        };

        await updateMeeting(id, updateData);

        console.log(`Meeting ID ${id} berhasil diupdate di database.`);

        // 6. Reschedule reminder
        const updatedMeetingData = {
            id: id,
            meetingTitle: meetingTitle,
            numbers: JSON.stringify(formattedNumbers),
            meetingRoom: meetingRoom,
            date: startParsed.date,
            startTime: startParsed.time,
            endTime: endParsed.time,
            start_epoch: startParsed.epoch,
            end_epoch: endParsed.epoch,
            status: "terjadwal",
            filesData: finalFilesData
        };
        
        scheduleMeetingReminder(updatedMeetingData);
        
        res.json({ success: true, message: "Jadwal rapat berhasil diupdate dan dijadwalkan ulang!" });

    } catch (error) {
        cleanupUploadedFiles(newFiles);
        console.error("Error fatal pada rute /edit-meeting:", error.message);
        res.status(500).json({ success: false, message: error.message || "Terjadi kesalahan server." });
    }
});

/**
 * PUT cancel meeting
 */
router.put('/cancel-meeting/:id', async (req, res) => {
    const { id } = req.params;
    const db = getDatabase();

    if (!db) {
        return res.status(500).json({ success: false, message: "Database tidak tersedia" });
    }

    try {
        const meeting = await getMeetingById(id);

        if (!meeting) {
            return res.status(404).json({ success: false, message: "Meeting tidak ditemukan" });
        }
        
        let notificationSent = false;
        if (meeting.status === 'terkirim') {
            await sendCancellationNotification(meeting);
            notificationSent = true;
        }

        // Update status to 'dibatalkan'
        await new Promise((resolve, reject) => {
            db.run(
                `UPDATE meetings SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
                ["dibatalkan", id],
                function (err) {
                    if (err) return reject(new Error("Gagal membatalkan meeting di database."));
                    if (this.changes === 0) return reject(new Error("Meeting tidak ditemukan saat update."));
                    resolve(this);
                }
            );
        });

        // Delete files
        deleteFilesFromData(meeting.filesData);

        // Cancel scheduled job
        cancelMeetingJob(id);

        // ✅ EMIT SOCKET EVENT
        if (global.emitMeetingStatusUpdate) {
            const message = notificationSent 
                ? "Meeting dibatalkan dan notifikasi terkirim"
                : "Meeting dibatalkan";
            global.emitMeetingStatusUpdate(id, 'dibatalkan', message);
        }

        res.json({
            success: true,
            message: notificationSent 
                ? "Meeting berhasil dibatalkan dan pesan pembatalan telah terkirim."
                : "Meeting berhasil dibatalkan."
        });

    } catch (error) {
        console.error("Error pada rute /cancel-meeting:", error.message);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});

/**
 * DELETE meeting
 */
router.delete("/delete-meeting/:id", async (req, res) => {
    const { id } = req.params;
    const db = getDatabase();

    if (!db) {
        return res.status(500).json({ success: false, message: "Database tidak tersedia" });
    }

    try {
        const meeting = await getMeetingById(id);

        if (!meeting) {
            return res.status(404).json({ success: false, message: "Meeting tidak ditemukan" });
        }

        // Delete files
        deleteFilesFromData(meeting.filesData);

        // Delete from database
        const result = await deleteMeeting(id);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: "Meeting tidak ditemukan" });
        }

        // Cancel scheduled job
        cancelMeetingJob(id);

        // ✅ EMIT SOCKET EVENT
        if (global.emitScheduleDeleted) {
            global.emitScheduleDeleted(id);
        }

        res.json({
            success: true,
            message: "Meeting berhasil dihapus"
        });
    } catch (error) {
        console.error("Error deleting meeting:", error);
        res.status(500).json({ success: false, message: "Gagal hapus meeting dari database" });
    }
});

/**
 * PUT finish meeting
 */
router.put('/finish-meeting/:id', async (req, res) => {
    const { id } = req.params;
    const db = getDatabase();

    try {
        const meeting = await getMeetingById(id);

        if (!meeting) {
            return res.status(404).json({ success: false, message: "Rapat tidak ditemukan." });
        }

        // Update status to 'selesai'
        await new Promise((resolve, reject) => {
            db.run(
                "UPDATE meetings SET status = ? WHERE id = ?",
                ['selesai', id],
                function(err) {
                    if (err) return reject(new Error("Gagal update status rapat."));
                    resolve(this);
                }
            );
        });

        // Delete files
        deleteFilesFromData(meeting.filesData);
        
        // Cancel scheduled job
        cancelMeetingJob(id);

        // ✅ EMIT SOCKET EVENT
        if (global.emitMeetingStatusUpdate) {
            global.emitMeetingStatusUpdate(id, 'selesai', 'Rapat telah selesai');
        }

        res.json({ success: true, message: "Rapat berhasil ditandai selesai dan file terkait telah dihapus." });

    } catch (error) {
        console.error("Error pada rute /finish-meeting:", error.message);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});

/**
 * POST update expired meetings (debug endpoint)
 */
router.post("/update-expired", async (req, res) => {
    const db = getDatabase();
    if (!db) {
        return res.status(500).json({ success: false, message: "Database tidak tersedia" });
    }

    try {
        await updateExpiredMeetings();
        
        res.json({
            success: true,
            message: "Update expired meetings completed"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating expired meetings" });
    }
});

/**
 * GET ketersediaan ruangan (endpoint legacy)
 */
router.get("/check-availability", async (req, res) => {
    const { date, room } = req.query;
    const db = getDatabase();

    if (!date || !room) {
        return res.status(400).json({
            success: false,
            message: "Parameter date dan room harus diisi",
        });
    }

    if (!db) {
        return res.status(500).json({ success: false, message: "Database tidak tersedia" });
    }

    try {
        await updateExpiredMeetings();

        const rows = await getAllMeetings(
            `WHERE date = ? AND meetingRoom = ? AND status IN ('terjadwal', 'terkirim')`,
            [date, room]
        );

        const roomMeetings = rows.map((m) => ({
            id: m.id,
            title: m.meetingTitle,
            startTime: m.startTime,
            endTime: m.endTime,
            status: m.status
        }));

        res.json({
            success: true,
            date,
            room,
            meetings: roomMeetings,
            isAvailable: roomMeetings.length === 0,
        });
    } catch (error) {
        console.error("Error checking availability:", error);
        res.status(500).json({ success: false, message: "Error mengecek availability" });
    }
});

// Export module
module.exports = {
    router,
    initializeMeetings,
    loadAndScheduleExistingMeetings,
    updateExpiredMeetings,
    formatNumber,
    validateMeetingInput,
    checkRoomConflict,
    dateTimeToEpoch,
    epochToDateTime,
    parseDateTime,
    ROOMS
};