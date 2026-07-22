import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-[#E5E7EB] dark:border-[#2D3138] text-center space-y-6 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-[#C0392B]/10 dark:bg-[#E74C3C]/10 text-[#C0392B] dark:text-[#E74C3C] flex items-center justify-center mx-auto border border-[#C0392B]/20">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-[#C0392B]/10 text-[#C0392B] dark:text-[#E74C3C] text-xs font-bold uppercase tracking-wider">
            HTTP 403 Forbidden
          </span>
          <h1 className="text-2xl font-extrabold text-[#1A1A1A] dark:text-[#F1F1F1]">Access Restricted</h1>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
            You do not have administrative permission to view this section or execute this operation. Please contact your Store Administrator.
          </p>
        </div>

        <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#2D3138] flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#2D3138] bg-[#FFFFFF] dark:bg-[#1E2126] hover:bg-[#FAFAF8] dark:hover:bg-[#121417] text-[#1A1A1A] dark:text-[#F1F1F1] text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
          <button
            onClick={() => navigate('/app/billing')}
            className="px-4 py-2.5 rounded-xl bg-[#C0392B] dark:bg-[#E74C3C] hover:bg-[#A93226] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
          >
            <Home className="w-4 h-4" /> Back to POS Billing
          </button>
        </div>
      </div>
    </div>
  );
}
