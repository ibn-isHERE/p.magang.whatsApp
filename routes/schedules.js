// schedules.js - Menyimpan groupInfo ke database

const express = require("express");
const multer = require("multer");
const router = express.Router();
const db = require("../database.js");

// Import modul-modul
const {
  formatNumber,
  validateNumbers,
  validateScheduleTime,
  validateReminderInput,
  parseAndValidateNumbers,
} = require("./schedules/validation.js");

const {
  upload,
  deleteFileIfExists,
  prepareFilesData,
  cleanupUploadedFiles,
  cleanupFiles,
} = require("./schedules/fileHandler.js");

const {
  setWhatsappClient,
  setDatabase,
  scheduleMessage,
  loadAndScheduleExistingMessages,
  cancelScheduleJob,
} = require("./schedules/scheduler.js");

const {
  generateScheduleId,
  safeJsonParse,
  formatNumbersForDisplay,
} = require("./schedules/helpers.js");

// Set database untuk modul scheduler
setDatabase(db);

// ROUTES

/**
 * Endpoint untuk menambah pesan terjadwal - Simpan groupInfo
 */
router.post("/add-reminder", (req, res) => {
  upload(req, res, async (err) => {
    // Tangani error upload
    if (err) {
      cleanupUploadedFiles(req.files);

      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            error: "Ukuran file terlalu besar. Maksimal 20 MB per file.",
          });
        }
        return res.status(400).json({
          error: `Kesalahan unggah file: ${err.message}`,
        });
      } else {
        return res.status(400).json({
          error: `Tipe file tidak didukung: ${err.message}`,
        });
      }
    }

    let { numbers, message, datetime, groupInfo } = req.body;
    const uploadedFiles = req.files;

    try {
      // Validasi data input
      const validationError = validateReminderInput(
        numbers,
        message,
        datetime,
        uploadedFiles
      );
      if (validationError) {
        cleanupUploadedFiles(uploadedFiles);
        return res.status(400).json({ error: validationError });
      }

      // Parse dan validasi nomor
      const parsedNumbers = parseAndValidateNumbers(numbers);
      if (parsedNumbers.error) {
        cleanupUploadedFiles(uploadedFiles);
        return res.status(400).json({ error: parsedNumbers.error });
      }

      // Validasi waktu jadwal
      const timeValidation = validateScheduleTime(datetime);
      if (!timeValidation.isValid) {
        cleanupUploadedFiles(uploadedFiles);
        return res.status(400).json({ error: timeValidation.error });
      }
      datetime = timeValidation.adjustedTime;

      // Persiapkan data file
      const filesData = prepareFilesData(uploadedFiles);

      // Parse groupInfo dari frontend
      let groupInfoData = null;
      if (groupInfo) {
        try {
          groupInfoData = typeof groupInfo === 'string' ? groupInfo : JSON.stringify(groupInfo);
          console.log('Informasi grup diterima:', groupInfoData);
        } catch (e) {
          console.warn('Gagal mem-parse groupInfo:', e);
        }
      }

      const scheduleId = generateScheduleId();

      // Simpan ke database dengan groupInfo
      db.run(
        `INSERT INTO schedules (id, numbers, message, filesData, scheduledTime, status, groupInfo) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          scheduleId,
          JSON.stringify(parsedNumbers.validNumbers),
          message ? message.trim() : null,
          filesData,
          datetime,
          "terjadwal",
          groupInfoData
        ],
        function (insertErr) {
          if (insertErr) {
            console.error("Gagal menyimpan jadwal pesan:", insertErr.message);
            cleanupUploadedFiles(uploadedFiles);
            return res
              .status(500)
              .json({ error: "Gagal menyimpan jadwal pesan ke database." });
          }

          console.log(`Jadwal pesan baru disimpan dengan ID: ${scheduleId}`);
          if (groupInfoData) {
            console.log(`Informasi grup tersimpan:`, groupInfoData);
          }

          // Jadwalkan pesan
          scheduleMessage({
            id: scheduleId,
            numbers: JSON.stringify(parsedNumbers.validNumbers),
            message: message ? message.trim() : null,
            filesData,
            scheduledTime: datetime,
            status: "terjadwal",
            groupInfo: groupInfoData
          });

          // Emit event socket - Schedule Created
          if (global.emitScheduleCreated) {
            global.emitScheduleCreated({
              id: scheduleId,
              numbers: parsedNumbers.validNumbers,
              message: message,
              scheduledTime: datetime,
              filesData: filesData ? JSON.parse(filesData) : [],
              groupInfo: groupInfoData ? JSON.parse(groupInfoData) : null,
              status: 'terjadwal'
            });
          }

          res.status(200).json({
            success: true,
            message: "Pesan/File berhasil ditambahkan dan dijadwalkan.",
            scheduleId: scheduleId,
          });
        }
      );
    } catch (error) {
      console.error("Kesalahan dalam endpoint /add-reminder:", error);
      cleanupUploadedFiles(uploadedFiles);
      return res
        .status(500)
        .json({ error: "Terjadi kesalahan internal server." });
    }
  });
});

/**
 * Endpoint untuk mendapatkan jadwal pesan - Termasuk groupInfo
 */
router.get("/get-schedules", (req, res) => {
  const { status } = req.query;
  let query = `SELECT * FROM schedules`;
  let params = [];

  if (status && status !== "all") {
    query += ` WHERE status = ?`;
    params.push(status);
  }

  query += ` ORDER BY scheduledTime DESC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Gagal mengambil jadwal pesan dari database:", err.message);
      return res
        .status(500)
        .json({ error: "Gagal mengambil jadwal pesan dari database." });
    }

    try {
      const schedulesWithParsedFiles = rows.map((row) => {
        let numbersArray = formatNumbersForDisplay(row.numbers);
        let filesMetadata = safeJsonParse(row.filesData, []);

        if (!Array.isArray(filesMetadata)) {
          filesMetadata = [filesMetadata];
        }

        // Sertakan groupInfo
        let groupInfoParsed = null;
        if (row.groupInfo) {
          groupInfoParsed = safeJsonParse(row.groupInfo, null);
        }

        return {
          id: row.id,
          numbers: numbersArray,
          message: row.message,
          filesData: filesMetadata,
          scheduledTime: row.scheduledTime,
          status: row.status,
          groupInfo: groupInfoParsed,
          type: "message",
        };
      });

      res.json(schedulesWithParsedFiles);
    } catch (error) {
      console.error("Kesalahan saat memproses data jadwal:", error);
      res.status(500).json({ error: "Kesalahan saat memproses data jadwal" });
    }
  });
});

/**
 * Endpoint untuk membatalkan jadwal pesan
 */
router.delete("/cancel-schedule/:id", (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT filesData FROM schedules WHERE id = ? AND status = 'terjadwal'`,
    [id],
    (err, row) => {
      if (err) {
        console.error(
          "Kesalahan mengambil jadwal pesan untuk dibatalkan:",
          err.message
        );
        return res.status(500).send("Gagal menemukan jadwal pesan.");
      }
      if (!row) {
        return res
          .status(404)
          .send(
            "Jadwal pesan tidak ditemukan atau tidak dalam status 'terjadwal' untuk dibatalkan."
          );
      }

      // Batalkan job
      cancelScheduleJob(id);

      // Hapus file terkait
      if (row.filesData) {
        try {
          const files = JSON.parse(row.filesData);
          files.forEach((file) => deleteFileIfExists(file.path));
        } catch (parseErr) {
          console.error(
            `Gagal parsing filesData untuk penghapusan saat pembatalan untuk pesan ID ${id}:`,
            parseErr
          );
        }
      }

      // Update status di database
      db.run(
        `UPDATE schedules SET status = ? WHERE id = ?`,
        ["dibatalkan", id],
        function (updateErr) {
          if (updateErr) {
            console.error(
              "Kesalahan memperbarui status jadwal pesan di database:",
              updateErr.message
            );
            return res
              .status(500)
              .send("Gagal memperbarui status jadwal pesan di database.");
          }
          
          // Emit event socket
          if (global.emitScheduleStatusUpdate) {
            global.emitScheduleStatusUpdate(id, 'dibatalkan', 'Jadwal dibatalkan oleh user');
          }
          
          res.status(200).send("Jadwal pesan berhasil dibatalkan.");
        }
      );
    }
  );
});

/**
 * Endpoint untuk hapus riwayat pesan
 */
router.delete("/delete-history/:id", (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT filesData FROM schedules WHERE id = ? AND (status = 'terkirim' OR status = 'gagal')`,
    [id],
    (err, row) => {
      if (err) {
        console.error(
          "Kesalahan mengambil riwayat pesan untuk dihapus:",
          err.message
        );
        return res.status(500).send("Gagal menemukan riwayat pesan.");
      }
      if (!row) {
        return res
          .status(404)
          .send(
            "Riwayat pesan tidak ditemukan atau tidak dalam status 'terkirim'/'gagal'."
          );
      }

      // Hapus file terkait
      if (row.filesData) {
        try {
          const files = JSON.parse(row.filesData);
          files.forEach((file) => deleteFileIfExists(file.path));
        } catch (parseErr) {
          console.error(
            `Gagal parsing filesData untuk penghapusan riwayat pesan ID ${id}:`,
            parseErr
          );
        }
      }

      // Hapus dari database
      db.run(`DELETE FROM schedules WHERE id = ?`, [id], function (deleteErr) {
        if (deleteErr) {
          console.error(
            "Kesalahan menghapus riwayat pesan dari database:",
            deleteErr.message
          );
          return res
            .status(500)
            .send("Gagal menghapus riwayat pesan dari database.");
        }
        console.log(`Riwayat pesan ID ${id} berhasil dihapus.`);
        
        // Emit event socket
        if (global.emitScheduleDeleted) {
          global.emitScheduleDeleted(id);
        }
        
        res.status(200).send("Riwayat pesan berhasil dihapus.");
      });
    }
  );
});

/**
 * Endpoint untuk edit jadwal pesan - Pertahankan groupInfo
 */
router.put("/edit-schedule/:id", (req, res) => {
  upload(req, res, async (err) => {
    const { id } = req.params;
    const newFiles = req.files;

    if (err instanceof multer.MulterError) {
      cleanupUploadedFiles(newFiles);
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .send("Ukuran file terlalu besar. Maksimal 20 MB per file.");
      }
      return res.status(400).send(`Kesalahan unggah file: ${err.message}`);
    } else if (err) {
      cleanupUploadedFiles(newFiles);
      return res.status(400).send(`Tipe file tidak didukung: ${err.message}`);
    }

    let { numbers, message, datetime, deletedFiles, keepExistingFiles, groupInfo } = req.body;

    // Parse dengan validasi untuk undefined/null
    let deletedNames = [];
    if (deletedFiles && deletedFiles !== 'undefined' && deletedFiles !== 'null') {
      deletedNames = safeJsonParse(deletedFiles, []);
    }
    if (!Array.isArray(deletedNames)) {
      deletedNames = [];
    }

    let keepExistingNames = [];
    if (keepExistingFiles && keepExistingFiles !== 'undefined' && keepExistingFiles !== 'null') {
      keepExistingNames = safeJsonParse(keepExistingFiles, []);
    }
    if (!Array.isArray(keepExistingNames)) {
      keepExistingNames = [];
    }

    console.log(`Edit Schedule ID ${id}:`, {
      hasNewFiles: newFiles && newFiles.length > 0,
      newFilesCount: newFiles ? newFiles.length : 0,
      keepExistingCount: keepExistingNames.length,
      deletedCount: deletedNames.length,
      receivedGroupInfo: groupInfo
    });

    // Validasi nomor
    const parsedNumbersResult = parseAndValidateNumbers(numbers);
    if (parsedNumbersResult.error) {
      cleanupUploadedFiles(newFiles);
      return res.status(400).send(parsedNumbersResult.error);
    }
    const parsedNumbers = parsedNumbersResult.validNumbers;

    if (!datetime) {
      cleanupUploadedFiles(newFiles);
      return res
        .status(400)
        .send("Data tidak lengkap: Waktu jadwal tidak boleh kosong.");
    }

    // Ambil data lama dari database
    db.get(`SELECT * FROM schedules WHERE id = ?`, [id], (err, oldSchedule) => {
      if (err || !oldSchedule) {
        cleanupUploadedFiles(newFiles);
        return res
          .status(404)
          .send("Jadwal pesan tidak ditemukan atau gagal mengambil data lama.");
      }

      const timeValidation = validateScheduleTime(datetime);
      if (!timeValidation.isValid) {
        cleanupUploadedFiles(newFiles);
        return res.status(400).json({ error: timeValidation.error });
      }
      datetime = timeValidation.adjustedTime;

      // Logika penanganan file
      let oldFilesDataParsed = [];
      if (oldSchedule.filesData && 
          oldSchedule.filesData !== 'undefined' && 
          oldSchedule.filesData !== 'null') {
        oldFilesDataParsed = safeJsonParse(oldSchedule.filesData, []);
      }
      
      if (!Array.isArray(oldFilesDataParsed)) {
        oldFilesDataParsed = [];
      }

      let finalFilesArray = [];

      if (keepExistingNames.length > 0) {
        const keptFiles = oldFilesDataParsed.filter((f) => {
          const name = f.name || f.filename || f;
          return keepExistingNames.includes(name);
        });
        finalFilesArray.push(...keptFiles);
      } 
      else if (
        deletedNames.length === 0 && 
        (!newFiles || newFiles.length === 0) &&
        oldFilesDataParsed.length > 0
      ) {
        finalFilesArray.push(...oldFilesDataParsed);
      }

      if (newFiles && newFiles.length > 0) {
        const newFilesData = newFiles.map((file) => ({
          path: file.path,
          name: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        }));
        finalFilesArray.push(...newFilesData);
      }

      if (deletedNames.length > 0) {
        const toDelete = oldFilesDataParsed.filter((f) => {
          const name = f.name || f.filename || f;
          return deletedNames.includes(name);
        });
        toDelete.forEach((file) => {
          deleteFileIfExists(file.path);
        });
      }

      if (keepExistingNames.length > 0) {
        const filesToDelete = oldFilesDataParsed.filter((f) => {
          const name = f.name || f.filename || f;
          return (
            !keepExistingNames.includes(name) && !deletedNames.includes(name)
          );
        });
        filesToDelete.forEach((file) => {
          deleteFileIfExists(file.path);
        });
      }

      const finalFilesData =
        finalFilesArray.length > 0 ? JSON.stringify(finalFilesArray) : null;

      // Validasi pesan atau file
      const hasMessage = message && message.trim() !== "";
      const hasFiles = finalFilesArray.length > 0;
      
      if (!hasMessage && !hasFiles) {
        cleanupUploadedFiles(newFiles);
        return res
          .status(400)
          .send(
            "Data tidak lengkap: Pesan atau setidaknya satu file harus disediakan."
          );
      }

      // Penanganan groupInfo dengan benar
      const finalGroupInfo = (() => {
        // Periksa apakah groupInfo dikirim dari frontend
        if (groupInfo !== undefined && groupInfo !== null && groupInfo !== 'undefined' && groupInfo !== 'null') {
          try {
            // Parse groupInfo
            const parsed = typeof groupInfo === 'string' ? JSON.parse(groupInfo) : groupInfo;
            
            // Jika array kosong, user ingin menghapus semua grup
            if (Array.isArray(parsed) && parsed.length === 0) {
              console.log('Menghapus semua grup (menerima array kosong)');
              return null;
            }
            
            // Jika array valid tidak kosong, update dengan grup baru
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log(`Memperbarui dengan ${parsed.length} grup`);
              return JSON.stringify(parsed);
            }
            
            // Jika bukan array atau tidak valid, set ke null
            console.warn('Format groupInfo tidak valid, menghapus grup');
            return null;
          } catch (e) {
            console.warn('Gagal mem-parse groupInfo, menghapus grup:', e);
            return null;
          }
        }
        
        // Jika groupInfo tidak dikirim sama sekali, pertahankan nilai lama
        console.warn('groupInfo tidak dikirim, mempertahankan nilai lama');
        return oldSchedule.groupInfo || null;
      })();

      console.log('Pembaruan informasi grup:', {
        received: groupInfo,
        old: oldSchedule.groupInfo,
        final: finalGroupInfo,
        action: finalGroupInfo === null ? 'DIHAPUS/NULL' : 'DIPERBARUI'
      });

      // Batalkan job lama
      cancelScheduleJob(id);

      // Update database dengan groupInfo yang sudah diperbaiki
      db.run(
        `UPDATE schedules SET numbers = ?, message = ?, filesData = ?, scheduledTime = ?, status = ?, groupInfo = ? WHERE id = ?`,
        [
          JSON.stringify(parsedNumbers),
          hasMessage ? message : null,
          finalFilesData,
          datetime,
          "terjadwal",
          finalGroupInfo,
          id,
        ],
        function (updateErr) {
          if (updateErr) {
            console.error(
              "Gagal memperbarui jadwal pesan di database:",
              updateErr.message
            );
            cleanupUploadedFiles(newFiles);
            return res.status(500).send("Gagal memperbarui jadwal pesan.");
          }

          console.log(`Jadwal pesan ID ${id} berhasil diperbarui.`);
          
          // Jadwalkan ulang
          scheduleMessage({
            id,
            numbers: JSON.stringify(parsedNumbers),
            message: hasMessage ? message : null,
            filesData: finalFilesData,
            scheduledTime: datetime,
            status: "terjadwal",
            groupInfo: finalGroupInfo
          });
          
          // Emit event socket dengan info perubahan file
          if (global.emitScheduleUpdated) {
            const hasFileChanges = 
              (newFiles && newFiles.length > 0) || 
              deletedNames.length > 0 ||
              (keepExistingNames.length > 0 && keepExistingNames.length !== oldFilesDataParsed.length);
            
            global.emitScheduleUpdated({
              scheduleId: id,
              filesChanged: hasFileChanges,
              filesData: finalFilesArray,
              groupInfo: finalGroupInfo,
              forceRefresh: true 
            });
          }
          
          res
            .status(200)
            .send("Jadwal pesan berhasil diperbarui dan dijadwalkan ulang.");
        }
      );
    });
  });
});


// Export modul
module.exports = {
  router,
  setWhatsappClient,
  loadAndScheduleExistingMessages,
  scheduleMessage,
  formatNumber,
  validateNumbers,
  validateScheduleTime,
  deleteFileIfExists,
};