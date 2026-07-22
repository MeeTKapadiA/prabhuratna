import React, { useState, useEffect } from 'react';
import SearchBar from '../../components/ui/SearchBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Toast from '../../components/ui/Toast';
import StatCard from '../../components/ui/StatCard';
import { apiRequest } from '../../services/api';
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  Plus,
  Edit2,
  Key,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  UserPlus
} from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'staff',
    status: 'active'
  });
  const [newPassword, setNewPassword] = useState('');

  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      let query = `/users?search=${encodeURIComponent(search)}`;
      if (roleFilter) query += `&role=${roleFilter}`;
      if (statusFilter) query += `&status=${statusFilter}`;
      const res = await apiRequest(query);
      if (res.success) {
        setUsers(res.users);
      }
    } catch (err) {
      console.error(err);
      setToast({ isOpen: true, type: 'error', message: err.message || 'Failed to fetch users' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, statusFilter]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/users', 'POST', formData);
      if (res.success) {
        setToast({ isOpen: true, type: 'success', message: 'User created successfully' });
        setIsAddModalOpen(false);
        setFormData({ name: '', username: '', email: '', password: '', role: 'staff', status: 'active' });
        fetchUsers();
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: err.message || 'Failed to create user' });
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const res = await apiRequest(`/users/${selectedUser.id}`, 'PUT', {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        role: formData.role,
        status: formData.status
      });
      if (res.success) {
        setToast({ isOpen: true, type: 'success', message: 'User details updated' });
        setIsEditModalOpen(false);
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: err.message || 'Failed to update user' });
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await apiRequest(`/users/${user.id}/status`, 'PATCH', { status: newStatus });
      if (res.success) {
        setToast({ isOpen: true, type: 'success', message: res.message });
        fetchUsers();
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: err.message || 'Failed to change status' });
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    try {
      const res = await apiRequest(`/users/${selectedUser.id}/reset-password`, 'POST', { password: newPassword });
      if (res.success) {
        setToast({ isOpen: true, type: 'success', message: 'Password reset successful' });
        setIsResetModalOpen(false);
        setSelectedUser(null);
        setNewPassword('');
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: err.message || 'Failed to reset password' });
    }
  };

  const handleDeleteUser = async (user) => {
    if (window.confirm(`Are you sure you want to delete user ${user.name}? This action cannot be undone.`)) {
      try {
        const res = await apiRequest(`/users/${user.id}`, 'DELETE');
        if (res.success) {
          setToast({ isOpen: true, type: 'success', message: 'User deleted' });
          fetchUsers();
        }
      } catch (err) {
        setToast({ isOpen: true, type: 'error', message: err.message || 'Failed to delete user' });
      }
    }
  };

  // User Stats Calculation
  const totalUsersCount = users.length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const staffCount = users.filter((u) => u.role === 'staff').length;
  const activeCount = users.filter((u) => u.status === 'active').length;

  const columns = [
    {
      header: 'User Profile & Username',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-sm ${
            row.role === 'admin' ? 'bg-[#C0392B] dark:bg-[#E74C3C]' : 'bg-slate-700'
          }`}>
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-[#F1F1F1]">{row.name}</p>
            <p className="text-xs text-slate-500 dark:text-[#9CA3AF] font-mono">@{row.username || 'n/a'} | {row.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'System Role',
      render: (row) => (
        <Badge variant={row.role === 'admin' ? 'danger' : 'info'}>
          {row.role.toUpperCase()}
        </Badge>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <button
          onClick={() => handleToggleStatus(row)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
            row.status === 'active'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
          }`}
          title="Click to toggle status"
        >
          {row.status === 'active' ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4 text-rose-500" />}
          <span>{row.status === 'active' ? 'Active' : 'Deactivated'}</span>
        </button>
      )
    },
    {
      header: 'Last Session Login',
      render: (row) => (
        <span className="text-xs text-slate-500 dark:text-[#9CA3AF]">
          {row.last_login ? new Date(row.last_login).toLocaleString('en-IN') : 'Never Logged In'}
        </span>
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setSelectedUser(row);
              setFormData({
                name: row.name,
                username: row.username || '',
                email: row.email,
                role: row.role,
                status: row.status
              });
              setIsEditModalOpen(true);
            }}
            title="Edit User Details"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#121417] text-amber-600 dark:text-amber-400"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedUser(row);
              setNewPassword('');
              setIsResetModalOpen(true);
            }}
            title="Reset User Password"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#121417] text-sky-600 dark:text-sky-400"
          >
            <Key className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteUser(row)}
            title="Delete User Account"
            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#C0392B] dark:text-[#E74C3C]" /> Enterprise User Management & Access Control
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">Manage administrative accounts, store staff roles, passwords, and permissions</p>
        </div>

        <Button
          onClick={() => {
            setFormData({ name: '', username: '', email: '', password: '', role: 'staff', status: 'active' });
            setIsAddModalOpen(true);
          }}
          variant="primary"
          icon={UserPlus}
        >
          Add New User Account
        </Button>
      </div>

      {/* User Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total User Accounts"
          value={totalUsersCount}
          subtitle="Registered accounts"
          icon={Users}
          color="sky"
        />
        <StatCard
          title="Admin Accounts"
          value={adminCount}
          subtitle="Full access rights"
          icon={Shield}
          color="purple"
        />
        <StatCard
          title="Staff Accounts"
          value={staffCount}
          subtitle="POS Billing & Products"
          icon={UserCheck}
          color="amber"
        />
        <StatCard
          title="Active Sessions"
          value={activeCount}
          subtitle="Permitted logins"
          icon={ShieldCheck}
          color="emerald"
        />
      </div>

      {/* Filter Controls Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="sm:col-span-2">
          <SearchBar
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
            placeholder="Search user by name, username or email..."
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1] focus:outline-none focus:border-[#C0392B] dark:focus:border-[#E74C3C]"
        >
          <option value="">All Roles</option>
          <option value="admin">System Admin</option>
          <option value="staff">Store Staff</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1] focus:outline-none focus:border-[#C0392B] dark:focus:border-[#E74C3C]"
        >
          <option value="">All Account Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
        </select>
      </div>

      {/* Users Data Table */}
      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        emptyMessage="No system users match the search filter"
      />

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Provision New User Account"
        subtitle="Create an authorized store staff or admin account"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Full Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Rajesh Patel"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Username *"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="e.g. rajesh"
              required
            />
            <Input
              label="Email Address *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="rajesh@prabhuratna.com"
              required
            />
          </div>

          <Input
            label="Initial Password *"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Minimum 6 characters"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF] mb-1">
                Assign Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full p-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1]"
              >
                <option value="staff">Store Staff (POS & Products)</option>
                <option value="admin">System Administrator (Full)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF] mb-1">
                Account Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full p-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1]"
              >
                <option value="active">Active</option>
                <option value="inactive">Deactivated</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#2D3138]">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create User Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit User: ${selectedUser?.name}`}
        subtitle="Modify user name, email, role, or access status"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleEditUser} className="space-y-4">
          <Input
            label="Full Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Username *"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
            <Input
              label="Email Address *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF] mb-1">
                Assign Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full p-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1]"
              >
                <option value="staff">Store Staff</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF] mb-1">
                Account Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full p-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1]"
              >
                <option value="active">Active</option>
                <option value="inactive">Deactivated</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#2D3138]">
            <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Update User Details
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title={`Reset Password: ${selectedUser?.name}`}
        subtitle={`Issue a new password for @${selectedUser?.username}`}
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <Input
            label="New Password *"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#2D3138]">
            <Button type="button" variant="ghost" onClick={() => setIsResetModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Reset Password
            </Button>
          </div>
        </form>
      </Modal>

      <Toast
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </div>
  );
}
