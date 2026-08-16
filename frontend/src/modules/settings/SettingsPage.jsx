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
    shop_pan: '',
    owner_whatsapp: '',
    logo_url: '',
    invoice_footer_note: '',
    logo_base64: '',
    bank_name: '',
    bank_branch: '',
    bank_account_number: '',
    bank_ifsc: ''
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
          shop_pan: res.settings.shop_pan || '',
          owner_whatsapp: res.settings.owner_whatsapp || '',
          logo_url: res.settings.logo_url || '',
          invoice_footer_note: res.settings.invoice_footer_note || '',
          logo_base64: res.settings.logo_base64 || '',
          bank_name: res.settings.bank_name || '',
          bank_branch: res.settings.bank_branch || '',
          bank_account_number: res.settings.bank_account_number || '',
          bank_ifsc: res.settings.bank_ifsc || ''
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

  const compressLogo = (dataUrl, maxSize = 400, quality = 0.85) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png', quality));
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = dataUrl;
    });

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setToast({ isOpen: true, type: 'warning', message: 'Image size should be under 2MB' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const compressed = await compressLogo(reader.result);
        setFormData((prev) => ({ ...prev, logo_base64: compressed }));
        setToast({ isOpen: true, type: 'success', message: 'Logo ready — click Save Settings to apply everywhere' });
      } catch {
        setToast({ isOpen: true, type: 'danger', message: 'Failed to process logo image' });
      }
    };
    reader.onerror = () => {
      setToast({ isOpen: true, type: 'danger', message: 'Failed to process logo image' });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logo_base64: '', logo_url: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await apiRequest('/settings', 'PUT', formData);
      if (res.success) {
        if (res.settings) {
          setFormData((prev) => ({
            ...prev,
            ...res.settings,
            logo_base64: res.settings.logo_base64 || '',
            logo_url: res.settings.logo_url || ''
          }));
        }
        window.dispatchEvent(new CustomEvent('shop-settings:updated', {
          detail: { settings: res.settings || formData }
        }));
        setToast({ isOpen: true, type: 'success', message: 'Business settings saved — logo updated on invoices, quotations, landing & app' });
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
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">Logo & store details apply to invoices, quotations, landing page, and the app header</p>
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
                  PNG or JPEG (Max 2MB). Used on PDFs, landing page, and app navigation after you save.
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
              label="PAN Number"
              value={formData.shop_pan}
              onChange={(e) => handleInputChange('shop_pan', e.target.value.toUpperCase())}
              placeholder="e.g. ABCDE1234F"
            />
            <Input
              label="Owner WhatsApp (low-stock alerts)"
              value={formData.owner_whatsapp}
              onChange={(e) => handleInputChange('owner_whatsapp', e.target.value)}
              placeholder="9198XXXXXXXX"
            />
            <Input
              label="Logo URL (preferred over base64)"
              value={formData.logo_url}
              onChange={(e) => handleInputChange('logo_url', e.target.value)}
              placeholder="https://.../logo.png"
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

          {/* Bank Details for NEFT/RTGS */}
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#F1F1F1] mb-3">
              Bank Details for NEFT/RTGS (optional)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Bank Name"
                value={formData.bank_name}
                onChange={(e) => handleInputChange('bank_name', e.target.value)}
                placeholder="e.g. HDFC Bank"
              />
              <Input
                label="Branch"
                value={formData.bank_branch}
                onChange={(e) => handleInputChange('bank_branch', e.target.value)}
                placeholder="e.g. Vapi Main"
              />
              <Input
                label="Account Number"
                value={formData.bank_account_number}
                onChange={(e) => handleInputChange('bank_account_number', e.target.value)}
                placeholder="Account number"
              />
              <Input
                label="IFSC Code"
                value={formData.bank_ifsc}
                onChange={(e) => handleInputChange('bank_ifsc', e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0001234"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#9CA3AF] mt-2">
              Shown on invoice PDFs only when at least one field is filled.
            </p>
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
