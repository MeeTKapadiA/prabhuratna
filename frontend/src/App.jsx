import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import { getDefaultRouteForUser } from './config/navConfig';

import LandingPage from './modules/landing/LandingPage';
import DashboardPage from './modules/dashboard/DashboardPage';
import BillingPage from './modules/billing/BillingPage';
import ProductsPage from './modules/products/ProductsPage';
import QuotationsPage from './modules/quotations/QuotationsPage';
import InventoryPage from './modules/inventory/InventoryPage';
import ProfitMarginPage from './modules/profit/ProfitMarginPage';
import ReportsPage from './modules/reports/ReportsPage';
import UsersPage from './modules/users/UsersPage';
import UnauthorizedPage from './modules/common/UnauthorizedPage';

// Admin Role Protection Guard
function RequireAdmin({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return <UnauthorizedPage />;
  }
  return children;
}

// Dynamic Index Redirect Based on Role & Permission Set
function IndexRedirect() {
  const { user, hasPermission } = useAuth();
  const defaultRoute = getDefaultRouteForUser(user, hasPermission);
  return <Navigate to={defaultRoute} replace />;
}

// Protected App Layout Wrapper
function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#121417] text-[#1A1A1A] dark:text-[#F1F1F1] flex flex-col transition-colors duration-200">
      <Navbar
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebarCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
        />
        <main className="flex-1 overflow-y-auto bg-[#FAFAF8] dark:bg-[#121417] p-2 sm:p-4 transition-colors">
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
        <BrowserRouter>
          <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Authenticated Dashboard System */}
            <Route path="/app" element={<ProtectedLayout />}>
              <Route index element={<IndexRedirect />} />
              <Route path="dashboard" element={<RequireAdmin><DashboardPage /></RequireAdmin>} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="quotations" element={<QuotationsPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              
              {/* Admin Protected Routes */}
              <Route path="profit-margin" element={<RequireAdmin><ProfitMarginPage /></RequireAdmin>} />
              <Route path="reports" element={<RequireAdmin><ReportsPage /></RequireAdmin>} />
              <Route path="users" element={<RequireAdmin><UsersPage /></RequireAdmin>} />
              <Route path="unauthorized" element={<UnauthorizedPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
