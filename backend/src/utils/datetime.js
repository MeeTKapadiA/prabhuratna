/**
 * App datetime helpers — shop runs on the machine's local clock (IST on store PCs).
 * SQLite CURRENT_TIMESTAMP is UTC; we use datetime('now','localtime') instead.
 */

const pad = (n) => String(n).padStart(2, '0');

/** SQL expression for local wall-clock datetime */
const SQL_NOW = "datetime('now', 'localtime')";

/** SQL expression for local calendar date */
const SQL_TODAY = "date('now', 'localtime')";

/** Local YYYY-MM-DD HH:MM:SS from the Node process clock */
function nowLocalSql() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Local YYYY-MM-DD from the Node process clock */
function todayLocalSql() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

module.exports = {
  SQL_NOW,
  SQL_TODAY,
  nowLocalSql,
  todayLocalSql
};
