import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  Boxes,
  TrendingUp,
  BarChart3,
  Users
} from 'lucide-react';

export const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/app/dashboard',
    icon: LayoutDashboard,
    module: 'dashboard',
    adminOnly: true,
    priority: 1
  },
  {
    id: 'billing',
    label: 'POS Billing',
    path: '/app/billing',
    icon: ShoppingCart,
    module: 'billing',
    priority: 2
  },
  {
    id: 'products',
    label: 'Products',
    path: '/app/products',
    icon: Package,
    module: 'products',
    priority: 3
  },
  {
    id: 'quotations',
    label: 'Quotations',
    path: '/app/quotations',
    icon: FileText,
    module: 'billing',
    priority: 4
  },
  {
    id: 'inventory',
    label: 'Inventory Track',
    path: '/app/inventory',
    icon: Boxes,
    module: 'inventory',
    priority: 5
  },
  {
    id: 'profit',
    label: 'Profit Analytics',
    path: '/app/profit-margin',
    icon: TrendingUp,
    module: 'reports',
    adminOnly: true,
    priority: 6
  },
  {
    id: 'reports',
    label: 'Reports & Export',
    path: '/app/reports',
    icon: BarChart3,
    module: 'reports',
    adminOnly: true,
    priority: 7
  },
  {
    id: 'users',
    label: 'User Management',
    path: '/app/users',
    icon: Users,
    module: 'users',
    adminOnly: true,
    priority: 8
  }
];

export function getAccessibleNavItems(user, hasPermission) {
  if (!user) return [];
  const isAdmin = user.role === 'admin';
  return NAV_ITEMS.filter((item) => {
    if (isAdmin) return true;
    if (item.adminOnly) return false;
    return hasPermission ? hasPermission(item.module, 'view') : true;
  });
}

export function getDefaultRouteForUser(user, hasPermission) {
  const accessible = getAccessibleNavItems(user, hasPermission);
  if (accessible.length > 0) {
    return accessible[0].path;
  }
  return '/app/billing';
}
