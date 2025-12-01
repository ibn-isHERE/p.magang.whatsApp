// scheduler.js - COMPLETE: With safe delays and batching for meetings

const schedule = require("node-schedule");
const { MessageMedia } = require("whatsapp-web.js");
const fs = require("fs");
const { formatNumber } = require("./validation");
const { dateTimeToEpoch, formatTimeLeft, parseNumbers, isMeetingActive } = require("./helpers");
const { updateMeetingStatus, getDatabase } = require("./dbOperations");

let client = null;
let meetingJobs = {};

// KONFIGURASI DELAY - SESUAIKAN SESUAI KEBUTUHAN
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
 * Generate random delay dalam range
 */
function getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep dengan random delay
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Log progress pengiriman
 */
function logProgress(current, total, type = 'pesan') {
    const percentage = Math.round((current / total) * 100);
    console.log(`Progress: ${current}/${total} ${type} (${percentage}%)`);
}

function setWhatsappClient(whatsappClient) {
    client = whatsappClient;
    console.log("Meeting scheduler WhatsApp client set");
}

/**
 * Save meeting delivery result to database
 */
function saveMeetingDeliveryResult(meetingId, deliveryResult) {
    const db = getDatabase();
    
    if (!db) {
        console.error('Database not available for saving delivery result');
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
                console.error('Failed to save meeting delivery result:', err);
            } else {
                console.log(`Meeting delivery result saved for ${meetingId}`);
            }
        }
    );
}

/**
 * ENHANCED: sendWhatsAppReminder dengan safe delays dan batching
 */
async function sendWhatsAppReminder(meeting, customTimeLeft = null) {
    if (!client) {
        console.error("Client WA belum siap, skip pengiriman.");
        return false;
    }

    const meetingTimeStr = `${meeting.date} ${meeting.startTime}-${meeting.endTime}`;
    const timeLeftMessage = customTimeLeft || "1 jam";
    const message =
        `*PENGINGAT RAPAT*\n\n` +
        `*Judul:* ${meeting.meetingTitle}\n` +
        `*Ruangan:* ${meeting.meetingRoom}\n` +
        `*Waktu:* ${meetingTimeStr}\n\n` +
        `Rapat akan dimulai dalam *${timeLeftMessage}* lagi!`;

    let numbersArray = [];
    try {
        numbersArray = parseNumbers(meeting.numbers);
    } catch (e) {
        console.error("Gagal parsing JSON numbers:", e);
        return false;
    }

    if (numbersArray.length === 0) {
        console.warn("Tidak ada nomor untuk meeting reminder");
        return false;
    }

    // Track delivery result
    const deliveryResult = {
        total: numbersArray.length,
        validatedNumbers: [],
        invalidNumbers: [],
        sentSuccess: 0,
        sentFailed: 0
    };

    // STEP 1: Validasi nomor dengan delay aman
    console.log(`\nMemvalidasi ${numbersArray.length} nomor untuk meeting ${meeting.id}...`);
    console.log(`Estimasi waktu validasi: ~${Math.round((numbersArray.length * DELAY_CONFIG.VALIDATION_DELAY) / 1000)} detik\n`);

    for (let i = 0; i < numbersArray.length; i++) {
        const num = numbersArray[i];
        const formattedNum = formatNumber(num);
        
        if (!formattedNum) {
            console.warn(`Format nomor tidak valid: ${num}`);
            deliveryResult.invalidNumbers.push({ number: num, reason: 'Format tidak valid' });
            continue;
        }

        try {
            const isRegistered = await client.isRegisteredUser(formattedNum);
            
            if (isRegistered) {
                deliveryResult.validatedNumbers.push({ original: num, formatted: formattedNum });
                console.log(`[${i+1}/${numbersArray.length}] ${num} - Valid & Terdaftar`);
            } else {
                deliveryResult.invalidNumbers.push({ number: num, reason: 'Tidak terdaftar di WhatsApp' });
                console.warn(`[${i+1}/${numbersArray.length}] ${num} - Tidak terdaftar di WhatsApp`);
            }
        } catch (error) {
            console.error(`[${i+1}/${numbersArray.length}] Error validasi ${num}:`, error.message);
            deliveryResult.invalidNumbers.push({ number: num, reason: `Error: ${error.message}` });
        }

        // Delay antar validasi
        if (i < numbersArray.length - 1) {
            await sleep(DELAY_CONFIG.VALIDATION_DELAY);
        }
    }

    console.log(`\nHasil Validasi Meeting ${meeting.id}:`);
    console.log(`   Valid: ${deliveryResult.validatedNumbers.length} nomor`);
    console.log(`   Invalid: ${deliveryResult.invalidNumbers.length} nomor`);

    if (deliveryResult.validatedNumbers.length === 0) {
        console.error(`Semua nomor tidak valid untuk meeting ${meeting.id}`);
        saveMeetingDeliveryResult(meeting.id, deliveryResult);
        return false;
    }

    // STEP 2: Persiapkan media files
    let medias = [];
    if (meeting.filesData) {
        try {
            const files = JSON.parse(meeting.filesData);
            for (const file of files) {
                if (fs.existsSync(file.path)) {
                    const media = MessageMedia.fromFilePath(file.path);
                    medias.push(media);
                    console.log(`File dimuat: ${file.name}`);
                } else {
                    console.warn(`File not found: ${file.path}`);
                }
            }
        } catch (e) {
            console.error("Gagal memproses filesData:", e);
        }
    }

    // STEP 3: Kirim dengan safe delays dan batching
    console.log(`\nMengirim reminder meeting ke ${deliveryResult.validatedNumbers.length} nomor valid...`);
    
    const totalRecipients = deliveryResult.validatedNumbers.length;
    const avgDelay = (DELAY_CONFIG.MESSAGE_DELAY_MIN + DELAY_CONFIG.MESSAGE_DELAY_MAX) / 2 / 1000;
    const totalBatches = Math.ceil(totalRecipients / DELAY_CONFIG.BATCH_SIZE);
    const estimatedTime = (totalRecipients * avgDelay) + ((totalBatches - 1) * DELAY_CONFIG.BATCH_PAUSE / 1000);
    
    console.log(`Estimasi waktu pengiriman: ~${Math.round(estimatedTime / 60)} menit`);
    console.log(`Total batch: ${totalBatches} (${DELAY_CONFIG.BATCH_SIZE} pesan/batch)\n`);

    for (let i = 0; i < deliveryResult.validatedNumbers.length; i++) {
        const { original, formatted } = deliveryResult.validatedNumbers[i];
        const recipientNum = i + 1;

        try {
            // Kirim pesan teks
            await client.sendMessage(formatted, message);
            console.log(`[${recipientNum}/${totalRecipients}] Reminder terkirim ke: ${original}`);
            
            // Delay antar file yang lebih pendek
            if (medias.length > 0) {
                for (let j = 0; j < medias.length; j++) {
                    const media = medias[j];
                    const fileDelay = getRandomDelay(DELAY_CONFIG.FILE_DELAY_MIN, DELAY_CONFIG.FILE_DELAY_MAX);
                    
                    await sleep(fileDelay);
                    
                    await client.sendMessage(formatted, media, { 
                        caption: `Dokumen untuk rapat: ${meeting.meetingTitle}` 
                    });
                    console.log(`   File ${j+1}/${medias.length} terkirim ke: ${original}`);
                }
            }
            
            deliveryResult.sentSuccess++;
            
            // Log progress setiap 10 pesan
            if (recipientNum % 10 === 0) {
                logProgress(recipientNum, totalRecipients);
            }
            
            // BATCH PAUSE: Pause setiap N pesan
            if (recipientNum % DELAY_CONFIG.BATCH_SIZE === 0 && recipientNum < totalRecipients) {
                const remainingBatches = Math.ceil((totalRecipients - recipientNum) / DELAY_CONFIG.BATCH_SIZE);
                console.log(`\n=== BATCH PAUSE ===`);
                console.log(`   Terkirim: ${recipientNum}/${totalRecipients}`);
                console.log(`   Pause ${DELAY_CONFIG.BATCH_PAUSE / 60000} menit...`);
                console.log(`   Sisa batch: ${remainingBatches}\n`);
                
                await sleep(DELAY_CONFIG.BATCH_PAUSE);
                
                console.log(`Melanjutkan pengiriman...\n`);
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
            console.error(`[${recipientNum}/${totalRecipients}] Gagal kirim ke ${original}:`, err.message);
            
            deliveryResult.sentFailed++;
            deliveryResult.invalidNumbers.push({ 
                number: original, 
                reason: `Send error: ${err.message}` 
            });
            
            // Delay lebih lama setelah error
            await sleep(DELAY_CONFIG.MESSAGE_DELAY_MAX);
        }
    }

    const totalFailed = deliveryResult.sentFailed + deliveryResult.invalidNumbers.filter(
        item => !item.reason.includes('Tidak terdaftar')
    ).length;

    // SAVE delivery result to database
    saveMeetingDeliveryResult(meeting.id, deliveryResult);

    const hasSuccess = deliveryResult.sentSuccess > 0;
    
    if (hasSuccess) {
        updateMeetingStatus(meeting.id, 'terkirim');
        
        if (global.emitMeetingStatusUpdate) {
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
        console.log(`Meeting ${meeting.id} dimulai dalam ${timeLeft}, kirim reminder langsung`);

        sendWhatsAppReminder(meeting, timeLeft).then((success) => {
            if (success) {
                updateMeetingStatus(meeting.id, 'terkirim');
            }
        });
        return;
    }

    // Jika sudah lewat, skip
    if (timeDifference <= 0) {
        console.log(`Meeting ${meeting.id} sudah lewat, tidak dijadwalkan`);
        return;
    }

    // Schedule 1 jam sebelumnya
    const reminderEpoch = startEpoch - hourInMs;
    const reminderTime = new Date(reminderEpoch);
    
    if (reminderEpoch < now) {
        console.log(`Reminder untuk meeting ${meeting.id} sudah lewat`);
        return;
    }

    meetingJobs[jobId] = schedule.scheduleJob(reminderTime, async () => {
        const db = getDatabase();
        db.get("SELECT * FROM meetings WHERE id = ?", [meeting.id], async (err, row) => {
            if (err || !row) {
                console.error(`Error checking status for meeting ${meeting.id}`);
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

    console.log(`Reminder meeting ${meeting.id} dijadwalkan: ${reminderTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
}

function cancelMeetingJob(id) {
    const jobId = `meeting_${id}`;
    if (meetingJobs[jobId]) {
        meetingJobs[jobId].cancel();
        delete meetingJobs[jobId];
        console.log(`Reminder meeting ${id} dibatalkan`);
        return true;
    }
    return false;
}

function loadAndScheduleExistingMeetings() {
    const db = getDatabase();
    
    if (!db) {
        console.error("Database belum diinisialisasi");
        return;
    }

    db.all(
        `SELECT * FROM meetings WHERE status = 'terjadwal' ORDER BY date ASC, startTime ASC`,
        [],
        (err, rows) => {
            if (err) {
                console.error("Gagal load meetings:", err.message);
                return;
            }

            console.log(`Ditemukan ${rows.length} meeting terjadwal`);

            let scheduledCount = 0;
            rows.forEach((meeting) => {
                if (isMeetingActive(meeting)) {
                    scheduleMeetingReminder(meeting);
                    scheduledCount++;
                }
            });

            console.log(`${scheduledCount} meeting reminder berhasil dijadwalkan`);
            
            const { updateExpiredMeetings } = require('./dbOperations');
            updateExpiredMeetings();
        }
    );
}

/**
 * ENHANCED: Notifikasi pembatalan dengan safe delays
 */
async function sendCancellationNotification(meeting) {
    if (!client) {
        console.error("Client WA belum siap");
        return;
    }

    const message =
        `*PEMBERITAHUAN PEMBATALAN RAPAT*\n\n` +
        `Rapat dengan detail berikut telah dibatalkan:\n` +
        `*Judul:* ${meeting.meetingTitle}\n` +
        `*Ruangan:* ${meeting.meetingRoom}\n` +
        `*Waktu Semula:* ${meeting.date} pukul ${meeting.startTime}\n\n` +
        `Mohon maaf atas ketidaknyamanannya.`;

    let numbersArray = [];
    try {
        numbersArray = parseNumbers(meeting.numbers);
    } catch (e) {
        console.error("Gagal parsing numbers:", e);
        return;
    }

    if (!Array.isArray(numbersArray) || numbersArray.length === 0) return;

    // Track cancellation delivery
    const deliveryResult = {
        total: numbersArray.length,
        validatedNumbers: [],
        sentSuccess: 0,
        invalidNumbers: []
    };

    console.log(`\nMemvalidasi ${numbersArray.length} nomor untuk notifikasi pembatalan...`);
    console.log(`Estimasi waktu: ~${Math.round((numbersArray.length * (DELAY_CONFIG.VALIDATION_DELAY + DELAY_CONFIG.MESSAGE_DELAY_MIN)) / 1000)} detik\n`);

    for (let i = 0; i < numbersArray.length; i++) {
        const num = numbersArray[i];
        const recipientNum = i + 1;
        
        const formattedNum = formatNumber(num);
        if (!formattedNum) {
            console.warn(`[${recipientNum}/${numbersArray.length}] Format nomor tidak valid: ${num}`);
            deliveryResult.invalidNumbers.push({ number: num, reason: 'Format tidak valid' });
            continue;
        }

        try {
            // Validasi + delay
            await sleep(DELAY_CONFIG.VALIDATION_DELAY);
            
            const isRegistered = await client.isRegisteredUser(formattedNum);
            
            if (isRegistered) {
                deliveryResult.validatedNumbers.push({ original: num, formatted: formattedNum });
                
                // Random delay sebelum kirim
                const sendDelay = getRandomDelay(
                    DELAY_CONFIG.MESSAGE_DELAY_MIN, 
                    DELAY_CONFIG.MESSAGE_DELAY_MAX
                );
                await sleep(sendDelay);
                
                await client.sendMessage(formattedNum, message);
                console.log(`[${recipientNum}/${numbersArray.length}] Notifikasi pembatalan terkirim ke: ${num}`);
                deliveryResult.sentSuccess++;
                
                // Log progress
                if (recipientNum % 10 === 0) {
                    logProgress(recipientNum, numbersArray.length, 'notifikasi');
                }
                
                // Batch pause untuk notifikasi pembatalan
                if (recipientNum % DELAY_CONFIG.BATCH_SIZE === 0 && recipientNum < numbersArray.length) {
                    console.log(`\nBatch pause ${DELAY_CONFIG.BATCH_PAUSE / 60000} menit...\n`);
                    await sleep(DELAY_CONFIG.BATCH_PAUSE);
                }
                
            } else {
                console.warn(`[${recipientNum}/${numbersArray.length}] ${num} - Tidak terdaftar (skip)`);
                deliveryResult.invalidNumbers.push({ number: num, reason: 'Tidak terdaftar di WhatsApp' });
            }
        } catch (err) {
            console.error(`[${recipientNum}/${numbersArray.length}] Gagal kirim notifikasi ke ${num}:`, err.message);
            deliveryResult.invalidNumbers.push({ number: num, reason: `Send error: ${err.message}` });
            
            await sleep(DELAY_CONFIG.MESSAGE_DELAY_MAX);
        }
    }
    
    // Save cancellation delivery result
    saveMeetingDeliveryResult(meeting.id, deliveryResult);
}

module.exports = {
    setWhatsappClient,
    sendWhatsAppReminder,
    scheduleMeetingReminder,
    cancelMeetingJob,
    loadAndScheduleExistingMeetings,
    sendCancellationNotification,
    saveMeetingDeliveryResult,
    DELAY_CONFIG // Export untuk testing/debugging
};