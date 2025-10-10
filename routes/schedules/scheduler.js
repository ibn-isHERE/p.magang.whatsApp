// scheduler.js - Scheduling Module for Messages

const schedule = require("node-schedule");
const { MessageMedia } = require("whatsapp-web.js");
const fs = require("fs");
const { formatNumber } = require("./validation");
const { cleanupFiles } = require("./fileHandler");

let jobs = {}; // Untuk menyimpan job terjadwal
let client = null;
let db = null;

/**
 * Set WhatsApp client
 * @param {Object} whatsappClient - WhatsApp client instance
 */
function setWhatsappClient(whatsappClient) {
  client = whatsappClient;
}

/**
 * Set database instance
 * @param {Object} database - Database instance
 */
function setDatabase(database) {
  db = database;
}

/**
 * Fungsi untuk menjadwalkan pengiriman pesan
 * @param {Object} scheduleData - Data jadwal pesan
 */
async function scheduleMessage(scheduleData) {
  const { id, numbers, message, filesData, scheduledTime } = scheduleData;
  const reminderTime = new Date(scheduledTime);
  const now = new Date();

  const jobId = `message_${id}`;

  // Batalkan job lama jika ada
  if (jobs[jobId]) {
    jobs[jobId].cancel();
    console.log(`Job pesan lama dibatalkan dengan ID: ${jobId}`);
  }

  // Cek apakah jadwal sudah lewat lebih dari 1 menit
  if (
    reminderTime.getTime() < now.getTime() - 60 * 1000 &&
    scheduleData.status === "terjadwal"
  ) {
    console.warn(
      `Jadwal pesan ID ${id} lebih dari 1 menit lewat. Menandai sebagai 'gagal'.`
    );
    db.run(
      `UPDATE schedules SET status = ? WHERE id = ?`,
      ["gagal", id],
      (err) => {
        if (err) {
          console.error(
            "Gagal memperbarui status untuk jadwal pesan yang telah lewat:",
            err.message
          );
        } else {
          // ✅ EMIT SOCKET EVENT
          if (global.emitScheduleStatusUpdate) {
            global.emitScheduleStatusUpdate(
              id, 
              'gagal', 
              'Jadwal sudah lewat lebih dari 1 menit'
            );
          }
        }
      }
    );

    // Hapus file yang terkait
    if (filesData) {
      try {
        const files = JSON.parse(filesData);
        files.forEach((file) => require("./fileHandler").deleteFileIfExists(file.path));
      } catch (parseErr) {
        console.error(
          `Gagal mengurai filesData untuk penghapusan pada jadwal pesan ID ${id} yang telah lewat:`,
          parseErr
        );
      }
    }
    return;
  }

  // Skip jika status bukan terjadwal
  if (scheduleData.status !== "terjadwal") {
    console.log(
      `Jadwal pesan ID ${id} memiliki status '${scheduleData.status}', tidak dijadwalkan ulang.`
    );
    return;
  }

  // Buat job baru
  jobs[jobId] = schedule.scheduleJob(reminderTime, async () => {
    await executeScheduledMessage(id, numbers, message, filesData);
  });

  console.log(
    `Jadwal pesan ID ${id} berhasil ditambahkan/dijadwalkan ulang untuk dikirim pada ${reminderTime.toLocaleString()}.`
  );
}

/**
 * Eksekusi pengiriman pesan terjadwal
 * @param {string} id - ID jadwal
 * @param {string} numbers - JSON string berisi array nomor
 * @param {string} message - Pesan teks
 * @param {string} filesData - JSON string berisi data file
 */
async function executeScheduledMessage(id, numbers, message, filesData) {
  // VALIDASI: Pastikan client tersedia
  if (!client) {
    console.error(`Client WhatsApp tidak tersedia untuk pesan ID ${id}`);
    handleFailedMessage(id, filesData, "Client WhatsApp tidak tersedia");
    return;
  }

  let medias = [];
  let allFilesReady = true;

  // Persiapkan media files jika ada
  if (filesData) {
    try {
      const filesMetadata = JSON.parse(filesData);

      if (Array.isArray(filesMetadata)) {
        for (const file of filesMetadata) {
          if (file.path && fs.existsSync(file.path)) {
            try {
              const fileBuffer = fs.readFileSync(file.path);
              const media = new MessageMedia(
                file.mimetype,
                fileBuffer.toString("base64"),
                file.name
              );
              medias.push(media);
              console.log(
                `MessageMedia berhasil dibuat untuk file ${file.name} (ID ${id}).`
              );
            } catch (mediaErr) {
              console.error(
                `Gagal membuat MessageMedia untuk file ${file.name}:`,
                mediaErr
              );
              allFilesReady = false;
              break;
            }
          } else {
            console.error(
              `File ${file.path} tidak ditemukan untuk pesan ID ${id}.`
            );
            allFilesReady = false;
            break;
          }
        }
      }
    } catch (parseErr) {
      console.error(`Gagal mengurai filesData untuk pesan ID ${id}:`, parseErr);
      allFilesReady = false;
    }
  }

  // Jika ada masalah dengan file, update status ke gagal
  if (!allFilesReady) {
    handleFailedMessage(id, filesData, "Gagal memproses file");
    return;
  }

  // Kirim pesan ke semua nomor
  let allSent = true;
  let numbersFailed = [];
  let targetNumbers;

  try {
    targetNumbers = JSON.parse(numbers);
    if (!Array.isArray(targetNumbers) || targetNumbers.length === 0) {
      throw new Error("Format numbers tidak valid");
    }
  } catch (parseErr) {
    console.error(`Gagal mengurai numbers untuk pesan ID ${id}:`, parseErr);
    handleFailedMessage(id, filesData, "Format nomor tidak valid");
    return;
  }

  for (const num of targetNumbers) {
    const formattedNum = formatNumber(num);
    if (!formattedNum) {
      console.error(`Nomor tidak valid ${num} untuk pesan ID ${id}.`);
      allSent = false;
      numbersFailed.push(num);
      continue;
    }

    try {
      // Kirim pesan teks jika ada
      if (message && message.trim() !== "") {
        await client.sendMessage(formattedNum, message.trim());
        console.log(`Pesan teks ID ${id} berhasil dikirim ke ${num}.`);
      }

      // Kirim setiap file jika ada
      if (medias.length > 0) {
        for (const media of medias) {
          await client.sendMessage(formattedNum, media);
          console.log(`File ${media.filename} dikirim ke ${num}.`);
        }
      }

      // Tunggu sebentar antara pengiriman untuk menghindari rate limit
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      console.error(
        `Gagal mengirim pesan/file ID ${id} ke ${num}:`,
        err.message
      );
      allSent = false;
      numbersFailed.push(num);
    }
  }

  // Bersihkan file setelah pengiriman (sukses atau gagal)
  cleanupFiles(filesData);

  // Update status di database
  const finalStatus = allSent ? "terkirim" : "gagal";
  updateMessageStatus(id, finalStatus, numbersFailed);

  // Hapus job dari memori
  const jobId = `message_${id}`;
  if (jobs[jobId]) {
    delete jobs[jobId];
    console.log(`Job pesan ID ${jobId} dihapus dari memori.`);
  }
}

/**
 * Handle failed message
 * @param {string} id - Schedule ID
 * @param {string} filesData - Files data JSON string
 * @param {string} reason - Failure reason
 */
function handleFailedMessage(id, filesData, reason) {
  console.error(`Pesan ID ${id} gagal: ${reason}`);

  // Update status di database
  db.run(
    `UPDATE schedules SET status = ? WHERE id = ?`,
    ["gagal", id],
    (err) => {
      if (err) {
        console.error("Gagal memperbarui status:", err.message);
      } else {
        // ✅ EMIT SOCKET EVENT
        if (global.emitScheduleStatusUpdate) {
          global.emitScheduleStatusUpdate(id, 'gagal', reason);
        }
      }
    }
  );

  // Bersihkan file
  cleanupFiles(filesData);
}

/**
 * Update message status
 * @param {string} id - Schedule ID
 * @param {string} status - New status
 * @param {Array} failedNumbers - Array of failed numbers
 */
function updateMessageStatus(id, status, failedNumbers = []) {
  let additionalInfo = "";
  if (failedNumbers.length > 0) {
    additionalInfo = `, gagal ke: ${failedNumbers.join(", ")}`;
  }

  db.run(
    `UPDATE schedules SET status = ? WHERE id = ?`,
    [status, id],
    (err) => {
      if (err) {
        console.error("Gagal memperbarui status:", err.message);
      } else {
        console.log(
          `Status pesan ID ${id} diperbarui menjadi ${status}${additionalInfo}`
        );
        
        // ✅ EMIT SOCKET EVENT (sudah benar)
        if (global.emitScheduleStatusUpdate) {
          const message = failedNumbers.length > 0 
            ? `Pesan terkirim, ${failedNumbers.length} nomor gagal`
            : `Pesan berhasil terkirim`;
          global.emitScheduleStatusUpdate(id, status, message);
        }
      }
    }
  );
}

/**
 * Memuat dan menjadwalkan ulang pesan yang belum terkirim saat server restart
 */
function loadAndScheduleExistingMessages() {
  if (!db) {
    console.error("Database belum diinisialisasi untuk memuat jadwal pesan");
    return;
  }

  db.all(`SELECT * FROM schedules WHERE status = 'terjadwal'`, (err, rows) => {
    if (err) {
      console.error("Gagal mengambil jadwal pesan dari DB:", err.message);
      return;
    }
    rows.forEach((scheduleData) => {
      console.log(
        `Menjadwalkan ulang pesan ID ${scheduleData.id} (status: ${scheduleData.status})`
      );
      scheduleMessage(scheduleData);
    });
  });
}

/**
 * Cancel schedule job
 * @param {string} id - Schedule ID
 */
function cancelScheduleJob(id) {
  const jobId = `message_${id}`;
  if (jobs[jobId]) {
    jobs[jobId].cancel();
    delete jobs[jobId];
    console.log(`Job pesan ID ${jobId} dibatalkan.`);
    return true;
  }
  return false;
}

module.exports = {
  setWhatsappClient,
  setDatabase,
  scheduleMessage,
  executeScheduledMessage,
  loadAndScheduleExistingMessages,
  cancelScheduleJob,
};