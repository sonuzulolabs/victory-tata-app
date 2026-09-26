import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BookTestDriveModal } from '@/components/book-test-drive-modal';
import { OfferListCard } from '@/components/offer-list-card';
import { ScheduledRideStack } from '@/components/scheduled-ride-stack';
import { AUTH_BLUE, SCREEN_BG } from '@/constants/brand';
import { useTabBarVisibility } from '@/context/tab-bar-visibility';
import { useUserProfile } from '@/context/user-profile';
import {
  BODY_FILTERS,
  GROUP_FILTERS,
  type Offer,
  type OfferBody,
  type OfferGroup,
  type OfferSort,
} from '@/data/offers';
import {
  createRideFromBooking,
  driveTimeToApi,
  type DriveBooking,
  type DriveDateOption,
  type DriveTimeOption,
  type ScheduledRide,
} from '@/data/scheduledRides';
import { ApiError, fetchOffers, fetchTestDrives, submitTestDrive } from '@/lib/api';
import { isValidIndianMobile, mobileDigitsFromStored } from '@/lib/phone';

const PAD = 20;
const SCROLL_THRESHOLD = 8;

type DriveMode = 'scheduled' | 'new';

const MODE_TABS: { id: DriveMode; label: string }[] = [
  { id: 'scheduled', label: 'Scheduled rides' },
  { id: 'new', label: 'Schedule a new ride' },
];

const DRIVE_SORT_OPTIONS: { id: OfferSort; label: string }[] = [
  { id: 'featured', label: 'Popular' },
  { id: 'benefit', label: 'Soonest slots' },
  { id: 'newest', label: 'Newest models' },
];

/** Reuse offer catalogue as bookable models; swap promo copy for drive context. */
function asTestDriveModel(offer: Offer): Offer {
  const slot =
    offer.group === 'EV'
      ? 'Doorstep · 45 min'
      : offer.featured
        ? 'Priority slots open'
        : 'Showroom · 45 min';

  return {
    ...offer,
    promoTitle: slot,
    powertrain: 'Free test drive',
    summary: `Book a ${offer.kicker} test drive at Victory Tata — doorstep or showroom.`,
    badge: offer.group,
  };
}

export default function TestDriveScreen() {
  const { show, hide } = useTabBarVisibility();
  const { profile } = useUserProfile();
  const lastY = useRef(0);
  const [mode, setMode] = useState<DriveMode>('scheduled');
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<'All' | OfferGroup>('All');
  const [body, setBody] = useState<'All' | OfferBody>('All');
  const [sort, setSort] = useState<OfferSort>('featured');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [upcoming, setUpcoming] = useState<ScheduledRide[]>([]);
  const [results, setResults] = useState<Offer[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [loadingRides, setLoadingRides] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [bookingOffer, setBookingOffer] = useState<Offer | null>(null);

  const phone = mobileDigitsFromStored(profile?.phone ?? '');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoadingRides(true);
      if (isValidIndianMobile(phone)) {
        void fetchTestDrives(phone)
          .then((rides) => {
            if (!cancelled) setUpcoming(rides);
          })
          .catch(() => {
            if (!cancelled) setUpcoming([]);
          })
          .finally(() => {
            if (!cancelled) setLoadingRides(false);
          });
      } else {
        setUpcoming([]);
        setLoadingRides(false);
      }

      const handle = setTimeout(() => {
        setLoadingModels(true);
        void fetchOffers({ query, group, body, sort })
          .then((offers) => {
            if (cancelled) return;
            setResults(offers.map(asTestDriveModel));
            setModelError(null);
          })
          .catch((err: unknown) => {
            if (cancelled) return;
            setModelError(err instanceof ApiError ? err.message : 'Could not load models.');
          })
          .finally(() => {
            if (!cancelled) setLoadingModels(false);
          });
      }, query.trim() ? 300 : 0);

      return () => {
        cancelled = true;
        clearTimeout(handle);
        show();
      };
    }, [body, group, phone, query, show, sort]),
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const dy = y - lastY.current;
      if (Math.abs(dy) < SCROLL_THRESHOLD) return;

      if (dy > 0 && y > 24) hide();
      else if (dy < 0) show();

      lastY.current = y;
    },
    [hide, show],
  );

  const closeBooking = useCallback((didBook = false) => {
    setBookingOffer(null);
    if (didBook) setMode('scheduled');
  }, []);

  const confirmBooking = useCallback(
    async (date: DriveDateOption, time: DriveTimeOption, booking: DriveBooking) => {
      if (!bookingOffer?.carId) {
        throw new Error('This model is not available to book yet.');
      }
      const guestPhone = booking.guestPhone;
      const customerPhone = guestPhone || phone;
      if (!isValidIndianMobile(customerPhone)) {
        throw new Error('Add your mobile number on your profile before booking.');
      }
      const customerName = booking.guestName || profile?.name.trim() || 'Customer';
      await submitTestDrive({
        customerName,
        customerPhone,
        carId: bookingOffer.carId,
        location: booking.location,
        scheduledDate: date.iso,
        scheduledTime: driveTimeToApi(time),
      });
      const ride = createRideFromBooking(bookingOffer, date, time, booking);
      if (isValidIndianMobile(phone) && !guestPhone) {
        setUpcoming(await fetchTestDrives(phone));
      } else if (isValidIndianMobile(phone)) {
        const rides = await fetchTestDrives(phone);
        setUpcoming([ride, ...rides]);
      } else {
        setUpcoming((prev) => [ride, ...prev]);
      }
      return ride;
    },
    [bookingOffer, phone, profile?.name],
  );

  const renderModel = useCallback(
    ({ item }: { item: Offer }) => (
      <OfferListCard
        offer={item}
        ctaLabel="Book test drive"
        showLikedBadge={false}
        onPress={() => setBookingOffer(item)}
      />
    ),
    [],
  );

  const advancedActive = body !== 'All' || sort !== 'featured';
  const clearAdvanced = () => {
    setBody('All');
    setSort('featured');
  };

  const modeTabs = (
    <View style={styles.modeWrap}>
      <View style={styles.modeSegment}>
        {MODE_TABS.map((tab) => {
          const active = mode === tab.id;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setMode(tab.id)}
              style={[styles.modeItem, active && styles.modeItemActive]}>
              <Text
                style={[styles.modeText, active && styles.modeTextActive]}
                numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const bookFilters = (
    <View style={styles.controls}>
      <View style={styles.panel}>
        <View style={[styles.search, searchFocused && styles.searchFocused]}>
          <View style={styles.searchIcon}>
            <Ionicons name="search" size={15} color={AUTH_BLUE} />
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search by model"
            placeholderTextColor="rgba(10,24,72,0.35)"
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={8}
              accessibilityLabel="Clear search"
              style={styles.clearBtn}>
              <Ionicons name="close" size={14} color={AUTH_BLUE} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.segment}>
          {GROUP_FILTERS.map((f) => {
            const active = group === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setGroup(f.id)}
                style={[styles.segmentItem, active && styles.segmentItemActive]}>
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: advancedOpen }}
          onPress={() => setAdvancedOpen((v) => !v)}
          style={styles.advancedToggle}>
          <View style={styles.advancedLeft}>
            <Text style={styles.advancedLabel}>Advanced</Text>
            {advancedActive ? (
              <View style={styles.advancedBadge}>
                <Text style={styles.advancedBadgeText}>On</Text>
              </View>
            ) : (
              <Text style={styles.advancedHint}>Body · Availability</Text>
            )}
          </View>
          <Ionicons
            name={advancedOpen ? 'chevron-up' : 'chevron-down'}
            size={15}
            color="rgba(10,24,72,0.55)"
          />
        </Pressable>

        {advancedOpen ? (
          <View style={styles.advancedPanel}>
            <View style={styles.advancedBlock}>
              <Text style={styles.advancedHeading}>Body type</Text>
              <View style={styles.wrapChips}>
                {BODY_FILTERS.map((f) => {
                  const active = body === f.id;
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => setBody(f.id)}
                      style={[styles.softChip, active && styles.softChipActive]}>
                      <Text style={[styles.softChipText, active && styles.softChipTextActive]}>
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.advancedDivider} />

            <View style={styles.advancedBlock}>
              <Text style={styles.advancedHeading}>Sort by</Text>
              <View style={styles.wrapChips}>
                {DRIVE_SORT_OPTIONS.map((f) => {
                  const active = sort === f.id;
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => setSort(f.id)}
                      style={[styles.softChip, active && styles.softChipActive]}>
                      <Text style={[styles.softChipText, active && styles.softChipTextActive]}>
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {advancedActive ? (
              <Pressable onPress={clearAdvanced} style={styles.resetBtn} hitSlop={6}>
                <Text style={styles.resetText}>Reset filters</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      {modeTabs}

      {mode === 'scheduled' ? (
        <ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          bounces>
          {loadingRides && upcoming.length === 0 ? (
            <ActivityIndicator color={AUTH_BLUE} style={styles.ridesLoading} />
          ) : (
            <ScheduledRideStack
              key={upcoming[0]?.id ?? 'empty'}
              rides={upcoming}
              onBookPress={() => setMode('new')}
            />
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderModel}
          ListHeaderComponent={bookFilters}
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              {loadingModels ? (
                <ActivityIndicator color={AUTH_BLUE} />
              ) : (
                <>
                  <Text style={styles.emptyTitle}>
                    {modelError ? 'Models unavailable' : 'No models match'}
                  </Text>
                  <Text style={styles.emptyBody}>
                    {modelError ?? 'Try another search or clear advanced filters.'}
                  </Text>
                </>
              )}
            </View>
          }
        />
      )}

      <BookTestDriveModal
        visible={bookingOffer != null}
        offer={bookingOffer}
        onClose={closeBooking}
        onConfirm={confirmBooking}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  ridesLoading: {
    marginTop: 48,
  },
  modeWrap: {
    paddingHorizontal: PAD,
    paddingTop: 4,
    paddingBottom: 10,
    backgroundColor: SCREEN_BG,
  },
  modeSegment: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    gap: 2,
    shadowColor: '#0A1848',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  modeItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 9,
  },
  modeItemActive: {
    backgroundColor: AUTH_BLUE,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(10,24,72,0.45)',
    letterSpacing: -0.15,
    textAlign: 'center',
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  controls: {
    paddingBottom: 14,
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    gap: 10,
    shadowColor: '#0A1848',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: SCREEN_BG,
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 46,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  searchFocused: {
    borderColor: 'rgba(10,24,72,0.22)',
    backgroundColor: '#FFFFFF',
  },
  searchIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(10,24,72,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: AUTH_BLUE,
    paddingVertical: 10,
    letterSpacing: -0.1,
  },
  clearBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(10,24,72,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: SCREEN_BG,
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentItemActive: {
    backgroundColor: AUTH_BLUE,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(10,24,72,0.45)',
    letterSpacing: -0.1,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingTop: 2,
    paddingBottom: 2,
  },
  advancedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  advancedLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: AUTH_BLUE,
    letterSpacing: -0.1,
  },
  advancedHint: {
    fontSize: 12,
    color: 'rgba(10,24,72,0.35)',
    fontWeight: '500',
  },
  advancedBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(10,24,72,0.08)',
  },
  advancedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: AUTH_BLUE,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  advancedPanel: {
    marginTop: 2,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(10,24,72,0.08)',
    gap: 0,
  },
  advancedBlock: {
    gap: 8,
  },
  advancedDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(10,24,72,0.08)',
    marginVertical: 12,
  },
  advancedHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: 'rgba(10,24,72,0.4)',
  },
  wrapChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  softChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: SCREEN_BG,
  },
  softChipActive: {
    backgroundColor: 'rgba(10,24,72,0.1)',
  },
  softChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(10,24,72,0.55)',
  },
  softChipTextActive: {
    color: AUTH_BLUE,
    fontWeight: '700',
  },
  resetBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '700',
    color: AUTH_BLUE,
  },
  list: {
    paddingHorizontal: PAD,
    paddingTop: 2,
    paddingBottom: 120,
  },
  sep: {
    height: 20,
  },
  empty: {
    paddingTop: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AUTH_BLUE,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 13,
    color: '#8B90A0',
    textAlign: 'center',
  },
});
