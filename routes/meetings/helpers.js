// helpers.js - Helper Functions for Meetings

/**
 * Convert datetime ke epoch dengan timezone Asia/Jakarta
 */
function dateTimeToEpoch(dateStr, timeStr) {
    // Format: YYYY-MM-DD dan HH:mm
    const isoString = `${dateStr}T${timeStr}:00.000+07:00`;
    return new Date(isoString).getTime();
}

/**
 * Convert epoch ke date dan time dengan timezone Asia/Jakarta
 */
function epochToDateTime(epochMs) {
    const date = new Date(epochMs);
    // Format ke timezone Asia/Jakarta
    const jakartaTime = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date);
    
    const [datePart, timePart] = jakartaTime.split(' ');
    return { date: datePart, time: timePart };
}

/**
 * Parse datetime-local ke epoch dengan timezone Jakarta
 */
function parseDateTime(datetimeLocal) {
    // Input format: YYYY-MM-DDTHH:mm
    const [datePart, timePart] = datetimeLocal.split('T');
    const epoch = dateTimeToEpoch(datePart, timePart);
    return { 
        date: datePart, 
        time: timePart,
        epoch: epoch
    };
}

/**
 * Cek apakah rapat masih aktif
 */
function isMeetingActive(meeting) {
    const now = new Date().getTime();
    
    // Gunakan epoch jika tersedia, fallback ke parsing manual
    let startEpoch, endEpoch;
    
    if (meeting.start_epoch && meeting.end_epoch) {
        startEpoch = meeting.start_epoch;
        endEpoch = meeting.end_epoch;
    } else {
        startEpoch = dateTimeToEpoch(meeting.date, meeting.startTime);
        endEpoch = dateTimeToEpoch(meeting.date, meeting.endTime);
    }

    const isStatusActive = ['terjadwal', 'terkirim'].includes(meeting.status);
    const isTimeActive = now >= startEpoch && now < endEpoch;
    const isScheduledFuture = now < startEpoch;

    return isStatusActive && (isTimeActive || isScheduledFuture);
}

/**
 * Format waktu countdown
 */
function formatTimeLeft(timeDifferenceMs) {
    const hours = Math.floor(timeDifferenceMs / (1000 * 60 * 60));
    const minutes = Math.floor((timeDifferenceMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
        return `${hours} jam ${minutes} menit`;
    } else if (minutes > 0) {
        return `${minutes} menit`;
    } else {
        return "kurang dari 1 menit";
    }
}

/**
 * Parse numbers dari berbagai format
 */
function parseNumbers(numbers) {
    try {
        return Array.isArray(numbers) ? numbers : JSON.parse(numbers);
    } catch (e) {
        console.error("Gagal parsing numbers:", e);
        return [];
    }
}

/**
 * Format numbers untuk display
 */
function formatNumbersForDisplay(storedNumbers) {
    try {
        const numbersArray = parseNumbers(storedNumbers);
        return numbersArray.map(num => {
            // Convert dari format WhatsApp (628xxxxx@c.us) ke display (08xxxxx)
            let cleanNum = String(num).replace('@c.us', '');
            if (cleanNum.startsWith('62')) {
                cleanNum = '0' + cleanNum.substring(2);
            }
            return cleanNum;
        });
    } catch (e) {
        console.error("Error formatting numbers for display:", e);
        return [];
    }
}

/**
 * Parse files data safely
 */
function parseFilesData(filesData) {
    if (!filesData) return [];
    
    try {
        const parsed = JSON.parse(filesData);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("Error parsing files data:", e);
        return [];
    }
}

/**
 * Safe JSON parse
 */
function safeJsonParse(jsonString, defaultValue = null) {
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        return defaultValue;
    }
}

module.exports = {
    dateTimeToEpoch,
    epochToDateTime,
    parseDateTime,
    isMeetingActive,
    formatTimeLeft,
    parseNumbers,
    formatNumbersForDisplay,
    parseFilesData,
    safeJsonParse,
};