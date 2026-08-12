import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from './AuthContext';

const ShopSettingsContext = createContext({
  settings: {},
  branding: {},
  logoSrc: '/logo.png',
  shopName: 'Prabhuratna',
  refreshSettings: async () => {},
  isLoading: false
});

const PUBLIC_KEYS = [
  'shop_name',
  'shop_address',
  'shop_phone',
  'shop_email',
  'shop_gstin',
  'logo_base64',
  'logo_url',
  'invoice_footer_note',
  'bank_name',
  'bank_branch',
  'bank_account_number',
  'bank_ifsc'
];

export function getShopLogoSrc(settings = {}) {
  return settings.logo_base64 || settings.logo_url || '/logo.png';
}

export function ShopSettingsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState({});
  const [branding, setBranding] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const applyBranding = useCallback((data = {}) => {
    const next = {};
    PUBLIC_KEYS.forEach((key) => {
      if (data[key] !== undefined && data[key] !== null) next[key] = data[key];
    });
    setBranding(next);
  }, []);

  const loadPublicBranding = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/public');
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;
      const res = await response.json();
      if (res?.success && res.settings) {
        applyBranding(res.settings);
      }
    } catch (err) {
      console.error('Failed to load public branding:', err);
    }
  }, [applyBranding]);

  const loadFullSettings = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await apiRequest('/settings');
      if (res?.success && res.settings) {
        setSettings(res.settings);
        applyBranding(res.settings);
      }
    } catch (err) {
      console.error('Failed to load shop settings:', err);
    }
  }, [isAuthenticated, applyBranding]);

  const refreshSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      await loadPublicBranding();
      await loadFullSettings();
    } finally {
      setIsLoading(false);
    }
  }, [loadPublicBranding, loadFullSettings]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  useEffect(() => {
    const onUpdated = (event) => {
      if (event?.detail?.settings) {
        setSettings(event.detail.settings);
        applyBranding(event.detail.settings);
      } else {
        refreshSettings();
      }
    };
    window.addEventListener('shop-settings:updated', onUpdated);
    return () => window.removeEventListener('shop-settings:updated', onUpdated);
  }, [refreshSettings, applyBranding]);

  const merged = isAuthenticated && Object.keys(settings).length ? settings : branding;
  const logoSrc = getShopLogoSrc(merged);
  const shopName = merged.shop_name || 'Prabhuratna';

  return (
    <ShopSettingsContext.Provider
      value={{
        settings: merged,
        branding,
        logoSrc,
        shopName,
        refreshSettings,
        isLoading
      }}
    >
      {children}
    </ShopSettingsContext.Provider>
  );
}

export function useShopSettings() {
  return useContext(ShopSettingsContext);
}
