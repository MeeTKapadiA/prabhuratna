import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ShopSettingsProvider } from './context/ShopSettingsContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import { getDefaultRouteForUser } from './config/navConfig';

import LandingPage from './modules/landing/LandingPage';
import DashboardPage from './modules/dashboard/DashboardPage';
import BillingPage from './modules/billing/BillingPage';
import InvoicesPage from './modules/invoices/InvoicesPage';
import ProductsPage from './modules/products/ProductsPage';
import QuotationsPage from './modules/quotations/QuotationsPage';
import InventoryPage from './modules/inventory/InventoryPage';
import SuppliersPage from './modules/suppliers/SuppliersPage';
import PurchasesPage from './modules/purchases/PurchasesPage';
import ReturnsPage from './modules/returns/ReturnsPage';
import ProfitMarginPage from './modules/profit/ProfitMarginPage';
import ReportsPage from './modules/reports/ReportsPage';
import UsersPage from './modules/users/UsersPage';
import SettingsPage from './modules/settings/SettingsPage';
import UnauthorizedPage from './modules/common/UnauthorizedPage';
import CustomersPage from './modules/customers/CustomersPage';
import ExpensesPage from './modules/expenses/ExpensesPage';
import CashbookPage from './modules/cashbook/CashbookPage';
import ActivityLogPage from './modules/activity/ActivityLogPage';
import CreditNotesPage from './modules/creditNotes/CreditNotesPage';

function RequireAdmin({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return <UnauthorizedPage />;
  }
  return children;
}

function IndexRedirect() {
  const { user, hasPermission } = useAuth();
  const defaultRoute = getDefaultRouteForUser(user, hasPermission);
  return <Navigate to={defaultRoute} replace />;
}

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#FAFAF8] dark:bg-[#121417] text-[#1A1A1A] dark:text-[#F1F1F1] flex flex-col transition-colors duration-200 overscroll-none">
      <Navbar
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebarCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
        />
        <main className="app-shell-scroll flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden bg-[#FAFAF8] dark:bg-[#121417] p-2 sm:p-4 transition-colors">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ShopSettingsProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />

              <Route path="/app" element={<ProtectedLayout />}>
                <Route index element={<IndexRedirect />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="suppliers" element={<SuppliersPage />} />
                <Route path="purchases" element={<PurchasesPage />} />
                <Route path="returns" element={<ReturnsPage />} />
                <Route path="quotations" element={<QuotationsPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="credit-notes" element={<CreditNotesPage />} />
                <Route path="cashbook" element={<CashbookPage />} />
                <Route path="expenses" element={<RequireAdmin><ExpensesPage /></RequireAdmin>} />
                <Route path="activity" element={<RequireAdmin><ActivityLogPage /></RequireAdmin>} />
                <Route path="profit-margin" element={<RequireAdmin><ProfitMarginPage /></RequireAdmin>} />
                <Route path="reports" element={<RequireAdmin><ReportsPage /></RequireAdmin>} />
                <Route path="users" element={<RequireAdmin><UsersPage /></RequireAdmin>} />
                <Route path="settings" element={<RequireAdmin><SettingsPage /></RequireAdmin>} />
                <Route path="unauthorized" element={<UnauthorizedPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ShopSettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
