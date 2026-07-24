import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Toast from '../../components/ui/Toast';
import { apiRequest } from '../../services/api';
import { formatCurrency } from '../../services/calcService';
import { exportToExcel } from '../../services/excelService';
import { useAuth } from '../../context/AuthContext';
import { BarChart3, FileSpreadsheet, Download, Calendar, Filter, Printer, Database, FileText, HardDrive, Package, ShoppingBag, RotateCcw } from 'lucide-react';

export default function ReportsPage() {
  const { isAdmin } = useAuth();
  const [reportType, setReportType] = useState('sales'); // 'sales', 'inventory', 'profit'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [lastBackupTime, setLastBackupTime] = useState(() => localStorage.getItem('prabhuratna_last_backup') || 'Never');
  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      let endpoint = `/reports/${reportType}?`;
      if (startDate) endpoint += `startDate=${startDate}&`;
      if (endDate) endpoint += `endDate=${endDate}&`;

      const res = await apiRequest(endpoint);
      if (res.success) {
        setReportData(res.sales || res.inventory || res.profitData || []);
        setSummary(res.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, startDate, endDate]);

  const handleExportExcel = () => {
    if (reportData.length === 0) {
      setToast({ isOpen: true, type: 'warning', message: 'No data to export' });
      return;
    }
    exportToExcel(reportData, `${reportType}_report`);
    setToast({ isOpen: true, type: 'success', message: 'Excel report downloaded!' });
  };

  const handleDownloadBackup = async () => {
    try {
      const token = localStorage.getItem('prabhuratna_token');
      const rawBaseUrl = import.meta.env.VITE_API_URL || '/api';
      const cleanBase = rawBaseUrl.replace(/\/+$/, '');

      const response = await fetch(`${cleanBase}/backup/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Backup download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prabhuratna_backup_${new Date().toISOString().slice(0,10)}.sqlite`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      const timestamp = new Date().toLocaleString('en-IN');
      localStorage.setItem('prabhuratna_last_backup', timestamp);
      setLastBackupTime(timestamp);
      setToast({ isOpen: true, type: 'success', message: 'Full database backup downloaded!' });
    } catch (err) {
      setToast({ isOpen: true, type: 'danger', message: 'Failed to download database backup' });
    }
  };

  const handleDownloadCSV = async (type) => {
    try {
      const token = localStorage.getItem('prabhuratna_token');
      const rawBaseUrl = import.meta.env.VITE_API_URL || '/api';
      const cleanBase = rawBaseUrl.replace(/\/+$/, '');

      const response = await fetch(`${cleanBase}/backup/export-csv?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('CSV export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prabhuratna_${type}_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setToast({ isOpen: true, type: 'success', message: `Exported ${type} to CSV!` });
    } catch (err) {
      setToast({ isOpen: true, type: 'danger', message: `Failed to export ${type} CSV` });
    }
  };

  const getColumns = () => {
    if (reportType === 'sales') {
      return [
        { header: 'Invoice Number', accessor: 'invoice_number' },
        {
          header: 'Date',
          render: (row) => new Date(row.created_at).toLocaleDateString('en-IN')
        },
        { header: 'Customer', accessor: 'customer_name' },
        { header: 'Payment Mode', render: (row) => <Badge variant="info">{row.payment_mode}</Badge> },
        { header: 'Tax (GST)', render: (row) => formatCurrency(row.tax_amount) },
        { header: 'Discount', render: (row) => formatCurrency(row.discount_amount) },
        { header: 'Grand Total', render: (row) => <span className="font-bold text-[#C0392B] dark:text-[#E74C3C]">{formatCurrency(row.grand_total)}</span> }
      ];
    } else if (reportType === 'inventory') {
      return [
        { header: 'Product Name', accessor: 'name' },
        { header: 'Barcode', accessor: 'barcode' },
        { header: 'SKU', accessor: 'sku' },
        { header: 'Stock Qty', render: (row) => <span className="font-bold">{row.stock_quantity}</span> },
        { header: 'Cost Valuation', render: (row) => formatCurrency(row.cost_value) },
        { header: 'Retail Valuation', render: (row) => <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatCurrency(row.retail_value)}</span> }
      ];
    } else {
      return [
        { header: 'Product Name', accessor: 'product_name' },
        { header: 'Units Sold', accessor: 'total_sold' },
        { header: 'Total Cost', render: (row) => formatCurrency(row.total_cost) },
        { header: 'Total Revenue', render: (row) => formatCurrency(row.total_revenue) },
        { header: 'Gross Profit', render: (row) => <span className={`font-extrabold ${(row.gross_profit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{formatCurrency(row.gross_profit || 0)}</span> },
        { header: 'Margin %', render: (row) => <Badge variant={(row.gross_profit || 0) >= 0 ? 'success' : 'danger'}>{(Number(row.profit_margin_percent) || 0).toFixed(1)}%</Badge> }
      ];
    }
  };

  return (
    <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#C0392B] dark:text-[#E74C3C]" /> Business Reports & Export Engine
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">Filter sales, inventory, and profit reports with 1-click Excel & database export</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => window.print()} variant="secondary" icon={Printer}>
            Print Report
          </Button>
          <Button onClick={handleExportExcel} variant="success" icon={FileSpreadsheet}>
            Export to Excel (.xlsx)
          </Button>
        </div>
      </div>

      {/* Admin Backup & Data Export Control Panel */}
      {isAdmin && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-[#2D3138]">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2">
                <Database className="w-4 h-4 text-[#C0392B] dark:text-[#E74C3C]" /> Backup & Raw Data Export (Admin Only)
              </h3>
              <p className="text-xs text-slate-500">Download full SQLite database binary or export individual modules into CSV spreadsheet sheets</p>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-100 dark:bg-[#121417] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#2D3138]">
              <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
              <span>Last Manual Backup: <strong className="text-slate-900 dark:text-white">{lastBackupTime}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <Button onClick={handleDownloadBackup} variant="primary" icon={Database}>
              Full Database (.sqlite)
            </Button>
            <Button onClick={() => handleDownloadCSV('products')} variant="secondary" icon={Package}>
              Products CSV
            </Button>
            <Button onClick={() => handleDownloadCSV('invoices')} variant="secondary" icon={FileText}>
              Invoices CSV
            </Button>
            <Button onClick={() => handleDownloadCSV('purchases')} variant="secondary" icon={ShoppingBag}>
              Purchases CSV
            </Button>
            <Button onClick={() => handleDownloadCSV('returns')} variant="secondary" icon={RotateCcw}>
              Returns CSV
            </Button>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] grid grid-cols-1 sm:grid-cols-4 gap-4 shadow-sm">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF] mb-1">Report Category</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full p-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1] focus:outline-none focus:border-[#C0392B] dark:focus:border-[#E74C3C]"
          >
            <option value="sales">Sales & Revenue Report</option>
            <option value="inventory">Inventory Stock Valuation Report</option>
            <option value="profit">Product Profitability Report</option>
          </select>
        </div>

        <Input
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <Input
          label="End Date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        <div className="flex items-end">
          <Button
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            variant="ghost"
            fullWidth
          >
            Reset Filters
          </Button>
        </div>
      </div>

      {/* Summary KPI Panel */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {reportType === 'sales' && (
            <>
              <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
                <p className="text-xs text-slate-500 dark:text-[#9CA3AF] font-bold uppercase">Total Invoices</p>
                <p className="text-xl font-extrabold text-slate-900 dark:text-[#F1F1F1] mt-1">{summary.totalCount ?? summary.invoiceCount ?? 0}</p>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
                <p className="text-xs text-slate-500 dark:text-[#9CA3AF] font-bold uppercase">Total GST Tax</p>
                <p className="text-xl font-extrabold text-[#C0392B] dark:text-[#E74C3C] mt-1">{formatCurrency(summary.totalTax || 0)}</p>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
                <p className="text-xs text-slate-500 dark:text-[#9CA3AF] font-bold uppercase">Total Revenue</p>
                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(summary.totalRevenue ?? summary.totalSales ?? 0)}</p>
              </div>
            </>
          )}

          {reportType === 'inventory' && (
            <>
              <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
                <p className="text-xs text-slate-500 dark:text-[#9CA3AF] font-bold uppercase">Total Items In Stock</p>
                <p className="text-xl font-extrabold text-slate-900 dark:text-[#F1F1F1] mt-1">{summary.totalUnits ?? summary.totalStock ?? 0}</p>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
                <p className="text-xs text-slate-500 dark:text-[#9CA3AF] font-bold uppercase">Total Cost Valuation</p>
                <p className="text-xl font-extrabold text-[#C0392B] dark:text-[#E74C3C] mt-1">{formatCurrency(summary.totalCostValuation || 0)}</p>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
                <p className="text-xs text-slate-500 dark:text-[#9CA3AF] font-bold uppercase">Retail Stock Potential</p>
                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(summary.totalRetailValuation || 0)}</p>
              </div>
            </>
          )}

          {reportType === 'profit' && (
            <>
              <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
                <p className="text-xs text-slate-500 dark:text-[#9CA3AF] font-bold uppercase">Total Sales Revenue</p>
                <p className="text-xl font-extrabold text-slate-900 dark:text-[#F1F1F1] mt-1">{formatCurrency(summary.totalRevenue || 0)}</p>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
                <p className="text-xs text-slate-500 dark:text-[#9CA3AF] font-bold uppercase">Total Cost of Goods</p>
                <p className="text-xl font-extrabold text-rose-500 mt-1">{formatCurrency(summary.totalCost || 0)}</p>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
                <p className="text-xs text-slate-500 dark:text-[#9CA3AF] font-bold uppercase">Overall Gross Profit</p>
                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(summary.totalGrossProfit ?? summary.totalProfit ?? 0)}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Reports Data Table */}
      <DataTable
        columns={getColumns()}
        data={reportData}
        isLoading={isLoading}
        emptyMessage="No report data matches selected filters"
      />

      <Toast
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </div>
  );
}
