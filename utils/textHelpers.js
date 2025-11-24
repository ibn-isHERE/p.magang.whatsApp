/**
 * Convert text to Title Case (huruf besar per kata)
 * Contoh: "tim umum" -> "Tim Umum"
 */
function toTitleCase(text) {
  if (!text || typeof text !== 'string') return text;
  
  return text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normalize text untuk perbandingan case-insensitive
 * Contoh: "Tim Umum" -> "tim umum"
 */
function normalizeForComparison(text) {
  if (!text || typeof text !== 'string') return '';
  return text.trim().toLowerCase();
}

/**
 * Check if two texts are equal (case-insensitive)
 */
function isEqualCaseInsensitive(text1, text2) {
  return normalizeForComparison(text1) === normalizeForComparison(text2);
}

module.exports = {
  toTitleCase,
  normalizeForComparison,
  isEqualCaseInsensitive
};