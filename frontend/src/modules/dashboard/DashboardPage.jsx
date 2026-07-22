import React, { useState, useEffect } from 'react';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { apiRequest } from '../../services/api';
import { formatCurrency } from '../../services/calcService';
import {
  DollarSign,
  TrendingUp,
  Boxes,
  AlertTriangle,
  PackageX,
  PieChart,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await apiRequest('/dashboard/stats');
        if (res.success) {
          setStats(res);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  const { sales, inventory, profit, insights, chartData } = stats;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">Executive Operations Dashboard</h2>
          <p className="text-xs text-slate-400 mt-1">Real-time financial performance, inventory alerts, and sales analytics</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" size="lg">
            Store Status: Active & Synced
          </Badge>
        </div>
      </div>

      {/* Primary Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(sales.today.total)}
          subtitle={`${sales.today.count} Transactions Today`}
          icon={ShoppingBag}
          color="sky"
        />

        <StatCard
          title="Weekly Revenue"
          value={formatCurrency(sales.weekly.total)}
          subtitle={`Last 7 Days Sales`}
          icon={DollarSign}
          color="emerald"
        />

        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(sales.monthly.total)}
          subtitle={`Last 30 Days Sales`}
          icon={TrendingUp}
          color="purple"
        />

        <StatCard
          title="Gross Profit Margin"
          value={`${profit.grossMarginPercent}%`}
          subtitle={`Gross Profit: ${formatCurrency(profit.grossProfit)}`}
          icon={PieChart}
          color="amber"
        />
      </div>

      {/* Inventory Health Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Products in Catalog"
          value={inventory.totalProducts}
          subtitle="Active SKUs"
          icon={Boxes}
          color="sky"
        />

        <StatCard
          title="Low Stock Alerts"
          value={inventory.lowStockProducts}
          subtitle="Below minimum threshold"
          icon={AlertTriangle}
          color="amber"
        />

        <StatCard
          title="Out of Stock Items"
          value={inventory.outOfStockProducts}
          subtitle="Immediate reorder required"
          icon={PackageX}
          color="rose"
        />
      </div>

      {/* Chart & Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart (2 Cols) */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              7-Day Sales Revenue Trend (₹)
            </h3>
            <span className="text-xs text-slate-400">Auto-updating</span>
          </div>

          <div className="h-64 w-full">
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    formatter={(val) => [formatCurrency(val), 'Revenue']}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No recent sales chart data to display yet
              </div>
            )}
          </div>
        </div>

        {/* Highest Margin Profit Products (1 Col) */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Top Margin Products
          </h3>

          <div className="space-y-3">
            {insights.topProfitable && insights.topProfitable.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-100">{p.name}</p>
                  <p className="text-[10px] text-slate-400">Cost: {formatCurrency(p.purchase_price)} → Price: {formatCurrency(p.selling_price)}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-0.5 justify-end">
                    <ArrowUpRight className="w-3.5 h-3.5" /> +{formatCurrency(p.unit_profit)}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">{p.profit_margin_percent.toFixed(1)}% margin</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
