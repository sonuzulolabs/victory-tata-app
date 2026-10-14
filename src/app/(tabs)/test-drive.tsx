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
import { requireAuth } from '@/lib/require-auth';
import {
  createRideFromBooking,
  driveTimeToApi,
  type DriveBooking,
  type DriveDateOption,
  type DriveTimeOption,
  type ScheduledRide,
} from '@/data/scheduledRides';
import { useInstantTracking } from '@/context/instant-tracking';
import { ApiError, fetchOffers, fetchTestDrives, submitTestDrive } from '@/lib/api';
import { submitInstantTestDrive } from '@/lib/api/testing';
import { isValidIndianMobile, mobileDigitsFromStored } from '@/lib/phone';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useRefreshControl } from '@/hooks/use-refresh-control';

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
  const { columns, gutter, isTablet, fs, lh } = useBreakpoint();
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
  const {
    setActiveFromBooking,
    refresh: refreshInstantTracking,
    syncPushTokenForPhone,
  } = useInstantTracking();

  const reloadTestDrive = useCallback(async () => {
    setLoadingRides(true);
    if (isValidIndianMobile(phone)) {
      try {
        const rides = await fetchTestDrives(phone);
        setUpcoming(rides);
      } catch {
        setUpcoming([]);
      } finally {
        setLoadingRides(false);
      }
      await refreshInstantTracking();
    } else {
      setUpcoming([]);
      setLoadingRides(false);
    }

    setLoadingModels(true);
    try {
      const offers = await fetchOffers({ query, group, body, sort });
      setResults(offers.map(asTestDriveModel));
      setModelError(null);
    } catch (err: unknown) {
      setModelError(err instanceof ApiError ? err.message : 'Could not load models.');
    } finally {
      setLoadingModels(false);
    }
  }, [body, group, phone, query, refreshInstantTracking, sort]);

  const { refreshControl } = useRefreshControl(reloadTestDrive);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const handle = setTimeout(() => {
        if (!cancelled) void reloadTestDrive();
      }, query.trim() ? 300 : 0);

      return () => {
        cancelled = true;
        clearTimeout(handle);
        show();
      };
    }, [query, reloadTestDrive, show]),
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
      const customerPhone = guestPhone || booking.bookerPhone || phone;
      if (!isValidIndianMobile(customerPhone)) {
        throw new Error('Add your mobile number before booking.');
      }
      const customerName = booking.guestName || profile?.name.trim() || 'Customer';

      if (booking.scheduleMode === 'now') {
        await syncPushTokenForPhone(customerPhone);
        const instant = await submitInstantTestDrive({
          customerName,
          customerPhone,
          carId: bookingOffer.carId,
          address: booking.location,
        });
        setActiveFromBooking(instant);
        void refreshInstantTracking();
        const ride = createRideFromBooking(bookingOffer, date, time, {
          ...booking,
          service: 'concierge',
        });
        return ride;
      }

      await submitTestDrive({
        customerName,
        customerPhone,
        carId: bookingOffer.carId,
        location: booking.location,
        scheduledDate: date.iso,
        scheduledTime: driveTimeToApi(time),
        service: booking.service,
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        referredByPhone: guestPhone ? phone || booking.bookerPhone : null,
      });
      const ride = createRideFromBooking(bookingOffer, date, time, booking);
      const accountPhone = booking.bookerPhone || phone;
      if (isValidIndianMobile(accountPhone)) {
        setUpcoming(await fetchTestDrives(accountPhone));
      } else {
        setUpcoming((prev) => [ride, ...prev]);
      }
      return ride;
    },
    [bookingOffer, phone, profile?.name],
  );

  const openBooking = useCallback(
    (item: Offer) => {
      if (!requireAuth(profile, 'Sign in first to book a test drive.')) {
        return;
      }
      setBookingOffer(item);
    },
    [profile],
  );

  const renderModel = useCallback(
    ({ item }: { item: Offer }) => (
      <View style={columns > 1 ? styles.gridCell : undefined}>
        <OfferListCard
          offer={item}
          compact={columns > 1}
          ctaLabel="Book test drive"
          showLikedBadge={false}
          onPress={() => openBooking(item)}
        />
      </View>
    ),
    [columns, openBooking],
  );

  const advancedActive = body !== 'All' || sort !== 'featured';
  const clearAdvanced = () => {
    setBody('All');
    setSort('featured');
  };

  const modeTabs = (
    <View style={[styles.modeWrap, { paddingHorizontal: gutter }]}>
      <View style={[styles.modeSegment, isTablet && styles.modeSegmentTablet]}>
        {MODE_TABS.map((tab) => {
          const active = mode === tab.id;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setMode(tab.id)}
              style={[
                styles.modeItem,
                active && styles.modeItemActive,
                isTablet && { paddingVertical: 14 },
              ]}>
              <Text
                style={[
                  styles.modeText,
                  active && styles.modeTextActive,
                  { fontSize: fs(15), lineHeight: lh(15, 1.3) },
                ]}
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
      <View style={[styles.panel, isTablet && styles.panelTablet]}>
        <View
          style={[
            styles.search,
            searchFocused && styles.searchFocused,
            isTablet && { minHeight: 54 },
          ]}>
          <View style={[styles.searchIcon, isTablet && styles.searchIconTablet]}>
            <Ionicons name="search" size={fs(16)} color={AUTH_BLUE} />
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search by model"
            placeholderTextColor="rgba(10,24,72,0.35)"
            style={[styles.searchInput, { fontSize: fs(16), lineHeight: lh(16, 1.3) }]}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={8}
              accessibilityLabel="Clear search"
              style={styles.clearBtn}>
              <Ionicons name="close" size={fs(14)} color={AUTH_BLUE} />
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
                style={[
                  styles.segmentItem,
                  active && styles.segmentItemActive,
                  isTablet && { paddingVertical: 12 },
                ]}>
                <Text
                  style={[
                    styles.segmentText,
                    active && styles.segmentTextActive,
                    { fontSize: fs(14) },
                  ]}>
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
            <Text style={[styles.advancedLabel, { fontSize: fs(14) }]}>Advanced</Text>
            {advancedActive ? (
              <View style={styles.advancedBadge}>
                <Text style={[styles.advancedBadgeText, { fontSize: fs(11) }]}>On</Text>
              </View>
            ) : (
              <Text style={[styles.advancedHint, { fontSize: fs(13) }]}>Body · Availability</Text>
            )}
          </View>
          <Ionicons
            name={advancedOpen ? 'chevron-up' : 'chevron-down'}
            size={fs(16)}
            color="rgba(10,24,72,0.55)"
          />
        </Pressable>

        {advancedOpen ? (
          <View style={styles.advancedPanel}>
            <View style={styles.advancedBlock}>
              <Text style={[styles.advancedHeading, { fontSize: fs(12) }]}>Body type</Text>
              <View style={styles.wrapChips}>
                {BODY_FILTERS.map((f) => {
                  const active = body === f.id;
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => setBody(f.id)}
                      style={[
                        styles.softChip,
                        active && styles.softChipActive,
                        isTablet && styles.softChipTablet,
                      ]}>
                      <Text
                        style={[
                          styles.softChipText,
                          active && styles.softChipTextActive,
                          { fontSize: fs(14) },
                        ]}>
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.advancedDivider} />

            <View style={styles.advancedBlock}>
              <Text style={[styles.advancedHeading, { fontSize: fs(12) }]}>Sort by</Text>
              <View style={styles.wrapChips}>
                {DRIVE_SORT_OPTIONS.map((f) => {
                  const active = sort === f.id;
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => setSort(f.id)}
                      style={[
                        styles.softChip,
                        active && styles.softChipActive,
                        isTablet && styles.softChipTablet,
                      ]}>
                      <Text
                        style={[
                          styles.softChipText,
                          active && styles.softChipTextActive,
                          { fontSize: fs(14) },
                        ]}>
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {advancedActive ? (
              <Pressable onPress={clearAdvanced} style={styles.resetBtn} hitSlop={6}>
                <Text style={[styles.resetText, { fontSize: fs(13) }]}>Reset filters</Text>
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
          refreshControl={refreshControl}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.list,
            { paddingHorizontal: gutter, paddingBottom: isTablet ? 140 : 120 },
          ]}
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
          key={`drive-${columns}`}
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderModel}
          extraData={profile}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.columnWrap : undefined}
          ListHeaderComponent={bookFilters}
          refreshControl={refreshControl}
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.list,
            { paddingHorizontal: gutter, paddingBottom: isTablet ? 140 : 120 },
          ]}
          ItemSeparatorComponent={columns > 1 ? undefined : () => <View style={styles.sep} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              {loadingModels ? (
                <ActivityIndicator color={AUTH_BLUE} />
              ) : (
                <>
                  <Text style={[styles.emptyTitle, { fontSize: fs(17), lineHeight: lh(17, 1.3) }]}>
                    {modelError ? 'Models unavailable' : 'No models match'}
                  </Text>
                  <Text style={[styles.emptyBody, { fontSize: fs(14), lineHeight: lh(14, 1.4) }]}>
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
  modeSegmentTablet: {
    borderRadius: 14,
    padding: 5,
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
  panelTablet: {
    borderRadius: 18,
    padding: 16,
    gap: 12,
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
  searchIconTablet: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
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
    fontWeight: '700',
    color: AUTH_BLUE,
    letterSpacing: -0.1,
  },
  advancedHint: {
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
  softChipTablet: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  softChipActive: {
    backgroundColor: 'rgba(10,24,72,0.1)',
  },
  softChipText: {
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
    fontWeight: '700',
    color: AUTH_BLUE,
  },
  list: {
    paddingTop: 2,
  },
  columnWrap: {
    gap: 14,
    marginBottom: 20,
    justifyContent: 'flex-start',
  },
  gridCell: {
    width: '48.5%',
    flexGrow: 0,
    flexShrink: 0,
  },
  sep: {
    height: 20,
  },
  empty: {
    paddingTop: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    fontWeight: '700',
    color: AUTH_BLUE,
    marginBottom: 6,
  },
  emptyBody: {
    color: '#8B90A0',
    textAlign: 'center',
  },
});
