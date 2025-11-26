// scheduler.js - WITH DELIVERY RESULT TRACKING

const schedule = require("node-schedule");
const { MessageMedia } = require("whatsapp-web.js");
const fs = require("fs");
const { formatNumber } = require("./validation");
const { cleanupFiles } = require("./fileHandler");

let jobs = {};
let client = null;
let db = null;

function setWhatsappClient(whatsappClient) {
  client = whatsappClient;
}

function setDatabase(database) {
  db = database;
}

async function scheduleMessage(scheduleData) {
  const { id, numbers, message, filesData, scheduledTime } = scheduleData;
  const reminderTime = new Date(scheduledTime);
  const now = new Date();
  const jobId = `message_${id}`;

  if (jobs[jobId]) {
    jobs[jobId].cancel();
    console.log(`Job pesan lama dibatalkan dengan ID: ${jobId}`);
  }

  if (
    reminderTime.getTime() < now.getTime() - 60 * 1000 &&
    scheduleData.status === "terjadwal"
  ) {
    console.warn(`Jadwal pesan ID ${id} lebih dari 1 menit lewat. Menandai sebagai 'gagal'.`);
    db.run(`UPDATE schedules SET status = ? WHERE id = ?`, ["gagal", id], (err) => {
      if (err) {
        console.error("Gagal memperbarui status untuk jadwal pesan yang telah lewat:", err.message);
      } else {
        if (global.emitScheduleStatusUpdate) {
          global.emitScheduleStatusUpdate(id, 'gagal', 'Jadwal sudah lewat lebih dari 1 menit');
        }
      }
    });

    if (filesData) {
      try {
        const files = JSON.parse(filesData);
        files.forEach((file) => require("./fileHandler").deleteFileIfExists(file.path));
      } catch (parseErr) {
        console.error(`Gagal parsing filesData untuk penghapusan:`, parseErr);
      }
    }
    return;
  }

  if (scheduleData.status !== "terjadwal") {
    console.log(`Jadwal pesan ID ${id} memiliki status '${scheduleData.status}', tidak dijadwalkan ulang.`);
    return;
  }

  jobs[jobId] = schedule.scheduleJob(reminderTime, async () => {
    await executeScheduledMessage(id, numbers, message, filesData);
  });

  console.log(`Jadwal pesan ID ${id} berhasil dijadwalkan untuk ${reminderTime.toLocaleString()}.`);
}

/**
 * ✅ ENHANCED: Execute dengan tracking delivery result
 */
async function executeScheduledMessage(id, numbers, message, filesData) {
  if (!client) {
    console.error(`❌ Client WhatsApp tidak tersedia untuk pesan ID ${id}`);
    handleFailedMessage(id, filesData, "Client WhatsApp tidak tersedia");
    return;
  }

  let medias = [];
  let allFilesReady = true;

  // Persiapkan media files
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
              console.log(`✅ MessageMedia berhasil dibuat untuk file ${file.name}`);
            } catch (mediaErr) {
              console.error(`❌ Gagal membuat MessageMedia:`, mediaErr);
              allFilesReady = false;
              break;
            }
          } else {
            console.error(`❌ File ${file.path} tidak ditemukan`);
            allFilesReady = false;
            break;
          }
        }
      }
    } catch (parseErr) {
      console.error(`❌ Gagal mengurai filesData:`, parseErr);
      allFilesReady = false;
    }
  }

  if (!allFilesReady) {
    handleFailedMessage(id, filesData, "Gagal memproses file");
    return;
  }

  // Parse nomor target
  let targetNumbers;
  try {
    targetNumbers = JSON.parse(numbers);
    if (!Array.isArray(targetNumbers) || targetNumbers.length === 0) {
      throw new Error("Format numbers tidak valid");
    }
  } catch (parseErr) {
    console.error(`❌ Gagal mengurai numbers:`, parseErr);
    handleFailedMessage(id, filesData, "Format nomor tidak valid");
    return;
  }

  // ✅ ENHANCED: Track detail per nomor
  console.log(`\n🔍 Memvalidasi ${targetNumbers.length} nomor untuk pesan ID ${id}...`);
  
  const deliveryResult = {
    total: targetNumbers.length,
    success: [],
    failed: [],
    notRegistered: []
  };

  // STEP 1: Validasi semua nomor dulu
  for (const num of targetNumbers) {
    const formattedNum = formatNumber(num);
    
    if (!formattedNum) {
      console.warn(`⚠️ Format nomor tidak valid: ${num}`);
      deliveryResult.failed.push({
        number: num,
        reason: 'Format tidak valid'
      });
      continue;
    }

    try {
      const isRegistered = await client.isRegisteredUser(formattedNum);
      
      if (isRegistered) {
        deliveryResult.success.push({
          number: num,
          formatted: formattedNum,
          status: 'pending'
        });
        console.log(`✅ ${num} - Valid & Terdaftar`);
      } else {
        deliveryResult.notRegistered.push({
          number: num,
          reason: 'Tidak terdaftar di WhatsApp'
        });
        console.warn(`⚠️ ${num} - Tidak terdaftar di WhatsApp`);
      }
    } catch (error) {
      console.error(`❌ Error validasi ${num}:`, error.message);
      deliveryResult.failed.push({
        number: num,
        reason: `Error: ${error.message}`
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  console.log(`\n📊 Hasil Validasi:`);
  console.log(`   ✅ Valid: ${deliveryResult.success.length} nomor`);
  console.log(`   ❌ Not Registered: ${deliveryResult.notRegistered.length} nomor`);
  console.log(`   ❌ Error: ${deliveryResult.failed.length} nomor`);

  // Jika semua nomor invalid
  if (deliveryResult.success.length === 0) {
    const failureReason = `Semua nomor tidak valid (${deliveryResult.failed.length + deliveryResult.notRegistered.length} nomor gagal)`;
    console.error(`❌ ${failureReason}`);
    
    // ✅ Save delivery result to database
    saveDeliveryResult(id, deliveryResult);
    
    handleFailedMessage(id, filesData, failureReason);
    return;
  }

  // STEP 2: Kirim hanya ke nomor yang valid
  console.log(`\n📤 Mengirim pesan ke ${deliveryResult.success.length} nomor valid...`);
  
  const actualSent = [];
  const sentErrors = [];

  for (const contact of deliveryResult.success) {
    try {
      // Kirim pesan teks
      if (message && message.trim() !== "") {
        await client.sendMessage(contact.formatted, message.trim());
        console.log(`✅ Pesan teks terkirim ke ${contact.number}`);
      }

      // Kirim file
      if (medias.length > 0) {
        for (const media of medias) {
          await client.sendMessage(contact.formatted, media);
          console.log(`✅ File ${media.filename} terkirim ke ${contact.number}`);
        }
      }

      actualSent.push(contact.number);
      contact.status = 'sent';

      await new Promise((resolve) => setTimeout(resolve, 5000));
      
    } catch (err) {
      console.error(`❌ Gagal mengirim ke ${contact.number}:`, err.message);
      sentErrors.push({
        number: contact.number,
        reason: err.message
      });
      contact.status = 'error';
    }
  }

  // Update delivery result final
  deliveryResult.actualSent = actualSent.length;
  deliveryResult.failed = [...deliveryResult.failed, ...sentErrors];
  deliveryResult.allFailed = [...deliveryResult.notRegistered, ...deliveryResult.failed];

  console.log(`\n📊 Hasil Pengiriman Pesan ID ${id}:`);
  console.log(`   ✅ Berhasil: ${actualSent.length} nomor`);
  console.log(`   ❌ Gagal: ${deliveryResult.allFailed.length} nomor`);
  
  // Cleanup files
  cleanupFiles(filesData);

  // ✅ SAVE delivery result to database
  saveDeliveryResult(id, deliveryResult);

  // Update status di database
  const finalStatus = actualSent.length > 0 ? "terkirim" : "gagal";
  updateMessageStatus(id, finalStatus, deliveryResult);

  // Hapus job dari memori
  const jobId = `message_${id}`;
  if (jobs[jobId]) {
    delete jobs[jobId];
    console.log(`🗑️ Job pesan ID ${jobId} dihapus dari memori.`);
  }
}

/**
 * ✅ NEW: Save delivery result to database
 */
function saveDeliveryResult(scheduleId, deliveryResult) {
  const resultJson = JSON.stringify({
    total: deliveryResult.total,
    sent: deliveryResult.actualSent || 0,
    failed: deliveryResult.allFailed || [],
    timestamp: new Date().toISOString()
  });

  db.run(
    `UPDATE schedules SET deliveryResult = ? WHERE id = ?`,
    [resultJson, scheduleId],
    (err) => {
      if (err) {
        console.error('❌ Failed to save delivery result:', err);
      } else {
        console.log(`✅ Delivery result saved for schedule ${scheduleId}`);
      }
    }
  );
}

function handleFailedMessage(id, filesData, reason) {
  console.error(`❌ Pesan ID ${id} gagal: ${reason}`);

  db.run(`UPDATE schedules SET status = ? WHERE id = ?`, ["gagal", id], (err) => {
    if (err) {
      console.error("Gagal memperbarui status:", err.message);
    } else {
      if (global.emitScheduleStatusUpdate) {
        global.emitScheduleStatusUpdate(id, 'gagal', reason, null);
      }
    }
  });

  cleanupFiles(filesData);
}

/**
 * ✅ ENHANCED: Update with delivery result
 */
function updateMessageStatus(id, status, deliveryResult) {
  const sent = deliveryResult.actualSent || 0;
  const failed = deliveryResult.allFailed ? deliveryResult.allFailed.length : 0;
  
  let statusMessage = "";
  
  if (status === "terkirim") {
    if (failed > 0) {
      statusMessage = `Terkirim ke ${sent} nomor, ${failed} nomor gagal`;
    } else {
      statusMessage = `Berhasil terkirim ke ${sent} nomor`;
    }
  } else if (status === "gagal") {
    statusMessage = `Gagal mengirim ke semua nomor`;
  }

  db.run(`UPDATE schedules SET status = ? WHERE id = ?`, [status, id], (err) => {
    if (err) {
      console.error("Gagal memperbarui status:", err.message);
    } else {
      console.log(`✅ Status pesan ID ${id} diperbarui: ${status}`);
      
      if (global.emitScheduleStatusUpdate) {
        global.emitScheduleStatusUpdate(id, status, statusMessage, deliveryResult);
      }
    }
  });
}

function loadAndScheduleExistingMessages() {
  if (!db) {
    console.error("Database belum diinisialisasi");
    return;
  }

  db.all(`SELECT * FROM schedules WHERE status = 'terjadwal'`, (err, rows) => {
    if (err) {
      console.error("Gagal mengambil jadwal pesan dari DB:", err.message);
      return;
    }
    rows.forEach((scheduleData) => {
      console.log(`Menjadwalkan ulang pesan ID ${scheduleData.id}`);
      scheduleMessage(scheduleData);
    });
  });
}

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
  saveDeliveryResult
};