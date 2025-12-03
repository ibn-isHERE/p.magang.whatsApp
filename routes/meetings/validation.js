// validation.js - Modul Validasi untuk Meetings

// Ruangan yang tersedia
const ROOMS = [
  "Aula Lantai 3",
  "Ruang Sungkai", 
  "Ruang Distribusi",
  "Ruang Garda SE",
  "Ruang PST",
];

/**
 * Memformat nomor ke format WhatsApp: 62XXXXXXXXXX@c.us
 */
function formatNumber(inputNumber) {
    let number = String(inputNumber).trim();
    number = number.replace(/\D/g, "");

    if (number.startsWith("0")) {
        number = "62" + number.slice(1);
    }

    if (!/^62\d{8,13}$/.test(number)) {
        console.warn(`Format nomor tidak valid: ${inputNumber} -> ${number}`);
        return null;
    }
    return number + "@c.us";
}

/**
 * Mengkonversi waktu ke menit untuk perhitungan overlap
 */
function timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(":").map(Number);
    return hours * 60 + minutes;
}

/**
 * Mengecek overlap waktu
 */
function checkTimeOverlap(start1, end1, start2, end2) {
    const start1Min = timeToMinutes(start1);
    const end1Min = timeToMinutes(end1);
    const start2Min = timeToMinutes(start2);
    const end2Min = timeToMinutes(end2);

    return start1Min < end2Min && start2Min < end1Min;
}

/**
 * Memvalidasi input meeting
 */
function validateMeetingInput(meetingTitle, numbers, meetingRoom, startTime, endTime) {
    if (!meetingTitle || !numbers || !meetingRoom || !startTime || !endTime) {
        return "Semua field harus diisi";
    }

    if (!ROOMS.includes(meetingRoom)) {
        return "Ruangan tidak valid";
    }

    // Import dari helpers untuk parsing
    const { parseDateTime } = require('./helpers');
    const startParsed = parseDateTime(startTime);
    const endParsed = parseDateTime(endTime);

    if (endParsed.epoch <= startParsed.epoch) {
        return "Waktu selesai harus lebih besar dari waktu mulai";
    }

    const durationMinutes = (endParsed.epoch - startParsed.epoch) / (1000 * 60);
    if (durationMinutes < 15) {
        return "Durasi rapat minimal 15 menit";
    }

    const now = new Date().getTime();
    if (startParsed.epoch <= now) {
        return "Waktu rapat harus di masa depan";
    }

    // Validasi format nomor
    let numbersArray;
    try {
        numbersArray = Array.isArray(numbers) ? numbers : JSON.parse(numbers);
        if (!Array.isArray(numbersArray) || numbersArray.length === 0) {
            throw new Error("Numbers harus berupa array dan tidak boleh kosong");
        }
    } catch (e) {
        return "Format nomor tidak valid";
    }

    const invalidNumbers = numbersArray.filter(
        (n) => !/^(0|62)\d{8,13}$/.test(String(n).trim().replace(/\D/g, ""))
    );
    
    if (invalidNumbers.length > 0) {
        return `Nomor tidak valid: ${invalidNumbers.join(", ")}. Pastikan format 08xxxxxxxxxx atau 628xxxxxxxxxx`;
    }

    return null; // Valid
}

/**
 * Mengecek konflik ruangan
 */
function checkRoomConflict(db, date, startTime, endTime, meetingRoom, excludeId = null) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database tidak tersedia"));
            return;
        }

        let query = `
            SELECT * FROM meetings 
            WHERE meetingRoom = ? AND date = ? AND status IN ('terjadwal', 'terkirim')
        `;
        let params = [meetingRoom, date];

        if (excludeId) {
            query += ` AND id != ?`;
            params.push(excludeId);
        }

        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            const conflictingMeeting = rows.find(meeting => 
                checkTimeOverlap(startTime, endTime, meeting.startTime, meeting.endTime)
            );

            resolve(conflictingMeeting);
        });
    });
}

module.exports = {
    ROOMS,
    formatNumber,
    timeToMinutes,
    checkTimeOverlap,
    validateMeetingInput,
    checkRoomConflict,
};