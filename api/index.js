// Loads env validation + Express app (JWT_SECRET required on Vercel)
const app = require('../backend/src/server');

module.exports = (req, res) => app(req, res);
