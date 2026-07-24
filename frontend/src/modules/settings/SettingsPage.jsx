import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Toast from '../../components/ui/Toast';
import { apiRequest } from '../../services/api';
import { Building2, Save, Upload, Trash2, Image, FileText, Phone, Mail, MapPin } from 'lucide-react';

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    shop_name: '',
    shop_address: '',
    shop_phone: '',
    shop_email: '',
    shop_gstin: '',
    invoice_footer_note: '',
    logo_base64: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest('/settings');
      if (res.success && res.settings) {
        setFormData({
          shop_name: res.settings.shop_name || '',
          shop_address: res.settings.shop_address || '',
          shop_phone: res.settings.shop_phone || '',
          shop_email: res.settings.shop_email || '',
          shop_gstin: res.settings.shop_gstin || '',
          invoice_footer_note: res.settings.invoice_footer_note || '',
          logo_base64: res.settings.logo_base64 || ''
        });
      }
    } catch (err) {
      console.error(err);
      setToast({ isOpen: true, type: 'danger', message: 'Failed to load business settings' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setToast({ isOpen: true, type: 'warning', message: 'Image size should be under 2MB' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, logo_base64: reader.result }));
    };
    reader.onerror = () => {
      setToast({ isOpen: true, type: 'danger', message: 'Failed to process logo image' });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logo_base64: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await apiRequest('/settings', 'PUT', formData);
      if (res.success) {
        setToast({ isOpen: true, type: 'success', message: 'Business settings saved successfully!' });
      }
    } catch (err) {
      console.error(err);
      setToast({ isOpen: true, type: 'danger', message: err.message || 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-[#9CA3AF]">
        Loading business settings...
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#C0392B] dark:text-[#E74C3C]" /> Business Branding & Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">Configure store information, tax details, invoice footer notes, and logo image for PDFs</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Settings Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm space-y-6">
          
          {/* Logo Section */}
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#F1F1F1] mb-3 flex items-center gap-2">
              <Image className="w-4 h-4 text-[#C0392B] dark:text-[#E74C3C]" /> Store Logo (Used on PDF Header)
            </h3>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-[#2D3138] bg-[#FAFAF8] dark:bg-[#121417]">
              {formData.logo_base64 ? (
                <div className="relative group">
                  <img
                    src={formData.logo_base64}
                    alt="Store Logo Preview"
                    className="w-24 h-24 object-contain rounded-lg border border-slate-300 dark:border-[#2D3138] bg-white p-1"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-sm"
                    title="Remove Logo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 dark:border-[#2D3138] flex flex-col items-center justify-center text-slate-400">
                  <Image className="w-8 h-8 mb-1" />
                  <span className="text-[10px]">No Logo</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1E2126] border border-slate-300 dark:border-[#2D3138] hover:bg-slate-50 dark:hover:bg-[#2D3138] rounded-xl text-xs font-bold text-slate-800 dark:text-[#F1F1F1] cursor-pointer shadow-xs transition-all">
                  <Upload className="w-4 h-4 text-[#C0392B] dark:text-[#E74C3C]" /> Upload Store Logo
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp, image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-500 dark:text-[#9CA3AF]">
                  PNG or JPEG format (Max 2MB). Appears at top-left of PDF Invoices & Quotations.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-[#2D3138]" />

          {/* Store Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Shop / Business Name"
              value={formData.shop_name}
              onChange={(e) => handleInputChange('shop_name', e.target.value)}
              placeholder="e.g. Prabhuratna Metals Pvt. Ltd."
              required
            />

            <Input
              label="GSTIN Number"
              value={formData.shop_gstin}
              onChange={(e) => handleInputChange('shop_gstin', e.target.value)}
              placeholder="e.g. 24ABCDE1234F1Z5"
            />

            <Input
              label="Contact Phone"
              value={formData.shop_phone}
              onChange={(e) => handleInputChange('shop_phone', e.target.value)}
              placeholder="e.g. +91 98765 43210"
            />

            <Input
              label="Store Email"
              type="email"
              value={formData.shop_email}
              onChange={(e) => handleInputChange('shop_email', e.target.value)}
              placeholder="e.g. info@prabhuratna.com"
            />

            <div className="sm:col-span-2">
              <Input
                label="Full Shop Address"
                value={formData.shop_address}
                onChange={(e) => handleInputChange('shop_address', e.target.value)}
                placeholder="e.g. Main Market Road, Commercial Complex, Ahmedabad, GJ 380015"
              />
            </div>
          </div>

          <hr className="border-slate-200 dark:border-[#2D3138]" />

          {/* Invoice Footer Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-[#9CA3AF] mb-1">
              Invoice Footer Note / Thank You Message
            </label>
            <textarea
              rows={2}
              value={formData.invoice_footer_note}
              onChange={(e) => handleInputChange('invoice_footer_note', e.target.value)}
              placeholder="e.g. Thank you for shopping with us! Visit again."
              className="w-full p-3 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1] focus:ring-2 focus:ring-[#C0392B] focus:border-transparent outline-none transition-all"
            />
            <p className="text-[11px] text-slate-500 dark:text-[#9CA3AF] mt-1">
              Printed as a centered note at the bottom of generated PDF receipts.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
              icon={Save}
            >
              Save Business Settings
            </Button>
          </div>
        </div>
      </form>

      <Toast
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </div>
  );
}
