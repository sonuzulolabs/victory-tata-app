/** All digits from a string (no length cap). */
export function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

/** Up to 10 digits while the user types a local mobile (login / form fields). */
export function phoneDigits(value: string) {
  return digitsOnly(value).slice(0, 10);
}

export function formatPhoneInput(value: string) {
  const digits = phoneDigits(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/** Validates 10-digit Indian mobile (starts with 6–9). */
export function isValidIndianMobile(digits: string): boolean {
  return /^[6-9]\d{9}$/.test(digits);
}

export function formatPhoneDisplay(digits10: string) {
  const d = mobileDigitsFromStored(digits10);
  if (!isValidIndianMobile(d) && d.length !== 10) return '';
  if (!isValidIndianMobile(d)) return '';
  return `+91 ${formatPhoneInput(d)}`;
}

/** Extract 10-digit Indian mobile from stored profile (+91 …, 91…, or plain digits). */
export function mobileDigitsFromStored(stored: string) {
  const raw = digitsOnly(stored);
  if (raw.length === 0) return '';

  if (raw.length >= 12 && raw.startsWith('91')) {
    return raw.slice(-10);
  }

  if (raw.length === 11 && raw.startsWith('0')) {
    return raw.slice(1);
  }

  if (raw.length > 10) {
    return raw.slice(-10);
  }

  return raw;
}
