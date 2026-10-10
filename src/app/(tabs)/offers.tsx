import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { OfferListCard } from '@/components/offer-list-card';
import { AUTH_BLUE, SCREEN_BG } from '@/constants/brand';
import { useLikedOffers } from '@/context/liked-offers';
import { useTabBarVisibility } from '@/context/tab-bar-visibility';
import { useUserProfile } from '@/context/user-profile';
import {
  BODY_FILTERS,
  GROUP_FILTERS,
  SORT_OPTIONS,
  type Offer,
  type OfferBody,
  type OfferGroup,
  type OfferSort,
} from '@/data/offers';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { ApiError, fetchOffers } from '@/lib/api';
import { mobileDigitsFromStored } from '@/lib/phone';

const SCROLL_THRESHOLD = 8;

export default function OffersScreen() {
  const { show, hide } = useTabBarVisibility();
  const { setLiked } = useLikedOffers();
  const { profile } = useUserProfile();
  const { columns, gutter, isTablet, fs, lh } = useBreakpoint();
  const lastY = useRef(0);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<'All' | OfferGroup>('All');
  const [body, setBody] = useState<'All' | OfferBody>('All');
  const [sort, setSort] = useState<OfferSort>('featured');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [results, setResults] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const phone = mobileDigitsFromStored(profile?.phone ?? '');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const handle = setTimeout(() => {
        setLoading(true);
        void fetchOffers({ query, group, body, sort, phone: phone || undefined })
          .then((offers) => {
            if (cancelled) return;
            setResults(offers);
            setError(null);
            for (const offer of offers) {
              if (offer.liked) setLiked(offer.id, true);
            }
          })
          .catch((err: unknown) => {
            if (cancelled) return;
            setError(err instanceof ApiError ? err.message : 'Could not load offers.');
          })
          .finally(() => {
            if (!cancelled) setLoading(false);
          });
      }, query.trim() ? 300 : 0);

      return () => {
        cancelled = true;
        clearTimeout(handle);
        show();
      };
    }, [query, group, body, sort, phone, setLiked, show]),
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

  const renderItem = useCallback(
    ({ item }: { item: Offer }) => (
      <View style={columns > 1 ? styles.gridCell : undefined}>
        <OfferListCard
          offer={item}
          compact={columns > 1}
          onPress={() =>
            router.push({
              pathname: '/offer/[id]',
              params: { id: item.id },
            })
          }
        />
      </View>
    ),
    [columns],
  );

  const advancedActive = body !== 'All' || sort !== 'featured';
  const clearAdvanced = () => {
    setBody('All');
    setSort('featured');
  };

  const listHeader = (
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
            placeholder="Search by model or benefit"
            placeholderTextColor="rgba(10,24,72,0.35)"
            style={[styles.searchInput, { fontSize: fs(15), lineHeight: lh(15, 1.3), minHeight: isTablet ? 52 : undefined }]}
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
                <Text style={[styles.segmentText, active && styles.segmentTextActive, { fontSize: fs(13) }]}>
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
            <Text style={[styles.advancedLabel, { fontSize: fs(13) }]}>Advanced</Text>
            {advancedActive ? (
              <View style={styles.advancedBadge}>
                <Text style={[styles.advancedBadgeText, { fontSize: fs(10) }]}>On</Text>
              </View>
            ) : (
              <Text style={[styles.advancedHint, { fontSize: fs(12) }]}>Body · Sort</Text>
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
                {SORT_OPTIONS.map((f) => {
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
      <FlatList
        key={`offers-${columns}`}
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.columnWrap : undefined}
        ListHeaderComponent={listHeader}
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
            {loading ? (
              <ActivityIndicator color={AUTH_BLUE} />
            ) : (
              <>
                <Text style={styles.emptyTitle}>{error ? 'Offers unavailable' : 'No offers match'}</Text>
                <Text style={styles.emptyBody}>
                  {error ?? 'Try another search or clear advanced filters.'}
                </Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BG,
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
    paddingTop: 6,
  },
  columnWrap: {
    gap: 14,
    marginBottom: 14,
    justifyContent: 'flex-start',
  },
  gridCell: {
    width: '48.5%',
    flexGrow: 0,
    flexShrink: 0,
  },
  sep: {
    height: 14,
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
