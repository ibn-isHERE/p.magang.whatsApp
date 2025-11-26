// scheduler.js - COMPLETE: With delivery result tracking for meetings

const schedule = require("node-schedule");
const { MessageMedia } = require("whatsapp-web.js");
const fs = require("fs");
const { formatNumber } = require("./validation");
const { dateTimeToEpoch, formatTimeLeft, parseNumbers, isMeetingActive } = require("./helpers");
const { updateMeetingStatus, getDatabase } = require("./dbOperations");

let client = null;
let meetingJobs = {};

function setWhatsappClient(whatsappClient) {
    client = whatsappClient;
    console.log("✅ Meeting scheduler WhatsApp client set");
}

/**
 * ✅ NEW: Save meeting delivery result to database
 */
function saveMeetingDeliveryResult(meetingId, deliveryResult) {
  const db = getDatabase();
  
  if (!db) {
    console.error('❌ Database not available for saving delivery result');
    return;
  }
  
  const resultJson = JSON.stringify({
    total: deliveryResult.total || 0,
    sent: deliveryResult.sentSuccess || 0,
    failed: deliveryResult.invalidNumbers || [],
    timestamp: new Date().toISOString()
  });

  db.run(
    `UPDATE meetings SET deliveryResult = ? WHERE id = ?`,
    [resultJson, meetingId],
    (err) => {
      if (err) {
        console.error('❌ Failed to save meeting delivery result:', err);
      } else {
        console.log(`✅ Meeting delivery result saved for ${meetingId}`);
      }
    }
  );
}

/**
 * ✅ ENHANCED: sendWhatsAppReminder with delivery result tracking
 */
async function sendWhatsAppReminder(meeting, customTimeLeft = null) {
    if (!client) {
        console.error("❌ Client WA belum siap, skip pengiriman.");
        return false;
    }

    const meetingTimeStr = `${meeting.date} ${meeting.startTime}-${meeting.endTime}`;
    const timeLeftMessage = customTimeLeft || "1 jam";
    const message =
        `📢 *PENGINGAT RAPAT*\n\n` +
        `🗓️ *Judul:* ${meeting.meetingTitle}\n` +
        `📍 *Ruangan:* ${meeting.meetingRoom}\n` +
        `⏰ *Waktu:* ${meetingTimeStr}\n\n` +
        `⏳ Rapat akan dimulai dalam *${timeLeftMessage}* lagi!`;

    let numbersArray = [];
    try {
        numbersArray = parseNumbers(meeting.numbers);
    } catch (e) {
        console.error("❌ Gagal parsing JSON numbers:", e);
        return false;
    }

    if (numbersArray.length === 0) {
        console.warn("⚠️ Tidak ada nomor untuk meeting reminder");
        return false;
    }

    // ✅ TRACK delivery result
    const deliveryResult = {
        total: numbersArray.length,
        validatedNumbers: [],
        invalidNumbers: [],
        sentSuccess: 0,
        sentFailed: 0
    };

    // ✅ STEP 1: Validasi nomor dulu
    console.log(`\n📋 Memvalidasi ${numbersArray.length} nomor untuk meeting ${meeting.id}...`);

    for (const num of numbersArray) {
        const formattedNum = formatNumber(num);
        
        if (!formattedNum) {
            console.warn(`⚠️ Format nomor tidak valid: ${num}`);
            deliveryResult.invalidNumbers.push({ number: num, reason: 'Format tidak valid' });
            continue;
        }

        try {
            const isRegistered = await client.isRegisteredUser(formattedNum);
            
            if (isRegistered) {
                deliveryResult.validatedNumbers.push({ original: num, formatted: formattedNum });
                console.log(`✅ ${num} - Valid & Terdaftar`);
            } else {
                deliveryResult.invalidNumbers.push({ number: num, reason: 'Tidak terdaftar di WhatsApp' });
                console.warn(`⚠️ ${num} - Tidak terdaftar di WhatsApp`);
            }
        } catch (error) {
            console.error(`❌ Error validasi ${num}:`, error.message);
            deliveryResult.invalidNumbers.push({ number: num, reason: `Error: ${error.message}` });
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
    }

    console.log(`\n📊 Hasil Validasi Meeting ${meeting.id}:`);
    console.log(`   ✅ Valid: ${deliveryResult.validatedNumbers.length} nomor`);
    console.log(`   ❌ Invalid: ${deliveryResult.invalidNumbers.length} nomor`);

    if (deliveryResult.validatedNumbers.length === 0) {
        console.error(`❌ Semua nomor tidak valid untuk meeting ${meeting.id}`);
        
        // ✅ Save delivery result even if all failed
        saveMeetingDeliveryResult(meeting.id, deliveryResult);
        
        return false;
    }

    // ✅ STEP 2: Persiapkan media files
    let medias = [];
    if (meeting.filesData) {
        try {
            const files = JSON.parse(meeting.filesData);
            for (const file of files) {
                if (fs.existsSync(file.path)) {
                    const media = MessageMedia.fromFilePath(file.path);
                    medias.push(media);
                } else {
                    console.warn(`⚠️ File not found: ${file.path}`);
                }
            }
        } catch (e) {
            console.error("❌ Gagal memproses filesData:", e);
        }
    }

    // ✅ STEP 3: Kirim hanya ke nomor yang valid
    console.log(`\n📤 Mengirim reminder meeting ke ${deliveryResult.validatedNumbers.length} nomor valid...`);

    for (const { original, formatted } of deliveryResult.validatedNumbers) {
        try {
            await client.sendMessage(formatted, message);
            console.log(`✅ Reminder terkirim ke: ${original}`);
            
            for (const media of medias) {
                await client.sendMessage(formatted, media, { 
                    caption: `Dokumen untuk rapat: ${meeting.meetingTitle}` 
                });
                console.log(`✅ File terkirim ke: ${original}`);
            }
            
            deliveryResult.sentSuccess++;
            await new Promise((resolve) => setTimeout(resolve, 3000));
            
        } catch (err) {
            console.error(`❌ Gagal kirim reminder ke ${original}:`, err.message);
            deliveryResult.sentFailed++;
            deliveryResult.invalidNumbers.push({ 
                number: original, 
                reason: `Send error: ${err.message}` 
            });
        }
    }

    console.log(`\n📊 Hasil Pengiriman Meeting Reminder ${meeting.id}:`);
    console.log(`   ✅ Berhasil: ${deliveryResult.sentSuccess} nomor`);
    console.log(`   ❌ Gagal: ${deliveryResult.sentFailed + deliveryResult.invalidNumbers.length} nomor`);

    // ✅ SAVE delivery result to database
    saveMeetingDeliveryResult(meeting.id, deliveryResult);

    const hasSuccess = deliveryResult.sentSuccess > 0;
    
    if (hasSuccess) {
        updateMeetingStatus(meeting.id, 'terkirim');
        
        if (global.emitMeetingStatusUpdate) {
            const totalFailed = deliveryResult.sentFailed + deliveryResult.invalidNumbers.length;
            const statusMessage = totalFailed > 0
                ? `Reminder terkirim ke ${deliveryResult.sentSuccess} peserta, ${totalFailed} gagal`
                : `Reminder terkirim ke ${deliveryResult.sentSuccess} peserta`;
            
            global.emitMeetingStatusUpdate(meeting.id, 'terkirim', statusMessage);
        }
    }

    return hasSuccess;
}

function scheduleMeetingReminder(meeting) {
    const now = new Date().getTime();
    
    let startEpoch;
    if (meeting.start_epoch) {
        startEpoch = meeting.start_epoch;
    } else {
        startEpoch = dateTimeToEpoch(meeting.date, meeting.startTime);
    }
    
    const timeDifference = startEpoch - now;
    const hourInMs = 60 * 60 * 1000;
    
    const jobId = `meeting_${meeting.id}`;
    
    if (meetingJobs[jobId]) {
        meetingJobs[jobId].cancel();
        delete meetingJobs[jobId];
    }

    // Jika kurang dari 1 jam, kirim langsung
    if (timeDifference < hourInMs && timeDifference > 0) {
        const timeLeft = formatTimeLeft(timeDifference);
        console.log(`⏰ Meeting ${meeting.id} dimulai dalam ${timeLeft}, kirim reminder langsung`);

        sendWhatsAppReminder(meeting, timeLeft).then((success) => {
            if (success) {
                updateMeetingStatus(meeting.id, 'terkirim');
            }
        });
        return;
    }

    // Jika sudah lewat, skip
    if (timeDifference <= 0) {
        console.log(`⏭️ Meeting ${meeting.id} sudah lewat, tidak dijadwalkan`);
        return;
    }

    // Schedule 1 jam sebelumnya
    const reminderEpoch = startEpoch - hourInMs;
    const reminderTime = new Date(reminderEpoch);
    
    if (reminderEpoch < now) {
        console.log(`⏭️ Reminder untuk meeting ${meeting.id} sudah lewat`);
        return;
    }

    meetingJobs[jobId] = schedule.scheduleJob(reminderTime, async () => {
        const db = getDatabase();
        db.get("SELECT * FROM meetings WHERE id = ?", [meeting.id], async (err, row) => {
            if (err || !row) {
                console.error(`❌ Error checking status for meeting ${meeting.id}`);
                return;
            }

            if (row.status === 'terjadwal') {
                const success = await sendWhatsAppReminder(row);
                if (success) {
                    updateMeetingStatus(meeting.id, 'terkirim');
                }
            }
        });
        
        delete meetingJobs[jobId];
    });

    console.log(`✅ Reminder meeting ${meeting.id} dijadwalkan: ${reminderTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
}

function cancelMeetingJob(id) {
    const jobId = `meeting_${id}`;
    if (meetingJobs[jobId]) {
        meetingJobs[jobId].cancel();
        delete meetingJobs[jobId];
        console.log(`✅ Reminder meeting ${id} dibatalkan`);
        return true;
    }
    return false;
}

function loadAndScheduleExistingMeetings() {
    const db = getDatabase();
    
    if (!db) {
        console.error("❌ Database belum diinisialisasi");
        return;
    }

    db.all(
        `SELECT * FROM meetings WHERE status = 'terjadwal' ORDER BY date ASC, startTime ASC`,
        [],
        (err, rows) => {
            if (err) {
                console.error("❌ Gagal load meetings:", err.message);
                return;
            }

            console.log(`📋 Ditemukan ${rows.length} meeting terjadwal`);

            let scheduledCount = 0;
            rows.forEach((meeting) => {
                if (isMeetingActive(meeting)) {
                    scheduleMeetingReminder(meeting);
                    scheduledCount++;
                }
            });

            console.log(`✅ ${scheduledCount} meeting reminder berhasil dijadwalkan`);
            
            const { updateExpiredMeetings } = require('./dbOperations');
            updateExpiredMeetings();
        }
    );
}

/**
 * ✅ ENHANCED: Validasi nomor untuk notifikasi pembatalan dengan tracking
 */
async function sendCancellationNotification(meeting) {
    if (!client) {
        console.error("❌ Client WA belum siap");
        return;
    }

    const message =
        `🚫 *PEMBERITAHUAN PEMBATALAN RAPAT*\n\n` +
        `Rapat dengan detail berikut telah dibatalkan:\n` +
        `🗓️ *Judul:* ${meeting.meetingTitle}\n` +
        `📍 *Ruangan:* ${meeting.meetingRoom}\n` +
        `⏰ *Waktu Semula:* ${meeting.date} pukul ${meeting.startTime}\n\n` +
        `Mohon maaf atas ketidaknyamanannya.`;

    let numbersArray = [];
    try {
        numbersArray = parseNumbers(meeting.numbers);
    } catch (e) {
        console.error("❌ Gagal parsing numbers:", e);
        return;
    }

    if (!Array.isArray(numbersArray) || numbersArray.length === 0) return;

    // ✅ Track cancellation delivery
    const deliveryResult = {
        total: numbersArray.length,
        sentSuccess: 0,
        invalidNumbers: []
    };

    console.log(`\n📋 Memvalidasi ${numbersArray.length} nomor untuk notifikasi pembatalan...`);

    for (const num of numbersArray) {
        const formattedNum = formatNumber(num);
        if (!formattedNum) {
            deliveryResult.invalidNumbers.push({ number: num, reason: 'Format tidak valid' });
            continue;
        }

        try {
            const isRegistered = await client.isRegisteredUser(formattedNum);
            
            if (isRegistered) {
                await client.sendMessage(formattedNum, message);
                console.log(`✅ Notifikasi pembatalan terkirim ke: ${num}`);
                deliveryResult.sentSuccess++;
            } else {
                console.warn(`⚠️ ${num} - Tidak terdaftar (skip)`);
                deliveryResult.invalidNumbers.push({ number: num, reason: 'Tidak terdaftar di WhatsApp' });
            }
        } catch (err) {
            console.error(`❌ Gagal kirim notifikasi ke ${num}:`, err.message);
            deliveryResult.invalidNumbers.push({ number: num, reason: `Send error: ${err.message}` });
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
    }

    console.log(`\n📊 Hasil Notifikasi Pembatalan:`);
    console.log(`   ✅ Berhasil: ${deliveryResult.sentSuccess} nomor`);
    console.log(`   ❌ Gagal/Skip: ${deliveryResult.invalidNumbers.length} nomor`);
    
    // ✅ Save cancellation delivery result
    saveMeetingDeliveryResult(meeting.id, deliveryResult);
}

module.exports = {
    setWhatsappClient,
    sendWhatsAppReminder,
    scheduleMeetingReminder,
    cancelMeetingJob,
    loadAndScheduleExistingMeetings,
    sendCancellationNotification,
    saveMeetingDeliveryResult
};