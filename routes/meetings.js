const express = require("express");
const router = express.Router();

// Import modul-modul
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

  setTimeout(() => {
    loadAndScheduleExistingMeetings();
  }, 1000);
}

// Auto update expired meetings setiap 5 detik
setInterval(() => {
  updateExpiredMeetings();
}, 5 * 1000);

// ROUTES

/**
 * GET semua meetings
 */
router.get("/meetings", async (req, res) => {
  const db = getDatabase();
  if (!db) return res.status(500).json({ error: "Database tidak tersedia" });

  try {
    await updateExpiredMeetings();
    const rows = await getAllMeetings();

    const meetings = rows.map((m) => ({
      ...m,
      numbers: parseNumbers(m.numbers),
      filesData: parseFilesData(m.filesData),
      scheduledTime: new Date(m.start_epoch).toISOString(),
      meetingEndTime: new Date(m.end_epoch).toISOString(),
      type: "meeting",
      selectedGroups: m.selectedGroups ? JSON.parse(m.selectedGroups) : null,
      groupInfo: m.groupInfo ? JSON.parse(m.groupInfo) : null,
      originalNumbers: parseNumbers(m.numbers),
    }));

    res.json(meetings);
  } catch (error) {
    console.error("Kesalahan saat mengambil daftar meetings:", error);
    res.status(500).json({ error: "Gagal memproses permintaan." });
  }
});

/**
 * GET meeting berdasarkan ID
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

    const displayNumbers = formatNumbersForDisplay(row.numbers);
    const filesData = parseFilesData(row.filesData);

    const meeting = {
      ...row,
      numbers: displayNumbers,
      startDateTime: `${row.date}T${row.startTime}`,
      endDateTime: `${row.date}T${row.endTime}`,
      files: filesData,
      filesData: filesData,
      selectedGroups: row.selectedGroups
        ? JSON.parse(row.selectedGroups)
        : null,
      groupInfo: row.groupInfo ? JSON.parse(row.groupInfo) : null,
    };

    res.json(meeting);
  } catch (error) {
    console.error("Kesalahan saat mengambil data meeting:", error);
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
 * GET meetings yang sedang aktif
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

    const activeMeetings = rows.filter((meeting) => isMeetingActive(meeting));

    res.json({
      total: activeMeetings.length,
      meetings: activeMeetings.map((m) => ({
        id: m.id,
        title: m.meetingTitle,
        room: m.meetingRoom,
        date: m.date,
        startTime: m.startTime,
        endTime: m.endTime,
        status: m.status,
        filesData: parseFilesData(m.filesData),
      })),
    });
  } catch (error) {
    console.error("Kesalahan saat mengambil active meetings:", error);
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
    console.error("Kesalahan saat memeriksa ketersediaan ruangan:", error);
    res.json({
      available: false,
      message: "Terjadi kesalahan server saat memeriksa ketersediaan ruangan",
    });
  }
});

/**
 * POST tambah meeting baru
 */
router.post("/add-meeting", upload.array("files", 10), async (req, res) => {
  try {
    const {
      meetingTitle,
      numbers,
      meetingRoom,
      startTime,
      endTime,
      selectedGroups,
      groupInfo,
    } = req.body;

    const db = getDatabase();

    if (!db) {
      cleanupUploadedFiles(req.files);
      return res.status(500).json({
        success: false,
        message: "Database tidak tersedia",
      });
    }

    const validationError = validateMeetingInput(
      meetingTitle,
      numbers,
      meetingRoom,
      startTime,
      endTime
    );

    if (validationError) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const startParsed = parseDateTime(startTime);
    const endParsed = parseDateTime(endTime);

    const conflictingMeeting = await checkRoomConflict(
      db,
      startParsed.date,
      startParsed.time,
      endParsed.time,
      meetingRoom
    );

    if (conflictingMeeting) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: `Ruangan ${meetingRoom} sudah terpakai pada ${conflictingMeeting.startTime} - ${conflictingMeeting.endTime} untuk rapat "${conflictingMeeting.meetingTitle}"`,
        conflictingMeeting: {
          title: conflictingMeeting.meetingTitle,
          startTime: conflictingMeeting.startTime,
          endTime: conflictingMeeting.endTime,
          status: conflictingMeeting.status,
        },
      });
    }

    const { filesData, filesArray } = processUploadedFiles(req.files);

    const numbersArray = parseNumbers(numbers);
    const formattedNumbers = numbersArray.map((n) => {
      let num = String(n).trim().replace(/\D/g, "");
      if (num.startsWith("0")) num = "62" + num.slice(1);
      return num + "@c.us";
    });

    let selectedGroupsToSave = null;
    if (selectedGroups) {
      try {
        if (typeof selectedGroups === "string") {
          const parsed = JSON.parse(selectedGroups);
          if (Array.isArray(parsed) && parsed.length > 0) {
            selectedGroupsToSave = selectedGroups;
          }
        } else if (Array.isArray(selectedGroups) && selectedGroups.length > 0) {
          selectedGroupsToSave = JSON.stringify(selectedGroups);
        }
      } catch (parseError) {
        // Abaikan error parsing
      }
    }

    let groupInfoToSave = null;
    if (groupInfo) {
      try {
        let parsed;
        if (typeof groupInfo === "string") {
          parsed = JSON.parse(groupInfo);
        } else if (Array.isArray(groupInfo)) {
          parsed = groupInfo;
        }

        if (Array.isArray(parsed) && parsed.length > 0) {
          const validGroupInfo = parsed.filter(
            (group) => group && group.name && Array.isArray(group.members)
          );

          if (validGroupInfo.length > 0) {
            groupInfoToSave = JSON.stringify(validGroupInfo);
          }
        }
      } catch (parseError) {
        // Abaikan error parsing
      }
    }

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
      filesData: filesData,
      selectedGroups: selectedGroupsToSave,
      groupInfo: groupInfoToSave,
    };

    try {
      await insertMeeting(meetingData);
    } catch (dbError) {
      cleanupUploadedFiles(req.files);
      return res.status(500).json({
        success: false,
        message: "Gagal menyimpan meeting ke database",
        error: dbError.message,
      });
    }

    const scheduleData = {
      ...meetingData,
      status: "terjadwal",
    };

    try {
      scheduleMeetingReminder(scheduleData);
    } catch (scheduleError) {
      console.error("Kesalahan saat menjadwalkan reminder:", scheduleError);
    }

    if (global.emitScheduleCreated) {
      global.emitScheduleCreated({
        id: meetingId,
        type: "meeting",
        meetingTitle: meetingTitle,
        scheduledTime: startTime,
        status: "terjadwal",
        selectedGroups: selectedGroupsToSave
          ? JSON.parse(selectedGroupsToSave)
          : null,
        groupInfo: groupInfoToSave ? JSON.parse(groupInfoToSave) : null,
      });
    }

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
        selectedGroups: selectedGroupsToSave
          ? JSON.parse(selectedGroupsToSave)
          : null,
        groupInfo: groupInfoToSave ? JSON.parse(groupInfoToSave) : null,
        files: filesArray.map((f) => f.name),
        filesData: filesArray,
      },
    });
  } catch (error) {
    console.error("Kesalahan di endpoint /add-meeting:", error);
    cleanupUploadedFiles(req.files);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message,
    });
  }
});
/**
 * PUT edit meeting
 */
router.put("/edit-meeting/:id", upload.array("files", 10), async (req, res) => {
  const { id } = req.params;
  const {
    meetingTitle,
    numbers,
    meetingRoom,
    startTime,
    endTime,
    deletedFiles,
    keepExistingFiles,
    selectedGroups,
    groupInfo,
  } = req.body;
  const newFiles = req.files;

  try {
    const validationError = validateMeetingInput(
      meetingTitle,
      numbers,
      meetingRoom,
      startTime,
      endTime
    );
    if (validationError) {
      cleanupUploadedFiles(newFiles);
      return res.status(400).json({ success: false, message: validationError });
    }

    const currentMeeting = await getMeetingById(id);
    if (!currentMeeting) {
      cleanupUploadedFiles(newFiles);
      return res
        .status(404)
        .json({ success: false, message: "Jadwal rapat tidak ditemukan." });
    }

    let deletedNames = [];
    if (deletedFiles) {
      try {
        deletedNames = Array.isArray(deletedFiles)
          ? deletedFiles
          : JSON.parse(deletedFiles);
      } catch (e) {
        deletedNames = [];
      }
    }

    let keepExistingNames = [];
    if (keepExistingFiles) {
      try {
        keepExistingNames = Array.isArray(keepExistingFiles)
          ? keepExistingFiles
          : JSON.parse(keepExistingFiles);
      } catch (e) {
        keepExistingNames = [];
      }
    }

    const { finalFilesData } = mergeFilesForEdit(
      currentMeeting.filesData,
      newFiles,
      keepExistingNames,
      deletedNames
    );

    const startParsed = parseDateTime(startTime);
    const endParsed = parseDateTime(endTime);
    const numbersArray = parseNumbers(numbers);
    const formattedNumbers = numbersArray
      .map((num) => formatNumber(num))
      .filter(Boolean);

    const finalGroupInfo = (() => {
      if (
        groupInfo !== undefined &&
        groupInfo !== null &&
        groupInfo !== "undefined" &&
        groupInfo !== "null"
      ) {
        try {
          let parsed;
          if (typeof groupInfo === "string") {
            parsed = JSON.parse(groupInfo);
          } else if (Array.isArray(groupInfo)) {
            parsed = groupInfo;
          }

          if (Array.isArray(parsed) && parsed.length === 0) {
            return null;
          }

          if (Array.isArray(parsed) && parsed.length > 0) {
            const validGroupInfo = parsed.filter(
              (group) => group && group.name && Array.isArray(group.members)
            );
            if (validGroupInfo.length > 0) {
              return JSON.stringify(validGroupInfo);
            }
          }

          return null;
        } catch (e) {
          return null;
        }
      }

      return currentMeeting.groupInfo || null;
    })();

    let selectedGroupsToSave = null;
    if (selectedGroups) {
      try {
        if (typeof selectedGroups === "string") {
          const parsed = JSON.parse(selectedGroups);
          if (Array.isArray(parsed) && parsed.length > 0) {
            selectedGroupsToSave = selectedGroups;
          }
        } else if (Array.isArray(selectedGroups) && selectedGroups.length > 0) {
          selectedGroupsToSave = JSON.stringify(selectedGroups);
        }
      } catch (e) {
        // Abaikan error parsing
      }
    }

    const updateData = {
      meetingTitle,
      numbers: JSON.stringify(formattedNumbers),
      meetingRoom,
      date: startParsed.date,
      startTime: startParsed.time,
      endTime: endParsed.time,
      start_epoch: startParsed.epoch,
      end_epoch: endParsed.epoch,
      filesData: finalFilesData,
      selectedGroups: selectedGroupsToSave,
      groupInfo: finalGroupInfo,
    };

    await updateMeeting(id, updateData);

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
      filesData: finalFilesData,
      groupInfo: finalGroupInfo,
    };

    scheduleMeetingReminder(updatedMeetingData);

    if (global.io) {
      const hasFileChanges =
        (newFiles && newFiles.length > 0) || deletedNames.length > 0;
      global.io.emit("meeting-updated", {
        scheduleId: id,
        filesChanged: hasFileChanges,
        filesData: finalFilesData ? JSON.parse(finalFilesData) : [],
        selectedGroups: selectedGroupsToSave
          ? JSON.parse(selectedGroupsToSave)
          : null,
        groupInfo: finalGroupInfo ? JSON.parse(finalGroupInfo) : null,
        forceRefresh: true,
      });
    }

    res.json({ success: true, message: "Jadwal rapat berhasil diupdate!" });
  } catch (error) {
    cleanupUploadedFiles(newFiles);
    console.error("Kesalahan di endpoint /edit-meeting:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Terjadi kesalahan server.",
      });
  }
});

/**
 * PUT cancel meeting
 */
router.put("/cancel-meeting/:id", async (req, res) => {
  const { id } = req.params;
  const db = getDatabase();

  if (!db) {
    return res
      .status(500)
      .json({ success: false, message: "Database tidak tersedia" });
  }

  try {
    const meeting = await getMeetingById(id);

    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, message: "Meeting tidak ditemukan" });
    }

    // 🔹 UPDATE STATUS KE "canceling" SAAT MULAI PROSES
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE meetings SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        ["canceling", id],
        function (err) {
          if (err)
            return reject(new Error("Gagal update status ke canceling."));
          resolve(this);
        }
      );
    });

    if (global.emitMeetingStatusUpdate) {
      global.emitMeetingStatusUpdate(
        id,
        "canceling",
        "Membatalkan rapat dan mengirim notifikasi..."
      );
    }

    // Kirim notifikasi pembatalan jika meeting sudah terkirim
    let notificationSent = false;
    if (meeting.status === "terkirim") {
      await sendCancellationNotification(meeting);
      notificationSent = true;
    }

    // 🔹 UPDATE STATUS FINAL KE "dibatalkan"
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE meetings SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        ["dibatalkan", id],
        function (err) {
          if (err)
            return reject(new Error("Gagal membatalkan meeting di database."));
          if (this.changes === 0)
            return reject(new Error("Meeting tidak ditemukan saat update."));
          resolve(this);
        }
      );
    });

    deleteFilesFromData(meeting.filesData);
    cancelMeetingJob(id);

    if (global.emitMeetingStatusUpdate) {
      const message = notificationSent
        ? "Meeting dibatalkan dan notifikasi terkirim ke semua peserta"
        : "Meeting dibatalkan";
      global.emitMeetingStatusUpdate(id, "dibatalkan", message);
    }

    
  } catch (error) {
    console.error("Kesalahan pada rute /cancel-meeting:", error.message);

    // Rollback status jika error
    try {
      await new Promise((resolve) => {
        db.run(
          `UPDATE meetings SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
          ["terjadwal", id],
          () => resolve()
        );
      });
    } catch (rollbackError) {
      console.error("Error rollback status:", rollbackError);
    }

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat membatalkan rapat.",
    });
  }
});

/**
 * DELETE meeting
 */
router.delete("/delete-meeting/:id", async (req, res) => {
  const { id } = req.params;
  const db = getDatabase();

  if (!db) {
    return res
      .status(500)
      .json({ success: false, message: "Database tidak tersedia" });
  }

  try {
    const meeting = await getMeetingById(id);

    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, message: "Meeting tidak ditemukan" });
    }

    deleteFilesFromData(meeting.filesData);
    const result = await deleteMeeting(id);

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Meeting tidak ditemukan" });
    }

    cancelMeetingJob(id);

    if (global.emitScheduleDeleted) {
      global.emitScheduleDeleted(id);
    }

    res.json({
      success: true,
      message: "Meeting berhasil dihapus",
    });
  } catch (error) {
    console.error("Kesalahan saat menghapus meeting:", error);
    res
      .status(500)
      .json({ success: false, message: "Gagal hapus meeting dari database" });
  }
});

/**
 * PUT finish meeting
 */
router.put("/finish-meeting/:id", async (req, res) => {
  const { id } = req.params;
  const db = getDatabase();

  try {
    const meeting = await getMeetingById(id);

    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, message: "Rapat tidak ditemukan." });
    }

    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE meetings SET status = ? WHERE id = ?",
        ["selesai", id],
        function (err) {
          if (err) return reject(new Error("Gagal update status rapat."));
          resolve(this);
        }
      );
    });

    deleteFilesFromData(meeting.filesData);
    cancelMeetingJob(id);

    if (global.emitMeetingStatusUpdate) {
      global.emitMeetingStatusUpdate(id, "selesai", "Rapat telah selesai");
    }

    res.json({
      success: true,
      message:
        "Rapat berhasil ditandai selesai dan file terkait telah dihapus.",
    });
  } catch (error) {
    console.error("Kesalahan pada rute /finish-meeting:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Terjadi kesalahan server." });
  }
});

/**
 * POST update expired meetings (debug endpoint)
 */
router.post("/update-expired", async (req, res) => {
  const db = getDatabase();
  if (!db) {
    return res
      .status(500)
      .json({ success: false, message: "Database tidak tersedia" });
  }

  try {
    await updateExpiredMeetings();

    res.json({
      success: true,
      message: "Proses update expired meetings selesai",
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Kesalahan saat update expired meetings",
      });
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
    return res
      .status(500)
      .json({ success: false, message: "Database tidak tersedia" });
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
      status: m.status,
    }));

    res.json({
      success: true,
      date,
      room,
      meetings: roomMeetings,
      isAvailable: roomMeetings.length === 0,
    });
  } catch (error) {
    console.error("Kesalahan saat memeriksa ketersediaan:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Kesalahan saat mengecek ketersediaan",
      });
  }
});

// Export modul
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
  ROOMS,
};
