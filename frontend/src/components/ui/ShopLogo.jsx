import React, { useEffect, useState } from 'react';
import { useShopSettings } from '../../context/ShopSettingsContext';

/**
 * Shared store logo — uses Business Settings upload/URL, falls back to /logo.png then initial.
 */
export default function ShopLogo({
  className = 'w-9 h-9',
  rounded = 'rounded-xl',
  alt,
  showFallbackInitial = true
}) {
  const { logoSrc, shopName } = useShopSettings();
  const [failed, setFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    setFallbackFailed(false);
  }, [logoSrc]);

  const initial = (shopName || 'P').trim().charAt(0).toUpperCase() || 'P';
  const label = alt || `${shopName || 'Store'} logo`;

  if (failed && fallbackFailed && showFallbackInitial) {
    return (
      <div
        className={`${className} ${rounded} bg-[#C0392B] dark:bg-[#E74C3C] flex items-center justify-center font-extrabold text-white shadow-sm flex-shrink-0`}
        aria-label={label}
      >
        {initial}
      </div>
    );
  }

  const src = failed ? '/logo.png' : logoSrc;

  return (
    <img
      src={src}
      alt={label}
      className={`${className} ${rounded} object-contain bg-white p-0.5 border border-slate-200 dark:border-[#2D3138] flex-shrink-0 shadow-sm`}
      onError={() => {
        if (!failed) setFailed(true);
        else setFallbackFailed(true);
      }}
    />
  );
}
