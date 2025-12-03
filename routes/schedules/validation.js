// validation.js - Modul Validasi untuk Schedules

/**
 * Memformat nomor ke format WhatsApp: 62XXXXXXXXXX@c.us
 * @param {string} inputNumber - Nomor yang akan diformat
 * @returns {string|null} - Nomor terformat atau null jika tidak valid
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
 * Memvalidasi nomor telepon
 * @param {Array} numbers - Array nomor telepon
 * @returns {Array} - Array nomor yang tidak valid
 */
function validateNumbers(numbers) {
  return numbers.filter((n) => !/^(0|62)\d{8,13}$/.test(String(n).trim()));
}

/**
 * Memvalidasi waktu jadwal
 * @param {string} datetime - String datetime
 * @returns {Object} - {isValid: boolean, adjustedTime: string, error: string}
 */
function validateScheduleTime(datetime) {
  let reminderTime = new Date(datetime);
  const now = new Date();

  if (isNaN(reminderTime.getTime())) {
    return {
      isValid: false,
      error: "Format tanggal/waktu tidak valid.",
    };
  }

  const timeDifferenceMs = reminderTime.getTime() - now.getTime();
  const oneMinuteInMs = 60 * 1000;

  if (timeDifferenceMs < -oneMinuteInMs) {
    return {
      isValid: false,
      error:
        "Waktu lebih dari 1 menit di masa lalu. Harap pilih waktu yang lebih dekat dengan sekarang atau di masa depan.",
    };
  }

  // Sesuaikan waktu jika di masa lalu tapi dalam 1 menit
  if (reminderTime.getTime() <= now.getTime()) {
    console.log(
      "Waktu pengiriman pesan sekarang atau sedikit di masa lalu, akan segera dikirim."
    );
    reminderTime.setSeconds(now.getSeconds() + 1);
    datetime = reminderTime.toISOString();
  }

  return {
    isValid: true,
    adjustedTime: datetime,
  };
}

/**
 * Memvalidasi input reminder
 * @param {string} numbers - Nomor kontak
 * @param {string} message - Pesan
 * @param {string} datetime - Waktu jadwal
 * @param {Array} uploadedFiles - File yang diupload
 * @returns {string|null} - Error message atau null
 */
function validateReminderInput(numbers, message, datetime, uploadedFiles) {
  if (!numbers) return "Nomor kontak harus diisi.";
  if (!datetime) return "Waktu jadwal tidak boleh kosong.";

  if (!message && (!uploadedFiles || uploadedFiles.length === 0)) {
    return "Pesan atau setidaknya satu file harus disediakan.";
  }

  return null;
}

/**
 * Mem-parse dan memvalidasi nomor
 * @param {string} numbers - JSON string berisi array nomor
 * @returns {Object} - {validNumbers: Array, error: string}
 */
function parseAndValidateNumbers(numbers) {
  try {
    const parsedNumbers = JSON.parse(numbers);

    if (!Array.isArray(parsedNumbers) || parsedNumbers.length === 0) {
      return {
        error:
          "Nomor kontak harus dalam format array JSON dan tidak boleh kosong.",
      };
    }

    const invalidNumbers = validateNumbers(parsedNumbers);
    if (invalidNumbers.length > 0) {
      return {
        error: `Nomor tidak valid: ${invalidNumbers.join(
          ", "
        )}. Pastikan format 08xxxxxxxxxx atau 628xxxxxxxxxx.`,
      };
    }

    return { validNumbers: parsedNumbers };
  } catch (e) {
    console.error("Kesalahan parsing nomor:", e.message);
    return { error: "Format nomor tidak valid. Harus berupa array JSON." };
  }
}

module.exports = {
  formatNumber,
  validateNumbers,
  validateScheduleTime,
  validateReminderInput,
  parseAndValidateNumbers,
};