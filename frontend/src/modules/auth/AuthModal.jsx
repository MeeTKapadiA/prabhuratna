import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onSuccess }) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [name, setName] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const { login, register, isLoading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let result;
    if (isLogin) {
      result = await login(loginIdentifier, password);
    } else {
      result = await register(name, loginIdentifier, password);
    }

    if (result && result.success) {
      onClose();
      if (onSuccess) onSuccess(result.user);
    } else {
      setError(result?.message || 'Authentication failed. Please check your credentials.');
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isLogin ? 'Prabhuratna Enterprise ERP' : 'Create Management Account'}
        subtitle={isLogin ? 'Sign in to access POS Billing, Products & Inventory' : 'Register a new authorized user'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {!isLogin && (
            <Input
              label="Full Name"
              icon={User}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rajesh Sharma"
              required
            />
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF] mb-1">
              Username or Email *
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-[#9CA3AF]" />
              <input
                type="text"
                required
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="Enter username or email"
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1] focus:outline-none focus:border-[#C0392B] dark:focus:border-[#E74C3C]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF] mb-1">
              Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-[#9CA3AF]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1] focus:outline-none focus:border-[#C0392B] dark:focus:border-[#E74C3C]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isLogin && (
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-[#9CA3AF]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 dark:border-[#2D3138] text-[#C0392B] focus:ring-0"
                />
                <span>Remember Session</span>
              </label>

              <button
                type="button"
                onClick={() => setForgotModalOpen(true)}
                className="text-[#C0392B] dark:text-[#E74C3C] font-semibold hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
            {isLogin ? 'Sign In to Portal' : 'Register Account'}
          </Button>

          <div className="text-center text-xs text-slate-500 dark:text-[#9CA3AF] pt-3 border-t border-slate-200 dark:border-[#2D3138] flex items-center justify-between">
            <span className="flex items-center gap-1 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Encrypted JWT Session
            </span>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-[#C0392B] dark:text-[#E74C3C] font-semibold hover:underline"
            >
              {isLogin ? 'Need Account?' : 'Back to Login'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        title="Password Recovery"
        subtitle="Contact your System Administrator to reset account access."
        maxWidth="max-w-sm"
      >
        <div className="space-y-4 text-xs text-slate-700 dark:text-[#9CA3AF]">
          <p>For security compliance, user passwords cannot be recovered online. Please ask an Administrator to use the <strong>User Management</strong> module to issue a password reset.</p>
          <div className="p-3 bg-[#FAFAF8] dark:bg-[#121417] rounded-xl border border-slate-200 dark:border-[#2D3138] font-mono text-[11px] text-slate-900 dark:text-[#F1F1F1]">
            Store Helpline: 098244 93420<br />
            Email: admin@prabhuratna.com
          </div>
          <Button onClick={() => setForgotModalOpen(false)} variant="secondary" fullWidth>Close</Button>
        </div>
      </Modal>
    </>
  );
}
