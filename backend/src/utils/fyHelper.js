/**
 * GST Financial Year Helper (April 1 to March 31)
 * Examples:
 * - Apr 2026 to Mar 2027 -> "2026-27"
 * - Apr 2025 to Mar 2026 -> "2025-26"
 * - Mar 2026 -> "2025-26"
 * - Apr 2026 -> "2026-27"
 */
function getFinancialYear(dateInput = new Date()) {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-indexed: 0 = Jan, 3 = Apr

  const startYear = month >= 3 ? year : year - 1;
  const endYearShort = String(startYear + 1).slice(-2);

  return `${startYear}-${endYearShort}`;
}

module.exports = {
  getFinancialYear
};
