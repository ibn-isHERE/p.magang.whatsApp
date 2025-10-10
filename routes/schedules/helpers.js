// helpers.js - Helper Functions for Schedules

/**
 * Escape string untuk HTML attributes
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parse JSON safely
 * @param {string} jsonString - JSON string
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} - Parsed value or default
 */
function safeJsonParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('JSON parsing error:', e.message);
    return defaultValue;
  }
}

/**
 * Format file size to readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate datetime string
 * @param {string} datetime - Datetime string
 * @returns {boolean} - Is valid
 */
function isValidDatetime(datetime) {
  const date = new Date(datetime);
  return date instanceof Date && !isNaN(date);
}

/**
 * Get schedule status class
 * @param {string} status - Schedule status
 * @returns {string} - CSS class name
 */
function getStatusClass(status) {
  const statusMap = {
    'terkirim': 'status-terkirim',
    'gagal': 'status-gagal',
    'dibatalkan': 'status-dibatalkan',
    'selesai': 'status-selesai',
    'terjadwal': 'status-terjadwal'
  };
  return statusMap[status] || 'status-terjadwal';
}

/**
 * Get schedule status icon
 * @param {string} status - Schedule status
 * @returns {string} - Material icon name
 */
function getStatusIcon(status) {
  const iconMap = {
    'terkirim': 'check_circle',
    'gagal': 'cancel',
    'dibatalkan': 'block',
    'selesai': 'done_all',
    'terjadwal': 'hourglass_empty'
  };
  return iconMap[status] || 'hourglass_empty';
}

/**
 * Clean phone number format
 * @param {string} number - Phone number
 * @returns {string} - Cleaned number
 */
function cleanPhoneNumber(number) {
  if (!number) return '';
  let cleaned = String(number).replace(/\D/g, '');
  if (cleaned.startsWith('62')) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned;
}

/**
 * Format numbers array for display
 * @param {Array|string} numbers - Array of numbers or JSON string
 * @returns {Array} - Formatted numbers array
 */
function formatNumbersForDisplay(numbers) {
  let numbersArray = [];
  
  try {
    if (typeof numbers === 'string') {
      numbersArray = JSON.parse(numbers);
    } else if (Array.isArray(numbers)) {
      numbersArray = numbers;
    }
    
    return numbersArray.map(num => {
      if (typeof num === 'string') {
        let cleanNum = num.replace('@c.us', '');
        if (cleanNum.startsWith('62')) {
          cleanNum = '0' + cleanNum.slice(2);
        }
        return cleanNum;
      }
      return num;
    });
  } catch (e) {
    console.error('Error formatting numbers:', e);
    return [];
  }
}

/**
 * Check if schedule is meeting type
 * @param {Object} schedule - Schedule object
 * @returns {boolean} - Is meeting
 */
function isMeetingSchedule(schedule) {
  return schedule.type === 'meeting' || !!schedule.meetingRoom;
}

/**
 * Generate unique schedule ID
 * @returns {string} - Unique ID
 */
function generateScheduleId() {
  return Date.now().toString();
}

/**
 * Validate file type
 * @param {string} mimetype - File mimetype
 * @returns {boolean} - Is valid
 */
function isValidFileType(mimetype) {
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif',
    'video/mp4', 'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];
  return allowedMimes.includes(mimetype);
}

module.exports = {
  escapeHtml,
  safeJsonParse,
  formatFileSize,
  isValidDatetime,
  getStatusClass,
  getStatusIcon,
  cleanPhoneNumber,
  formatNumbersForDisplay,
  isMeetingSchedule,
  generateScheduleId,
  isValidFileType
};