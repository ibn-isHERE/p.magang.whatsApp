// phone-validator.js - Modul Validasi Nomor Telepon

/**
 * Validasi format nomor telepon Indonesia
 * Format yang diterima:
 * - 08xxxxxxxxxx (min 10 digit, max 15 digit)
 * - +628xxxxxxxxxx
 * - 628xxxxxxxxxx
 * - Tidak boleh ada spasi, tanda kurung, atau karakter khusus lainnya
 */

/**
 * Membersihkan nomor telepon dari karakter non-digit (kecuali +)
 */
function cleanPhoneNumber(number) {
  if (!number) return '';
  return String(number).trim().replace(/[^\d+]/g, '');
}

/**
 * Validasi format nomor telepon Indonesia
 * @param {string} number - Nomor telepon yang akan divalidasi
 * @returns {Object} - { valid: boolean, message: string, cleaned: string }
 */
function validatePhoneNumber(number) {
  const cleaned = cleanPhoneNumber(number);
  
  // Cek nomor kosong
  if (!cleaned) {
    return {
      valid: false,
      message: 'Nomor telepon tidak boleh kosong',
      cleaned: ''
    };
  }

  // Cek panjang minimal dan maksimal
  const digitOnly = cleaned.replace(/\+/g, '');
  if (digitOnly.length < 10) {
    return {
      valid: false,
      message: 'Nomor telepon minimal 10 digit',
      cleaned: cleaned
    };
  }
  
  if (digitOnly.length > 15) {
    return {
      valid: false,
      message: 'Nomor telepon maksimal 15 digit',
      cleaned: cleaned
    };
  }

  // Validasi format Indonesia
  // Format yang valid:
  // 1. 08xxxxxxxxxx
  // 2. +628xxxxxxxxxx
  // 3. 628xxxxxxxxxx
  
  const patterns = [
    /^08\d{8,13}$/,           // 08xxxxxxxxxx
    /^\+628\d{8,13}$/,        // +628xxxxxxxxxx
    /^628\d{8,13}$/           // 628xxxxxxxxxx
  ];

  const isValidFormat = patterns.some(pattern => pattern.test(cleaned));
  
  if (!isValidFormat) {
    return {
      valid: false,
      message: 'Format nomor tidak valid. Gunakan format: 08xx, +628xx, atau 628xx',
      cleaned: cleaned
    };
  }

  // Normalisasi ke format 08xx untuk penyimpanan
  let normalized = cleaned;
  if (normalized.startsWith('+62')) {
    normalized = '0' + normalized.slice(3);
  } else if (normalized.startsWith('62')) {
    normalized = '0' + normalized.slice(2);
  }

  return {
    valid: true,
    message: 'Nomor telepon valid',
    cleaned: cleaned,
    normalized: normalized
  };
}

/**
 * Validasi nomor telepon untuk WhatsApp
 * @param {string} number - Nomor telepon
 * @returns {string|null} - Nomor dalam format WhatsApp (@c.us) atau null jika invalid
 */
function formatForWhatsApp(number) {
  const validation = validatePhoneNumber(number);
  
  if (!validation.valid) {
    return null;
  }

  let formatted = validation.cleaned;
  
  // Convert ke format 62xxx untuk WhatsApp
  if (formatted.startsWith('0')) {
    formatted = '62' + formatted.slice(1);
  } else if (formatted.startsWith('+62')) {
    formatted = formatted.slice(1);
  }

  return formatted + '@c.us';
}

/**
 * Validasi dan format multiple numbers (untuk bulk operations)
 * @param {Array} numbers - Array nomor telepon
 * @returns {Object} - { valid: Array, invalid: Array }
 */
function validateMultipleNumbers(numbers) {
  const results = {
    valid: [],
    invalid: []
  };

  numbers.forEach((number, index) => {
    const validation = validatePhoneNumber(number);
    
    if (validation.valid) {
      results.valid.push({
        original: number,
        cleaned: validation.cleaned,
        normalized: validation.normalized,
        index: index
      });
    } else {
      results.invalid.push({
        original: number,
        message: validation.message,
        index: index
      });
    }
  });

  return results;
}

/**
 * Visual feedback untuk input nomor telepon
 * @param {HTMLInputElement} input - Input element
 * @param {boolean} isValid - Status validasi
 * @param {string} message - Pesan error/success
 */
function showValidationFeedback(input, isValid, message) {
  // Remove existing feedback
  const existingFeedback = input.parentElement.querySelector('.validation-feedback');
  if (existingFeedback) {
    existingFeedback.remove();
  }

  // Update input styling
  input.style.borderColor = isValid ? '#48bb78' : '#f56565';
  input.style.background = isValid ? '#f0fff4' : '#fff5f5';

  // Add feedback message
  const feedback = document.createElement('div');
  feedback.className = 'validation-feedback';
  feedback.style.cssText = `
    margin-top: 4px;
    font-size: 12px;
    color: ${isValid ? '#38a169' : '#e53e3e'};
    display: flex;
    align-items: center;
    gap: 4px;
  `;
  
  const icon = isValid ? '✓' : '✗';
  feedback.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  
  input.parentElement.appendChild(feedback);
}

/**
 * Setup real-time validation untuk input nomor telepon
 * @param {string} inputId - ID dari input element
 */
function setupRealtimeValidation(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener('input', function() {
    const value = this.value.trim();
    
    // Skip validation jika input kosong
    if (!value) {
      this.style.borderColor = '#cbd5e0';
      this.style.background = 'white';
      const existingFeedback = this.parentElement.querySelector('.validation-feedback');
      if (existingFeedback) existingFeedback.remove();
      return;
    }

    const validation = validatePhoneNumber(value);
    showValidationFeedback(this, validation.valid, validation.message);
  });

  // Validation on blur
  input.addEventListener('blur', function() {
    const value = this.value.trim();
    if (!value) return;

    const validation = validatePhoneNumber(value);
    
    if (validation.valid) {
      // Auto-format to normalized version
      this.value = validation.normalized;
    }
  });
}

/**
 * Example usage dalam form submission:
 * 
 * const validation = validatePhoneNumber(inputNumber);
 * if (!validation.valid) {
 *   Swal.fire('Error', validation.message, 'error');
 *   return;
 * }
 * // Gunakan validation.normalized untuk disimpan ke database
 */

/**
 * Contoh integrasi dengan contact-manager.js:
 * 
 * Di handleContactFormSubmit:
 * const numberValidation = validatePhoneNumber(number);
 * if (!numberValidation.valid) {
 *   Swal.fire('Format Nomor Salah', numberValidation.message, 'error');
 *   return;
 * }
 * const normalizedNumber = numberValidation.normalized;
 */

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validatePhoneNumber,
    cleanPhoneNumber,
    formatForWhatsApp,
    validateMultipleNumbers,
    showValidationFeedback,
    setupRealtimeValidation
  };
}

// Browser global export
if (typeof window !== 'undefined') {
  window.PhoneValidator = {
    validatePhoneNumber,
    cleanPhoneNumber,
    formatForWhatsApp,
    validateMultipleNumbers,
    showValidationFeedback,
    setupRealtimeValidation
  };
}