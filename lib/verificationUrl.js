export function getAppBaseUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export function buildVerificationUrl(serialNumber, baseUrl) {
  const base = (baseUrl || getAppBaseUrl()).replace(/\/$/, '');
  const url = new URL(base);
  url.searchParams.set('verify', String(serialNumber).trim());
  return url.toString();
}

export function parseSerialFromVerificationInput(input) {
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
    if (data.verificationUrl) {
      return parseSerialFromVerificationInput(data.verificationUrl);
    }
  } catch {
    // not JSON
  }

  return null;
}

export function getQrPayloadForCurrency(currency) {
  if (currency?.metadata?.verificationUrl) {
    return currency.metadata.verificationUrl;
  }
  if (currency?.serialNumber) {
    return buildVerificationUrl(currency.serialNumber);
  }
  return null;
}
