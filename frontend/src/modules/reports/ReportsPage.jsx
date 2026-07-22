import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Toast from '../../components/ui/Toast';
import { apiRequest } from '../../services/api';
import { formatCurrency } from '../../services/calcService';
import { exportToExcel } from '../../services/excelService';
import { BarChart3, FileSpreadsheet, Download, Calendar, Filter } from 'lucide-react';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('sales'); // 'sales', 'inventory', 'profit'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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
        { header: 'Grand Total', render: (row) => <span className="font-bold text-sky-400">{formatCurrency(row.grand_total)}</span> }
      ];
    } else if (reportType === 'inventory') {
      return [
        { header: 'Product Name', accessor: 'name' },
        { header: 'Barcode', accessor: 'barcode' },
        { header: 'SKU', accessor: 'sku' },
        { header: 'Stock Qty', render: (row) => <span className="font-bold">{row.stock_quantity}</span> },
        { header: 'Cost Valuation', render: (row) => formatCurrency(row.cost_value) },
        { header: 'Retail Valuation', render: (row) => <span className="text-emerald-400 font-semibold">{formatCurrency(row.retail_value)}</span> }
      ];
    } else {
      return [
        { header: 'Product Name', accessor: 'product_name' },
        { header: 'Units Sold', accessor: 'total_sold' },
        { header: 'Total Cost', render: (row) => formatCurrency(row.total_cost) },
        { header: 'Total Revenue', render: (row) => formatCurrency(row.total_revenue) },
        { header: 'Gross Profit', render: (row) => <span className="font-extrabold text-emerald-400">{formatCurrency(row.gross_profit)}</span> },
        { header: 'Margin %', render: (row) => <Badge variant="success">{row.profit_margin_percent.toFixed(1)}%</Badge> }
      ];
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-400" /> Business Reports & Export Engine
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Filter sales, inventory, and profit reports with 1-click Excel export</p>
        </div>

        <Button onClick={handleExportExcel} variant="success" icon={FileSpreadsheet}>
          Export to Excel (.xlsx)
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Report Category</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-sky-500"
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
            variant="secondary"
            fullWidth
            icon={Filter}
          >
            Reset Filters
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {reportType === 'sales' && (
            <>
              <div className="glass-panel p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Total Invoices</p>
                <p className="text-xl font-bold text-slate-100 mt-1">{summary.invoiceCount}</p>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Total Tax Collected (GST)</p>
                <p className="text-xl font-bold text-sky-400 mt-1">{formatCurrency(summary.totalTax)}</p>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Total Sales Revenue</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(summary.totalSales)}</p>
              </div>
            </>
          )}

          {reportType === 'inventory' && (
            <>
              <div className="glass-panel p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Total Stock Quantity</p>
                <p className="text-xl font-bold text-slate-100 mt-1">{summary.totalStock} items</p>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Total Cost Valuation</p>
                <p className="text-xl font-bold text-sky-400 mt-1">{formatCurrency(summary.totalCostValuation)}</p>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Total Retail Valuation</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(summary.totalRetailValuation)}</p>
              </div>
            </>
          )}

          {reportType === 'profit' && (
            <>
              <div className="glass-panel p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Total Sales Revenue</p>
                <p className="text-xl font-bold text-sky-400 mt-1">{formatCurrency(summary.totalRevenue)}</p>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Total Gross Profit</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(summary.totalProfit)}</p>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Overall Profit Margin %</p>
                <p className="text-xl font-bold text-amber-400 mt-1">{summary.overallMargin}%</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Data Table */}
      <DataTable
        columns={getColumns()}
        data={reportData}
        isLoading={isLoading}
      />

      <Toast {...toast} onClose={() => setToast((t) => ({ ...t, isOpen: false }))} />
    </div>
  );
}
