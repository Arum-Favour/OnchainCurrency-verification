const getAppBaseUrl = () => {
  const base =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';
  return base.replace(/\/$/, '');
};

const buildVerificationUrl = (serialNumber) => {
  const url = new URL(getAppBaseUrl());
  url.searchParams.set('verify', String(serialNumber).trim());
  return url.toString();
};

const parseSerialFromVerificationInput = (input) => {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  try {
    const url = new URL(trimmed);
    const serial =
      url.searchParams.get('verify') || url.searchParams.get('serial');
    if (serial) return serial.trim();
  } catch {
    // not a URL
  }

  try {
    const data = JSON.parse(trimmed);
    if (data.serialNumber) return String(data.serialNumber).trim();
    if (data.verificationUrl) return parseSerialFromVerificationInput(data.verificationUrl);
  } catch {
    // not JSON
  }

  return null;
};

module.exports = {
  getAppBaseUrl,
  buildVerificationUrl,
  parseSerialFromVerificationInput,
};
