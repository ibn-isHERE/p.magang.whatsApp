// scheduler.js - WITH SAFE DELAYS AND BATCHING

const schedule = require("node-schedule");
const { MessageMedia } = require("whatsapp-web.js");
const fs = require("fs");
const { formatNumber } = require("./validation");
const { cleanupFiles } = require("./fileHandler");

let jobs = {};
let client = null;
let db = null;

// ⚙️ KONFIGURASI DELAY - SESUAIKAN SESUAI KEBUTUHAN
const DELAY_CONFIG = {
  VALIDATION_DELAY: 500,           // 0.5 detik antar validasi nomor
  MESSAGE_DELAY_MIN: 8000,         // 8 detik minimum antar pesan
  MESSAGE_DELAY_MAX: 15000,        // 15 detik maximum antar pesan
  FILE_DELAY_MIN: 3000,            // 3 detik minimum antar file
  FILE_DELAY_MAX: 6000,            // 6 detik maximum antar file
  BATCH_SIZE: 20,                  // Kirim 20 pesan, lalu pause
  BATCH_PAUSE: 5 * 60 * 1000       // Pause 5 menit antar batch
};

/**
 * 🎲 Generate random delay dalam range
 */
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * ⏱️ Sleep dengan delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 📊 Log progress pengiriman
 */
function logProgress(current, total, type = 'pesan') {
  const percentage = Math.round((current / total) * 100);
  console.log(`📈 Progress: ${current}/${total} ${type} (${percentage}%)`);
}

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
 * 🚀 ENHANCED: Execute dengan safe delays, batching, dan tracking delivery result
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

  // 📊 Track detail per nomor
  console.log(`\n📋 Memvalidasi ${targetNumbers.length} nomor untuk pesan ID ${id}...`);
  console.log(`⏱️ Estimasi waktu validasi: ~${Math.round((targetNumbers.length * DELAY_CONFIG.VALIDATION_DELAY) / 1000)} detik\n`);
  
  const deliveryResult = {
    total: targetNumbers.length,
    success: [],
    failed: [],
    notRegistered: []
  };

  // STEP 1: Validasi semua nomor dulu dengan delay aman
  for (let i = 0; i < targetNumbers.length; i++) {
    const num = targetNumbers[i];
    const formattedNum = formatNumber(num);
    
    if (!formattedNum) {
      console.warn(`⚠️ [${i+1}/${targetNumbers.length}] Format nomor tidak valid: ${num}`);
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
        console.log(`✅ [${i+1}/${targetNumbers.length}] ${num} - Valid & Terdaftar`);
      } else {
        deliveryResult.notRegistered.push({
          number: num,
          reason: 'Tidak terdaftar di WhatsApp'
        });
        console.warn(`⚠️ [${i+1}/${targetNumbers.length}] ${num} - Tidak terdaftar di WhatsApp`);
      }
    } catch (error) {
      console.error(`❌ [${i+1}/${targetNumbers.length}] Error validasi ${num}:`, error.message);
      deliveryResult.failed.push({
        number: num,
        reason: `Error: ${error.message}`
      });
    }

    // Delay antar validasi
    if (i < targetNumbers.length - 1) {
      await sleep(DELAY_CONFIG.VALIDATION_DELAY);
    }
  }

  console.log(`\n📊 Hasil Validasi:`);
  console.log(`   ✅ Valid: ${deliveryResult.success.length} nomor`);
  console.log(`   ❌ Not Registered: ${deliveryResult.notRegistered.length} nomor`);
  console.log(`   ❌ Error: ${deliveryResult.failed.length} nomor`);

  // Jika semua nomor invalid
  if (deliveryResult.success.length === 0) {
    const failureReason = `Semua nomor tidak valid (${deliveryResult.failed.length + deliveryResult.notRegistered.length} nomor gagal)`;
    console.error(`❌ ${failureReason}`);
    
    saveDeliveryResult(id, deliveryResult);
    handleFailedMessage(id, filesData, failureReason);
    return;
  }

  // STEP 2: Kirim dengan safe delays dan batching
  console.log(`\n📤 Mengirim pesan ke ${deliveryResult.success.length} nomor valid...`);
  
  const totalRecipients = deliveryResult.success.length;
  const avgDelay = (DELAY_CONFIG.MESSAGE_DELAY_MIN + DELAY_CONFIG.MESSAGE_DELAY_MAX) / 2 / 1000;
  const totalBatches = Math.ceil(totalRecipients / DELAY_CONFIG.BATCH_SIZE);
  const estimatedTime = (totalRecipients * avgDelay) + ((totalBatches - 1) * DELAY_CONFIG.BATCH_PAUSE / 1000);
  
  console.log(`⏱️ Estimasi waktu pengiriman: ~${Math.round(estimatedTime / 60)} menit`);
  console.log(`📦 Total batch: ${totalBatches} (${DELAY_CONFIG.BATCH_SIZE} pesan/batch)\n`);
  
  const actualSent = [];
  const sentErrors = [];

  for (let i = 0; i < deliveryResult.success.length; i++) {
    const contact = deliveryResult.success[i];
    const recipientNum = i + 1;

    try {
      // Kirim pesan teks
      if (message && message.trim() !== "") {
        await client.sendMessage(contact.formatted, message.trim());
        console.log(`✅ [${recipientNum}/${totalRecipients}] Pesan teks terkirim ke ${contact.number}`);
      }

      // Kirim file dengan delay lebih pendek
      if (medias.length > 0) {
        for (let j = 0; j < medias.length; j++) {
          const media = medias[j];
          const fileDelay = getRandomDelay(DELAY_CONFIG.FILE_DELAY_MIN, DELAY_CONFIG.FILE_DELAY_MAX);
          
          await sleep(fileDelay);
          
          await client.sendMessage(contact.formatted, media);
          console.log(`   📎 File ${j+1}/${medias.length} (${media.filename}) terkirim ke ${contact.number}`);
        }
      }

      actualSent.push(contact.number);
      contact.status = 'sent';

      // Log progress setiap 10 pesan
      if (recipientNum % 10 === 0) {
        logProgress(recipientNum, totalRecipients);
      }

      // 🔄 BATCH PAUSE: Pause setiap N pesan
      if (recipientNum % DELAY_CONFIG.BATCH_SIZE === 0 && recipientNum < totalRecipients) {
        const remainingBatches = Math.ceil((totalRecipients - recipientNum) / DELAY_CONFIG.BATCH_SIZE);
        console.log(`\n⏸️ === BATCH PAUSE ===`);
        console.log(`   📊 Terkirim: ${recipientNum}/${totalRecipients}`);
        console.log(`   ⏳ Pause ${DELAY_CONFIG.BATCH_PAUSE / 60000} menit...`);
        console.log(`   📦 Sisa batch: ${remainingBatches}\n`);
        
        await sleep(DELAY_CONFIG.BATCH_PAUSE);
        
        console.log(`▶️ Melanjutkan pengiriman...\n`);
      }
      // Random delay antar pesan (jika bukan akhir batch)
      else if (recipientNum < totalRecipients) {
        const messageDelay = getRandomDelay(
          DELAY_CONFIG.MESSAGE_DELAY_MIN, 
          DELAY_CONFIG.MESSAGE_DELAY_MAX
        );
        await sleep(messageDelay);
      }
      
    } catch (err) {
      console.error(`❌ [${recipientNum}/${totalRecipients}] Gagal mengirim ke ${contact.number}:`, err.message);
      sentErrors.push({
        number: contact.number,
        reason: err.message
      });
      contact.status = 'error';
      
      // Delay lebih lama setelah error
      await sleep(DELAY_CONFIG.MESSAGE_DELAY_MAX);
    }
  }

  // Update delivery result final
  deliveryResult.actualSent = actualSent.length;
  deliveryResult.failed = [...deliveryResult.failed, ...sentErrors];
  deliveryResult.allFailed = [...deliveryResult.notRegistered, ...deliveryResult.failed];

  const totalFailed = sentErrors.length + deliveryResult.notRegistered.length;

  console.log(`\n📊 ========== HASIL PENGIRIMAN ==========`);
  console.log(`📧 Schedule ID: ${id}`);
  console.log(`✅ Berhasil: ${actualSent.length} nomor`);
  console.log(`❌ Gagal: ${totalFailed} nomor`);
  console.log(`⚠️ Tidak terdaftar: ${deliveryResult.notRegistered.length} nomor`);
  console.log(`📊 Total: ${deliveryResult.total} nomor`);
  console.log(`========================================\n`);
  
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
 * ✅ Save delivery result to database
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
  saveDeliveryResult,
  DELAY_CONFIG // Export untuk testing/debugging
};