import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  FileText,
  Boxes,
  Truck,
  ShoppingBag,
  RotateCcw,
  TrendingUp,
  BarChart3,
  Users,
  Building2
} from 'lucide-react';

export const NAV_SECTIONS = [
  {
    id: 'main',
    title: null, // Top-level item without section header
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/app/dashboard',
        icon: LayoutDashboard,
        module: 'dashboard',
        adminOnly: true
      }
    ]
  },
  {
    id: 'sales',
    title: 'Sales & Billing',
    items: [
      {
        id: 'billing',
        label: 'Billing',
        path: '/app/billing',
        icon: ShoppingCart,
        module: 'billing'
      },
      {
        id: 'invoices',
        label: 'Customer Invoices',
        path: '/app/invoices',
        icon: Receipt,
        module: 'invoices'
      },
      {
        id: 'quotations',
        label: 'Quotations',
        path: '/app/quotations',
        icon: FileText,
        module: 'billing'
      },
      {
        id: 'returns',
        label: 'Returns & Exchanges',
        path: '/app/returns',
        icon: RotateCcw,
        module: 'returns'
      }
    ]
  },
  {
    id: 'stock',
    title: 'Inventory & Stock',
    items: [
      {
        id: 'products',
        label: 'Products',
        path: '/app/products',
        icon: Package,
        module: 'products'
      },
      {
        id: 'inventory',
        label: 'Inventory Track',
        path: '/app/inventory',
        icon: Boxes,
        module: 'inventory'
      },
      {
        id: 'purchases',
        label: 'Purchases',
        path: '/app/purchases',
        icon: ShoppingBag,
        module: 'purchases'
      },
      {
        id: 'suppliers',
        label: 'Suppliers',
        path: '/app/suppliers',
        icon: Truck,
        module: 'suppliers'
      }
    ]
  },
  {
    id: 'admin',
    title: 'Admin & Analytics',
    items: [
      {
        id: 'reports',
        label: 'Reports & Export',
        path: '/app/reports',
        icon: BarChart3,
        module: 'reports',
        adminOnly: true
      },
      {
        id: 'profit',
        label: 'Profit Analytics',
        path: '/app/profit-margin',
        icon: TrendingUp,
        module: 'reports',
        adminOnly: true
      },
      {
        id: 'users',
        label: 'User Management',
        path: '/app/users',
        icon: Users,
        module: 'users',
        adminOnly: true
      },
      {
        id: 'settings',
        label: 'Business Settings',
        path: '/app/settings',
        icon: Building2,
        module: 'settings',
        adminOnly: true
      }
    ]
  }
];

export function getAccessibleNavSections(user, hasPermission) {
  if (!user) return [];
  const isAdmin = user.role === 'admin';

  return NAV_SECTIONS.map((section) => {
    const accessibleItems = section.items.filter((item) => {
      if (isAdmin) return true;
      if (item.adminOnly) return false;
      return hasPermission ? hasPermission(item.module, 'view') : true;
    });

    return {
      ...section,
      items: accessibleItems
    };
  }).filter((section) => section.items.length > 0);
}

export function getDefaultRouteForUser(user, hasPermission) {
  const sections = getAccessibleNavSections(user, hasPermission);
  if (sections.length > 0 && sections[0].items.length > 0) {
    return sections[0].items[0].path;
  }
  return '/app/billing';
}
