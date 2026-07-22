import React, { useState, useEffect } from 'react';
import DataTable from '../../components/ui/DataTable';
import SearchBar from '../../components/ui/SearchBar';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { apiRequest } from '../../services/api';
import { formatCurrency } from '../../services/calcService';
import { TrendingUp, DollarSign, Percent, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function ProfitMarginPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchProfitData() {
      setIsLoading(true);
      try {
        const res = await apiRequest(`/products?search=${encodeURIComponent(search)}`);
        if (res.success) {
          setProducts(res.products);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfitData();
  }, [search]);

  // Overall financial summary
  const summary = products.reduce((acc, p) => {
    const cost = p.purchase_price * p.stock_quantity;
    const retail = p.selling_price * p.stock_quantity;
    acc.totalCost += cost;
    acc.totalRetail += retail;
    acc.totalPotentialProfit += (retail - cost);
    return acc;
  }, { totalCost: 0, totalRetail: 0, totalPotentialProfit: 0 });

  const overallMargin = summary.totalRetail > 0
    ? ((summary.totalPotentialProfit / summary.totalRetail) * 100).toFixed(2)
    : 0;

  const columns = [
    {
      header: 'Product Description',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-[#F1F1F1]">{row.name}</p>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] font-mono">SKU: {row.sku} | Category: {row.category}</p>
        </div>
      )
    },
    {
      header: 'Purchase Price (Cost)',
      render: (row) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-[#9CA3AF]">{formatCurrency(row.purchase_price)}</span>
      )
    },
    {
      header: 'Selling Price (Retail)',
      render: (row) => (
        <span className="text-xs font-bold text-[#C0392B] dark:text-[#E74C3C]">{formatCurrency(row.selling_price)}</span>
      )
    },
    {
      header: 'Profit Per Unit',
      render: (row) => {
        const profit = row.selling_price - row.purchase_price;
        return (
          <span className={`font-extrabold text-xs flex items-center gap-1 ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {profit >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {formatCurrency(profit)}
          </span>
        );
      }
    },
    {
      header: 'Profit Margin %',
      render: (row) => {
        const margin = row.purchase_price > 0
          ? (((row.selling_price - row.purchase_price) / row.purchase_price) * 100).toFixed(1)
          : 100;
        return (
          <Badge variant={margin > 30 ? 'success' : margin > 10 ? 'info' : 'warning'}>
            {margin}% Margin
          </Badge>
        );
      }
    }
  ];

  return (
    <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#C0392B] dark:text-[#E74C3C]" /> Profit Margin & Cost Analysis
        </h2>
        <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">Product cost vs selling price, gross profit margins, and inventory potential returns</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Inventory Purchase Valuation"
          value={formatCurrency(summary.totalCost)}
          subtitle="Total Cost of Stock"
          icon={DollarSign}
          color="sky"
        />

        <StatCard
          title="Potential Sales Valuation"
          value={formatCurrency(summary.totalRetail)}
          subtitle="Total Retail Value"
          icon={TrendingUp}
          color="purple"
        />

        <StatCard
          title="Projected Gross Margin"
          value={`${overallMargin}%`}
          subtitle={`Total Profit: ${formatCurrency(summary.totalPotentialProfit)}`}
          icon={Percent}
          color="emerald"
        />
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        onClear={() => setSearch('')}
        placeholder="Filter profit margins by product name, category, SKU..."
      />

      <DataTable
        columns={columns}
        data={products}
        isLoading={isLoading}
      />
    </div>
  );
}
