import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WalletPassQr } from '@/components/wallet-pass-qr';
import { AUTH_BLUE, AUTH_BLUE_SOFT } from '@/constants/brand';
import type { ScheduledRide } from '@/data/scheduledRides';

type Props = {
  ride: ScheduledRide;
  onPress?: () => void;
};

export function ScheduledRideCard({ ride, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ride.vehicleName} scheduled ${ride.weekday} ${ride.day} ${ride.month} at ${ride.time}`}
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, { opacity: pressed ? 0.97 : 1 }]}>
      <LinearGradient
        colors={['#12245C', AUTH_BLUE]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.card}>
        <View style={styles.top}>
          <View style={styles.topCopy}>
            <Text style={styles.eyebrow}>Scheduled ride</Text>
            <Text style={styles.vehicle} numberOfLines={1}>
              {ride.vehicleName}
            </Text>
          </View>
          <View style={styles.status}>
            <Text style={styles.statusText}>Upcoming</Text>
          </View>
        </View>

        <View style={styles.stage}>
          <Image source={ride.image} style={styles.car} contentFit="contain" />
        </View>

        <View style={styles.ticket}>
          <View style={styles.dateBlock}>
            <Text style={styles.weekday}>{ride.weekday}</Text>
            <Text style={styles.day}>{ride.day}</Text>
            <Text style={styles.month}>{ride.month}</Text>
          </View>

          <View style={styles.ticketRule} />

          <View style={styles.ticketCopy}>
            <Text style={styles.time}>{ride.time}</Text>
            <Text style={styles.meet}>
              {ride.meet === 'Showroom' ? 'In-store' : 'Concierge'} test drive
            </Text>
            <Text style={styles.location} numberOfLines={2}>
              {ride.location}
            </Text>
            {ride.guestName ? (
              <Text style={styles.location} numberOfLines={1}>
                For {ride.guestName}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.passFoot}>
          <View style={styles.qrPad}>
            <WalletPassQr seed={ride.id} size={88} />
          </View>
          <Text style={styles.qrCaption}>Scan at Victory · Bring a valid licence</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export function ScheduledRideEmpty({ onBookPress }: { onBookPress?: () => void }) {
  return (
    <LinearGradient
      colors={[AUTH_BLUE_SOFT, AUTH_BLUE]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.emptyCard}>
      <Text style={styles.eyebrow}>Scheduled rides</Text>
      <Text style={styles.emptyTitle}>Nothing booked yet</Text>
      <Text style={styles.emptyBody}>
        Switch to Schedule a new ride to lock a free 45-minute drive.
      </Text>
      {onBookPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onBookPress}
          style={({ pressed }) => [styles.emptyCta, { opacity: pressed ? 0.9 : 1 }]}>
          <Text style={styles.emptyCtaText}>Schedule a new ride</Text>
          <Ionicons name="arrow-forward" size={14} color={AUTH_BLUE} />
        </Pressable>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 24,
    shadowColor: '#0A1848',
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    paddingTop: 20,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  topCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 6,
  },
  vehicle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  status: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: 'rgba(94,234,212,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(94,234,212,0.35)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#5EEAD4',
    textTransform: 'uppercase',
  },
  stage: {
    height: 156,
    marginTop: 14,
    marginBottom: 6,
  },
  car: {
    width: '100%',
    height: '100%',
  },
  ticket: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 14,
  },
  dateBlock: {
    alignItems: 'center',
    minWidth: 52,
  },
  weekday: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  day: {
    marginTop: 2,
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -1.2,
    color: '#FFFFFF',
  },
  month: {
    marginTop: 1,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.72)',
  },
  ticketRule: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  ticketCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  time: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  meet: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.78)',
  },
  location: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  passFoot: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 22,
    paddingHorizontal: 20,
    gap: 12,
  },
  qrPad: {
    width: 108,
    height: 108,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCaption: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  emptyCard: {
    borderRadius: 24,
    padding: 20,
    gap: 6,
    overflow: 'hidden',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.65)',
    maxWidth: 280,
    marginBottom: 8,
  },
  emptyCta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  emptyCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: AUTH_BLUE,
  },
});
