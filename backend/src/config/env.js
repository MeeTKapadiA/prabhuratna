require('dotenv').config();

function parseOrigins(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function toHttpsOrigin(hostOrUrl) {
  if (!hostOrUrl) return null;
  const raw = String(hostOrUrl).trim();
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw.replace(/\/+$/, '');
  }
  return `https://${raw.replace(/\/+$/, '')}`;
}

function collectAllowedOrigins() {
  const origins = new Set(parseOrigins(process.env.ALLOWED_ORIGINS));

  // Auto-allow the current Vercel deployment URLs so preview/prod work without manual edits
  [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
  ].forEach((value) => {
    const origin = toHttpsOrigin(value);
    if (origin) origins.add(origin);
  });

  return [...origins];
}

const isVercel = Boolean(process.env.VERCEL);
const isProduction = process.env.NODE_ENV === 'production' || isVercel;
const allowedOrigins = collectAllowedOrigins();

function getJwtSecret() {
  const secret = process.env.JWT_SECRET && String(process.env.JWT_SECRET).trim();

  if (secret) return secret;

  if (isProduction) {
    throw new Error(
      'JWT_SECRET is missing. Add it in Vercel → Project Settings → Environment Variables (Production + Preview), then redeploy.'
    );
  }

  // Local development only
  return 'prabhuratna_secret_key_2026';
}

function assertProductionEnv() {
  if (!isProduction) return;

  if (!process.env.JWT_SECRET || !String(process.env.JWT_SECRET).trim()) {
    throw new Error(
      'JWT_SECRET is required on Vercel/production. Set it in Environment Variables and redeploy.'
    );
  }

  if (allowedOrigins.length === 0) {
    console.warn(
      '[SECURITY] ALLOWED_ORIGINS is empty. Set it to your site URL (e.g. https://your-app.vercel.app). Vercel URL auto-allow may still cover the current deploy.'
    );
  }
}

assertProductionEnv();

module.exports = {
  isVercel,
  isProduction,
  port: Number(process.env.PORT) || 5001,
  jwtSecret: getJwtSecret(),
  allowedOrigins,
  nodeEnv: process.env.NODE_ENV || (isVercel ? 'production' : 'development')
};
