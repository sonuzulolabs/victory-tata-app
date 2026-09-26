import type { ImageSourcePropType } from 'react-native';

import { getOfferImage, type Offer } from '@/data/offers';

export type ScheduledRide = {
  id: string;
  vehicleName: string;
  location: string;
  weekday: string;
  day: string;
  month: string;
  time: string;
  meet: 'Doorstep' | 'Showroom';
  status: 'Upcoming' | 'Completed';
  image: ImageSourcePropType;
  guestName?: string | null;
  guestPhone?: string | null;
};

export type DriveDateOption = {
  id: string;
  label: string;
  weekday: string;
  day: string;
  month: string;
  /** YYYY-MM-DD in local time. */
  iso: string;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function upcomingDriveDates(count = 5, from = new Date()): DriveDateOption[] {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const weekday = WEEKDAYS[date.getDay()];
    const day = String(date.getDate());
    const month = MONTHS[date.getMonth()];
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return {
      id: iso,
      label: `${weekday} ${day}`,
      weekday,
      day,
      month,
      iso,
    };
  });
}

export const DRIVE_DATE_OPTIONS = upcomingDriveDates();

export const DRIVE_TIME_OPTIONS = ['10:00 AM', '11:30 AM', '01:00 PM', '03:00 PM', '05:00 PM'] as const;

export type DriveTimeOption = (typeof DRIVE_TIME_OPTIONS)[number];

export function driveTimeToApi(label: string): string {
  const match = label.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return label;
  let hour = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[3].toUpperCase();
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${minutes}`;
}

export function formatApiTime(value: string): string {
  const [hourText, minuteText = '00'] = value.split(':');
  let hour = Number(hourText);
  if (Number.isNaN(hour)) return value;
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${minuteText.slice(0, 2)} ${meridiem}`;
}

export function rideDateParts(isoDate: string): { weekday: string; day: string; month: string } {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  return {
    weekday: WEEKDAYS[date.getDay()],
    day: String(date.getDate()),
    month: MONTHS[date.getMonth()],
  };
}

export type DriveService = 'instore' | 'concierge';

export function driveServiceLabel(service: DriveService): string {
  return service === 'instore' ? 'In-store' : 'Concierge';
}

export const SHOWROOMS = [
  { id: 'avinashi', label: 'Victory Tata · Avinashi Road' },
  { id: 'tirupur', label: 'Victory Tata · Tirupur' },
] as const;

export type ShowroomId = (typeof SHOWROOMS)[number]['id'];

export type DriveBooking = {
  service: DriveService;
  location: string;
  guestName: string | null;
  guestPhone: string | null;
};

export function createRideFromBooking(
  offer: Offer,
  date: DriveDateOption,
  time: DriveTimeOption,
  booking: DriveBooking,
): ScheduledRide {
  const meet: ScheduledRide['meet'] = booking.service === 'concierge' ? 'Doorstep' : 'Showroom';
  return {
    id: `ride-${offer.id}-${date.id}-${time.replace(/\s/g, '')}`,
    vehicleName: offer.modelLine || offer.kicker,
    location: booking.location,
    weekday: date.weekday,
    day: date.day,
    month: date.month,
    time,
    meet,
    status: 'Upcoming',
    image: getOfferImage(offer),
    guestName: booking.guestName,
    guestPhone: booking.guestPhone,
  };
}
