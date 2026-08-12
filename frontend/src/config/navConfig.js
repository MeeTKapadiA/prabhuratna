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
  Building2,
  Wallet,
  BookOpen,
  UserCircle,
  ScrollText,
  FileMinus
} from 'lucide-react';

export const NAV_SECTIONS = [
  {
    id: 'main',
    title: null,
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/app/dashboard',
        icon: LayoutDashboard,
        module: 'dashboard'
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
        module: 'returns',
        adminOnly: true
      },
      {
        id: 'credit-notes',
        label: 'Credit Notes',
        path: '/app/credit-notes',
        icon: FileMinus,
        module: 'billing',
        adminOnly: true
      },
      {
        id: 'customers',
        label: 'Customers / Udhaar',
        path: '/app/customers',
        icon: UserCircle,
        module: 'customers',
        adminOnly: true
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
        module: 'purchases',
        adminOnly: true
      },
      {
        id: 'suppliers',
        label: 'Suppliers',
        path: '/app/suppliers',
        icon: Truck,
        module: 'suppliers',
        adminOnly: true
      }
    ]
  },
  {
    id: 'money',
    title: 'Money',
    items: [
      {
        id: 'cashbook',
        label: 'Cashbook',
        path: '/app/cashbook',
        icon: BookOpen,
        module: 'cashbook',
        adminOnly: true
      },
      {
        id: 'expenses',
        label: 'Expenses',
        path: '/app/expenses',
        icon: Wallet,
        module: 'expenses',
        adminOnly: true
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
        id: 'activity',
        label: 'Activity Log',
        path: '/app/activity',
        icon: ScrollText,
        module: 'audit',
        superAdminOnly: true
      },
      {
        id: 'users',
        label: 'User Management',
        path: '/app/users',
        icon: Users,
        module: 'users',
        superAdminOnly: true
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
  const isSuperAdmin = user.role === 'superadmin';
  const isAdmin = user.role === 'admin' || isSuperAdmin;

  return NAV_SECTIONS.map((section) => {
    const accessibleItems = section.items.filter((item) => {
      if (item.superAdminOnly) return isSuperAdmin;
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
