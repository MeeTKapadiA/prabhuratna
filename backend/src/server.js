const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { isProduction, port, allowedOrigins } = require('./config/env');
require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const billingRoutes = require('./routes/billingRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const returnRoutes = require('./routes/returnRoutes');
const backupRoutes = require('./routes/backupRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const customerRoutes = require('./routes/customerRoutes');
const creditNoteRoutes = require('./routes/creditNoteRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const cashbookRoutes = require('./routes/cashbookRoutes');
const auditRoutes = require('./routes/auditRoutes');
const { apiLimiter } = require('./middleware/rateLimit');

const app = express();
const PORT = port;

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

const corsOptions = {
  origin: (origin, callback) => {
    // Non-browser / same-server calls (no Origin header)
    if (!origin) return callback(null, true);

    // Local development: allow all origins
    if (!isProduction) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/invoices', billingRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/credit-notes', creditNoteRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/cashbook', cashbookRoutes);
app.use('/api/audit', auditRoutes);

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Prabhuratna Metals - Backend API Server',
    apiUrl: '/api',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/login'
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Prabhuratna Metals - Billing & Inventory Management System',
    timestamp: new Date().toISOString()
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
