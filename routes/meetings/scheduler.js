// scheduler.js - Scheduling Module for Meetings

const schedule = require("node-schedule");
const { MessageMedia } = require("whatsapp-web.js");
const fs = require("fs");
const { formatNumber } = require("./validation");
const { dateTimeToEpoch, formatTimeLeft, parseNumbers, isMeetingActive } = require("./helpers");
const { updateMeetingStatus, getDatabase } = require("./dbOperations");

let client = null;
let meetingJobs = {}; // Untuk menyimpan scheduled jobs

/**
 * Set WhatsApp client
 */
function setWhatsappClient(whatsappClient) {
    client = whatsappClient;
    console.log("Meeting scheduler WhatsApp client set");
}

/**
 * Kirim reminder WhatsApp
 */
async function sendWhatsAppReminder(meeting, customTimeLeft = null) {
    if (!client) {
        console.error("Client WA belum siap, skip pengiriman.");
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
        console.error("Gagal parsing JSON numbers di sendWhatsAppReminder:", e);
        return false;
    }

    if (numbersArray.length === 0) return false;

    let medias = [];
    if (meeting.filesData) {
        try {
            const files = JSON.parse(meeting.filesData);
            for (const file of files) {
                if (fs.existsSync(file.path)) {
                    const media = MessageMedia.fromFilePath(file.path);
                    medias.push(media);
                } else {
                    console.warn(`File not found for meeting reminder: ${file.path}`);
                }
            }
        } catch (e) {
            console.error("Gagal memproses filesData untuk reminder:", e);
        }
    }

    let sentSuccess = true;
    for (const num of numbersArray) {
        try {
            const formattedNum = formatNumber(num);
            if (formattedNum) {
                await client.sendMessage(formattedNum, message);
                
                for (const media of medias) {
                    await client.sendMessage(formattedNum, media, { 
                        caption: `Dokumen untuk rapat: ${meeting.meetingTitle}` 
                    });
                }
                console.log("WA reminder rapat terkirim ke:", num);
            }
        } catch (err) {
            console.error(`Gagal kirim WA reminder rapat ke ${num}:`, err.message);
            sentSuccess = false;
        }
    }

    // ✅ UPDATE STATUS DI DATABASE DAN EMIT
    if (sentSuccess) {
        updateMeetingStatus(meeting.id, 'terkirim');
        
        // Emit socket event
        if (global.emitMeetingStatusUpdate) {
            global.emitMeetingStatusUpdate(
                meeting.id, 
                'terkirim', 
                `Pengingat rapat terkirim ke ${numbersArray.length} peserta`
            );
        }
    }

    return sentSuccess;
}

/**
 * Schedule meeting reminder
 */
function scheduleMeetingReminder(meeting) {
    const now = new Date().getTime();
    
    // Gunakan epoch jika tersedia
    let startEpoch;
    if (meeting.start_epoch) {
        startEpoch = meeting.start_epoch;
    } else {
        startEpoch = dateTimeToEpoch(meeting.date, meeting.startTime);
    }
    
    const timeDifference = startEpoch - now;
    const hourInMs = 60 * 60 * 1000;
    
    const jobId = `meeting_${meeting.id}`;
    
    // Cancel existing job
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
        // Cek status terbaru sebelum kirim
        const db = getDatabase();
        db.get(
            "SELECT * FROM meetings WHERE id = ?",
            [meeting.id],
            async (err, row) => {
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
            }
        );
        
        delete meetingJobs[jobId];
    });

    console.log(`Reminder untuk meeting ${meeting.id} dijadwalkan pada ${reminderTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
}

/**
 * Cancel meeting job
 */
function cancelMeetingJob(id) {
    const jobId = `meeting_${id}`;
    if (meetingJobs[jobId]) {
        meetingJobs[jobId].cancel();
        delete meetingJobs[jobId];
        console.log(`Reminder untuk meeting ${id} dibatalkan`);
        return true;
    }
    return false;
}

/**
 * Load dan schedule existing meetings dari database
 */
function loadAndScheduleExistingMeetings() {
    const db = getDatabase();
    
    if (!db) {
        console.error("Database belum diinisialisasi untuk memuat meetings");
        return;
    }

    db.all(
        `SELECT * FROM meetings WHERE status = 'terjadwal' ORDER BY date ASC, startTime ASC`,
        [],
        (err, rows) => {
            if (err) {
                console.error("Gagal load meetings dari DB:", err.message);
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
            
            // Update expired meetings
            const { updateExpiredMeetings } = require('./dbOperations');
            updateExpiredMeetings();
        }
    );
}

/**
 * Kirim notifikasi pembatalan via WhatsApp
 */
async function sendCancellationNotification(meeting) {
    if (!client) {
        console.error("Client WA belum siap, skip pengiriman notifikasi pembatalan.");
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
        console.error("Gagal parsing JSON numbers di sendCancellationNotification:", e);
        return;
    }

    if (!Array.isArray(numbersArray) || numbersArray.length === 0) return;

    for (const num of numbersArray) {
        try {
            const formattedNum = formatNumber(num);
            if (formattedNum) {
                await client.sendMessage(formattedNum, message);
                console.log(`Notifikasi pembatalan rapat terkirim ke: ${num}`);
            }
        } catch (err) {
            console.error(`Gagal kirim notifikasi pembatalan ke ${num}:`, err.message);
        }
    }
}

module.exports = {
    setWhatsappClient,
    sendWhatsAppReminder,
    scheduleMeetingReminder,
    cancelMeetingJob,
    loadAndScheduleExistingMeetings,
    sendCancellationNotification,
};