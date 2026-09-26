export type ReferralStatus =
  | 'Submitted'
  | 'Contacted'
  | 'TestDrive'
  | 'Booking'
  | 'Purchased'
  | 'Credited'
  | 'Cancelled';

export type Referral = {
  id: string;
  customerName: string;
  customerPhone: string;
  vehicleLabel?: string;
  city?: string;
  note?: string;
  status: ReferralStatus;
  creditAmount: number | null;
  pendingCredit: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ReferralCreditSummary = {
  credited: number;
  pending: number;
  totalReferrals: number;
};

export const REFERRAL_STATUS_LABEL: Record<ReferralStatus, string> = {
  Submitted: 'Submitted',
  Contacted: 'Contacted',
  TestDrive: 'Test drive',
  Booking: 'Booking',
  Purchased: 'Purchased',
  Credited: 'Credited',
  Cancelled: 'Cancelled',
};

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return 'XXXXXXXX';
  return `${digits.slice(0, 2)}${'X'.repeat(Math.max(digits.length - 4, 4))}${digits.slice(-2)}`;
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatReferralDate(iso: string): string {
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export { isValidIndianMobile } from '@/lib/phone';

export function getCreditSummary(referrals: Referral[]): ReferralCreditSummary {
  let credited = 0;
  let pending = 0;

  for (const referral of referrals) {
    if (referral.status === 'Credited' && referral.creditAmount != null) {
      credited += referral.creditAmount;
    } else if (referral.pendingCredit != null) {
      pending += referral.pendingCredit;
    }
  }

  return { credited, pending, totalReferrals: referrals.length };
}

export function statusTone(status: ReferralStatus): 'neutral' | 'progress' | 'success' | 'credit' {
  switch (status) {
    case 'Credited':
      return 'credit';
    case 'Purchased':
      return 'success';
    case 'Submitted':
    case 'Cancelled':
      return 'neutral';
    default:
      return 'progress';
  }
}
