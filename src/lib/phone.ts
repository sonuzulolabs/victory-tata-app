export function phoneDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, 10);
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
  const d = phoneDigits(digits10);
  if (d.length !== 10) return '';
  return `+91 ${formatPhoneInput(d)}`;
}

/** Extract 10-digit mobile from stored profile value (+91 … or plain digits). */
export function mobileDigitsFromStored(stored: string) {
  const raw = phoneDigits(stored);
  if (raw.length === 12 && raw.startsWith('91')) return raw.slice(2);
  return raw.slice(0, 10);
}
