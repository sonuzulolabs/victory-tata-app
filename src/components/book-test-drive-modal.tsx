import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AUTH_BLUE, SCREEN_BG } from '@/constants/brand';
import { useUserProfile } from '@/context/user-profile';
import { getOfferImage, type Offer } from '@/data/offers';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import {
  DRIVE_DATE_OPTIONS,
  DRIVE_TIME_OPTIONS,
  SHOWROOMS,
  driveServiceLabel,
  type DriveBooking,
  type DriveDateOption,
  type DriveService,
  type DriveTimeOption,
  type ScheduledRide,
} from '@/data/scheduledRides';
import { fetchDealership } from '@/lib/api';
import { requireAuth } from '@/lib/require-auth';
import {
  formatPhoneDisplay,
  formatPhoneInput,
  isValidIndianMobile,
  mobileDigitsFromStored,
  phoneDigits,
} from '@/lib/phone';

const SERVICE_OPTIONS: {
  id: DriveService;
  title: string;
  caption: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    id: 'instore',
    title: 'In-store test drive',
    caption: 'At the Victory Tata showroom',
    icon: 'business-outline',
  },
  {
    id: 'concierge',
    title: 'Concierge service',
    caption: 'We bring the car to you',
    icon: 'car-outline',
  },
];

type Step = 'book' | 'done';

type Props = {
  visible: boolean;
  offer: Offer | null;
  onClose: (didBook?: boolean) => void;
  onConfirm: (
    date: DriveDateOption,
    time: DriveTimeOption,
    booking: DriveBooking,
  ) => Promise<ScheduledRide>;
};

export function BookTestDriveModal({ visible, offer, onClose, onConfirm }: Props) {
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, isTablet, fs, lh } = useBreakpoint();
  const scrollRef = useRef<ScrollView>(null);
  const scrollFrameRef = useRef<View>(null);
  const scrollY = useRef(0);
  const keyboardTop = useRef(Dimensions.get('screen').height);
  const focusedRef = useRef<TextInput | null>(null);
  const showroomRef = useRef<View>(null);
  const addressRef = useRef<View>(null);
  const addressInputRef = useRef<TextInput>(null);
  const guestRef = useRef<View>(null);
  const guestNameRef = useRef<TextInput>(null);
  const guestMobileRef = useRef<TextInput>(null);
  const ownPhoneRef = useRef<TextInput>(null);
  const { profile, updateProfile } = useUserProfile();
  const [keyboardPad, setKeyboardPad] = useState(0);
  const [step, setStep] = useState<Step>('book');
  const [date, setDate] = useState<DriveDateOption>(DRIVE_DATE_OPTIONS[0]);
  const [time, setTime] = useState<DriveTimeOption>(DRIVE_TIME_OPTIONS[1]);
  const [service, setService] = useState<DriveService | null>(null);
  const [showrooms, setShowrooms] = useState<{ id: string; label: string }[]>([...SHOWROOMS]);
  const [showroomId, setShowroomId] = useState<string | null>(null);
  const [conciergeAddress, setConciergeAddress] = useState('');
  const [forSomeoneElse, setForSomeoneElse] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestMobile, setGuestMobile] = useState('');
  const [ownMobile, setOwnMobile] = useState('');
  const [ride, setRide] = useState<ScheduledRide | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setStep('book');
      setDate(DRIVE_DATE_OPTIONS[0]);
      setTime(DRIVE_TIME_OPTIONS[1]);
      setService(null);
      setShowroomId(null);
      setConciergeAddress('');
      setForSomeoneElse(false);
      setGuestName('');
      setGuestMobile('');
      setOwnMobile('');
      setRide(null);
      setSubmitting(false);
      setError(null);
    }
  }, [visible, offer?.id]);

  useEffect(() => {
    if (!visible) return;
    void fetchDealership()
      .then((dealership) => {
        if (dealership.showrooms.length > 0) setShowrooms(dealership.showrooms);
      })
      .catch(() => {});
  }, [visible]);

  const reveal = useCallback((node: View | TextInput | null, align: 'start' | 'above-keyboard') => {
    if (!node) return;
    const run = () => {
      node.measureInWindow((_x, y, _width, height) => {
        const frame = scrollFrameRef.current;
        const scroll = scrollRef.current;
        if (!frame || !scroll) return;
        frame.measureInWindow((_sx, sy, _sw, sh) => {
          const gap = 12;
          const limitBottom = Math.min(sy + sh, keyboardTop.current) - gap;
          const limitTop = sy + 4;
          const delta =
            align === 'above-keyboard'
              ? y + height - limitBottom
              : height <= limitBottom - limitTop
                ? y < limitTop
                  ? y - limitTop
                  : y + height > limitBottom
                    ? y + height - limitBottom
                    : 0
                : y - limitTop;
          if (Math.abs(delta) < 4) return;
          scroll.scrollTo({ y: Math.max(0, scrollY.current + delta), animated: true });
        });
      });
    };
    requestAnimationFrame(() => {
      setTimeout(run, 60);
    });
  }, []);

  const scrollAboveKeyboard = useCallback((node: View | TextInput | null) => {
    reveal(node, 'above-keyboard');
  }, [reveal]);

  const focusField = (input: TextInput | null) => {
    focusedRef.current = input;
    const keyboardOpen = keyboardTop.current < Dimensions.get('screen').height - 20;
    if (keyboardOpen) scrollAboveKeyboard(input);
  };

  useEffect(() => {
    if (!visible) {
      keyboardTop.current = Dimensions.get('screen').height;
      setKeyboardPad(0);
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      keyboardTop.current = event.endCoordinates.screenY;
      setKeyboardPad(Math.max(0, Dimensions.get('screen').height - event.endCoordinates.screenY));
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardTop.current = Dimensions.get('screen').height;
      setKeyboardPad(0);
      focusedRef.current = null;
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  useEffect(() => {
    if (!visible || keyboardPad === 0 || !focusedRef.current) return;
    const id = setTimeout(() => scrollAboveKeyboard(focusedRef.current), 120);
    return () => clearTimeout(id);
  }, [keyboardPad, scrollAboveKeyboard, visible]);

  if (!offer) return null;

  const dismiss = () => {
    onClose(step === 'done');
  };

  const location =
    service === 'instore'
      ? (showrooms.find((item) => item.id === showroomId)?.label ?? '')
      : service === 'concierge'
        ? conciergeAddress.trim()
        : '';
  const guestDigits = phoneDigits(guestMobile);
  const savedPhone = mobileDigitsFromStored(profile?.phone ?? '');
  const needsOwnPhone = !forSomeoneElse && !isValidIndianMobile(savedPhone);
  const ownDigits = phoneDigits(ownMobile);
  const ownReady = !needsOwnPhone || isValidIndianMobile(ownDigits);
  const guestReady =
    !forSomeoneElse || (guestName.trim().length >= 2 && isValidIndianMobile(guestDigits));
  const canConfirm = Boolean(service && location && guestReady && ownReady);

  const handleConfirm = async () => {
    if (!profile) {
      onClose(false);
      // Close booking sheet first so the sign-in dialog isn't covered by it.
      requestAnimationFrame(() => {
        requireAuth(null, 'Sign in first to book a test drive.');
      });
      return;
    }
    if (!service || !canConfirm || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (needsOwnPhone) {
        updateProfile({ phone: formatPhoneDisplay(ownDigits) });
      }
      const booked = await onConfirm(date, time, {
        service,
        location,
        guestName: forSomeoneElse ? guestName.trim() : null,
        guestPhone: forSomeoneElse ? guestDigits : null,
        bookerPhone: needsOwnPhone ? ownDigits : null,
      });
      setRide(booked);
      setStep('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not book this test drive.');
    } finally {
      setSubmitting(false);
    }
  };

  const bottomPad = Math.max(insets.bottom, 16);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={dismiss}
      statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={styles.backdrop}
          onPress={dismiss}
        />

        <View
          style={[
            styles.sheet,
            {
              paddingBottom: bottomPad,
              maxWidth: contentMaxWidth,
              alignSelf: 'center',
              width: '100%',
              borderTopLeftRadius: isTablet ? 32 : 28,
              borderTopRightRadius: isTablet ? 32 : 28,
              ...(isTablet
                ? {
                    borderBottomLeftRadius: 24,
                    borderBottomRightRadius: 24,
                    marginBottom: Math.max(insets.bottom, 16),
                    marginHorizontal: 24,
                  }
                : null),
            },
            keyboardPad > 0 && {
              marginBottom: keyboardPad,
              maxHeight: Dimensions.get('screen').height - keyboardPad - 8,
            },
          ]}>
          <View style={styles.handle} />

          {step === 'book' ? (
            <>
              <View style={styles.topBar}>
                <Text style={[styles.sheetLabel, { fontSize: fs(13), lineHeight: lh(13, 1.3) }]}>
                  Book test drive
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={dismiss}
                  hitSlop={10}
                  style={styles.closeBtn}>
                  <Ionicons name="close" size={fs(18)} color={AUTH_BLUE} />
                </Pressable>
              </View>

              <View style={styles.vehicleCard}>
                <View style={styles.vehicleCopy}>
                  <Text
                    style={[styles.vehicleName, { fontSize: fs(22), lineHeight: lh(22, 1.2) }]}
                    numberOfLines={1}>
                    {offer.kicker}
                  </Text>
                  <Text
                    style={[styles.vehicleMeta, { fontSize: fs(14), lineHeight: lh(14, 1.3) }]}
                    numberOfLines={1}>
                    {offer.modelLine}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={styles.metaPill}>
                      <Text style={[styles.metaPillText, { fontSize: fs(11) }]}>{offer.group}</Text>
                    </View>
                    <Text style={[styles.metaDot, { fontSize: fs(13) }]}>·</Text>
                    <Text style={[styles.metaSoft, { fontSize: fs(13) }]}>Free 45 min</Text>
                  </View>
                </View>
                <Image
                  source={getOfferImage(offer)}
                  style={styles.vehicleThumb}
                  contentFit="contain"
                />
              </View>

              <View ref={scrollFrameRef} style={styles.scrollFrame} collapsable={false}>
              <ScrollView
                ref={scrollRef}
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                bounces={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                onScroll={(event) => {
                  scrollY.current = event.nativeEvent.contentOffset.y;
                }}
                scrollEventThrottle={16}
                contentContainerStyle={[styles.scrollBody, { paddingBottom: 8 + keyboardPad }]}>
                {needsOwnPhone ? (
                  <View>
                    <Text style={[styles.sectionLabel, { fontSize: fs(14) }]}>Your mobile number</Text>
                    <Text style={[styles.ownPhoneHint, { fontSize: fs(13), lineHeight: lh(13, 1.4) }]}>
                      Add your number to book this test drive for yourself.
                    </Text>
                    <View style={[styles.phoneRow, ownMobile.length > 0 && !ownReady && styles.fieldError]}>
                      <Text style={styles.phonePrefix}>+91</Text>
                      <TextInput
                        ref={ownPhoneRef}
                        value={ownMobile}
                        onChangeText={(value) => setOwnMobile(formatPhoneInput(value))}
                        onFocus={() => focusField(ownPhoneRef.current)}
                        placeholder="98765 43210"
                        placeholderTextColor="rgba(10,24,72,0.35)"
                        keyboardType="phone-pad"
                        maxLength={11}
                        style={styles.phoneInput}
                        accessibilityLabel="Your mobile number"
                      />
                    </View>
                  </View>
                ) : null}
                <Text style={[styles.sectionLabel, needsOwnPhone && styles.sectionGap, { fontSize: fs(14) }]}>Date</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dateRow}>
                  {DRIVE_DATE_OPTIONS.map((d) => {
                    const active = date.id === d.id;
                    return (
                      <Pressable
                        key={d.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        onPress={() => setDate(d)}
                        style={[styles.dateCard, active && styles.dateCardActive]}>
                        <Text
                          style={[
                            styles.dateWeekday,
                            active && styles.dateWeekdayActive,
                            { fontSize: fs(12) },
                          ]}>
                          {d.weekday}
                        </Text>
                        <Text style={[styles.dateDay, active && styles.dateDayActive, { fontSize: fs(22) }]}>
                          {d.day}
                        </Text>
                        <Text
                          style={[
                            styles.dateMonth,
                            active && styles.dateMonthActive,
                            { fontSize: fs(12) },
                          ]}>
                          {d.month}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Text style={[styles.sectionLabel, styles.sectionGap, { fontSize: fs(14) }]}>Time</Text>
                <View style={styles.timeRow}>
                  {DRIVE_TIME_OPTIONS.map((t) => {
                    const active = time === t;
                    return (
                      <Pressable
                        key={t}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        onPress={() => setTime(t)}
                        style={[styles.timeChip, active && styles.timeChipActive]}>
                        <Text style={[styles.timeText, active && styles.timeTextActive, { fontSize: fs(14) }]}>
                          {t}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.sectionLabel, styles.sectionGap, { fontSize: fs(14) }]}>Service</Text>
                <View style={styles.serviceList}>
                  {SERVICE_OPTIONS.map((option) => {
                    const active = service === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        onPress={() => {
                          setService(option.id);
                          setTimeout(() => {
                            reveal(
                              option.id === 'instore' ? showroomRef.current : addressRef.current,
                              'start',
                            );
                          }, 120);
                        }}
                        style={[styles.serviceCard, active && styles.serviceCardActive]}>
                        <View style={[styles.serviceIcon, active && styles.serviceIconActive]}>
                          <Ionicons
                            name={option.icon}
                            size={18}
                            color={active ? '#FFFFFF' : AUTH_BLUE}
                          />
                        </View>
                        <View style={styles.serviceCopy}>
                          <Text style={[styles.serviceTitle, active && styles.serviceTitleActive, { fontSize: fs(15) }]}>
                            {option.title}
                          </Text>
                          <Text style={[styles.serviceCaption, active && styles.serviceCaptionActive, { fontSize: fs(13), lineHeight: lh(13, 1.35) }]}>
                            {option.caption}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {service === 'instore' ? (
                  <View ref={showroomRef} collapsable={false}>
                    <Text style={[styles.sectionLabel, styles.sectionGap, { fontSize: fs(14) }]}>Showroom</Text>
                    <View style={styles.serviceList}>
                      {showrooms.map((item) => {
                        const active = showroomId === item.id;
                        return (
                          <Pressable
                            key={item.id}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                            onPress={() => setShowroomId(item.id)}
                            style={[styles.serviceCard, active && styles.serviceCardActive]}>
                            <View style={[styles.serviceIcon, active && styles.serviceIconActive]}>
                              <Ionicons
                                name="location-outline"
                                size={18}
                                color={active ? '#FFFFFF' : AUTH_BLUE}
                              />
                            </View>
                            <Text
                              style={[
                                styles.serviceTitle,
                                active && styles.serviceTitleActive,
                                { fontSize: fs(15) },
                              ]}>
                              {item.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {service === 'concierge' ? (
                  <View ref={addressRef} collapsable={false}>
                    <Text style={[styles.sectionLabel, styles.sectionGap, { fontSize: fs(14) }]}>Address</Text>
                    <TextInput
                      ref={addressInputRef}
                      value={conciergeAddress}
                      onChangeText={setConciergeAddress}
                      onFocus={() => focusField(addressInputRef.current)}
                      placeholder="House no., street, area"
                      placeholderTextColor="rgba(10,24,72,0.35)"
                      style={styles.field}
                      accessibilityLabel="Concierge address"
                    />
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: forSomeoneElse }}
                  onPress={() => {
                    const next = !forSomeoneElse;
                    setForSomeoneElse(next);
                    if (!next) return;
                    setTimeout(() => {
                      const keyboardOpen = keyboardTop.current < Dimensions.get('screen').height - 20;
                      if (keyboardOpen) scrollAboveKeyboard(guestRef.current);
                      else reveal(guestRef.current, 'start');
                    }, 120);
                  }}
                  style={styles.guestToggle}>
                  <View style={[styles.guestBox, forSomeoneElse && styles.guestBoxOn]}>
                    {forSomeoneElse ? (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    ) : null}
                  </View>
                  <Text style={[styles.guestToggleText, { fontSize: fs(15) }]}>
                    Book for someone else
                  </Text>
                </Pressable>

                {forSomeoneElse ? (
                  <View ref={guestRef} collapsable={false} style={styles.guestFields}>
                    <TextInput
                      ref={guestNameRef}
                      value={guestName}
                      onChangeText={setGuestName}
                      onFocus={() => focusField(guestNameRef.current)}
                      placeholder="Name"
                      placeholderTextColor="rgba(10,24,72,0.35)"
                      style={styles.field}
                      accessibilityLabel="Guest name"
                      autoCapitalize="words"
                    />
                    <TextInput
                      ref={guestMobileRef}
                      value={guestMobile}
                      onChangeText={(value) => setGuestMobile(formatPhoneInput(value))}
                      onFocus={() => focusField(guestMobileRef.current)}
                      placeholder="Mobile number"
                      placeholderTextColor="rgba(10,24,72,0.35)"
                      style={styles.field}
                      accessibilityLabel="Guest mobile"
                      keyboardType="phone-pad"
                      maxLength={11}
                    />
                  </View>
                ) : null}
              </ScrollView>
              </View>

              <View style={styles.footer}>
                {error ? <Text style={styles.formError}>{error}</Text> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Confirm booking"
                  accessibilityState={{ disabled: !canConfirm || submitting }}
                  disabled={!canConfirm || submitting}
                  onPress={() => {
                    void handleConfirm();
                  }}
                  style={({ pressed }) => [
                    styles.cta,
                    { opacity: !canConfirm || submitting ? 0.4 : pressed ? 0.92 : 1 },
                  ]}>
                  <Text style={[styles.ctaText, { fontSize: fs(16) }]}>{submitting ? 'Booking…' : 'Confirm booking'}</Text>
                </Pressable>
              </View>
            </>
          ) : ride ? (
            <View style={styles.doneBody}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={dismiss}
                hitSlop={10}
                style={styles.doneClose}>
                <Ionicons name="close" size={18} color={AUTH_BLUE} />
              </Pressable>

              <View style={styles.doneIcon}>
                <Ionicons name="checkmark" size={28} color="#FFFFFF" />
              </View>

              <Text style={[styles.doneTitle, { fontSize: fs(24), lineHeight: lh(24, 1.2) }]}>
                Test drive confirmed
              </Text>
              <Text style={[styles.doneBodyText, { fontSize: fs(15), lineHeight: lh(15, 1.4) }]}>
                {ride.guestName
                  ? `Booked for ${ride.guestName}.`
                  : `Your ${offer.kicker} ${service ? driveServiceLabel(service).toLowerCase() : ''} slot is locked. Bring a valid licence.`}
              </Text>

              <View style={styles.ticket}>
                <Image source={ride.image} style={styles.ticketThumb} contentFit="contain" />
                <View style={styles.ticketCopy}>
                  <Text
                    style={[styles.ticketVehicle, { fontSize: fs(16), lineHeight: lh(16, 1.25) }]}
                    numberOfLines={1}>
                    {ride.vehicleName}
                  </Text>
                  <Text style={[styles.ticketWhen, { fontSize: fs(14) }]}>
                    {ride.weekday} {ride.day} {ride.month} · {ride.time}
                  </Text>
                  <Text
                    style={[styles.ticketWhere, { fontSize: fs(13), lineHeight: lh(13, 1.35) }]}
                    numberOfLines={2}>
                    {ride.location}
                  </Text>
                  {ride.guestName ? (
                    <Text style={styles.ticketWhere} numberOfLines={1}>
                      For {ride.guestName}
                      {ride.guestPhone ? ` · +91 ${formatPhoneInput(ride.guestPhone)}` : ''}
                    </Text>
                  ) : null}
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done"
                onPress={dismiss}
                style={({ pressed }) => [styles.cta, styles.ctaDone, { opacity: pressed ? 0.92 : 1 }]}>
                <Text style={[styles.ctaText, { fontSize: fs(16) }]}>Done</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(10,24,72,0.48)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    maxHeight: '86%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(10,24,72,0.14)',
    marginBottom: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 16,
  },
  sheetLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(10,24,72,0.4)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SCREEN_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleCard: {
    marginHorizontal: 24,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: SCREEN_BG,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehicleCopy: {
    flex: 1,
    minWidth: 0,
  },
  vehicleName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: AUTH_BLUE,
  },
  vehicleMeta: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(10,24,72,0.48)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  metaPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(10,24,72,0.08)',
  },
  metaPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: AUTH_BLUE,
  },
  metaDot: {
    fontSize: 12,
    color: 'rgba(10,24,72,0.28)',
  },
  metaSoft: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(10,24,72,0.45)',
  },
  vehicleThumb: {
    width: 88,
    height: 52,
  },
  scrollFrame: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollBody: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
    color: AUTH_BLUE,
    marginBottom: 12,
  },
  sectionGap: {
    marginTop: 24,
  },
  dateRow: {
    gap: 8,
    paddingRight: 8,
  },
  dateCard: {
    width: 56,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: SCREEN_BG,
  },
  dateCardActive: {
    backgroundColor: AUTH_BLUE,
  },
  dateWeekday: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: 'rgba(10,24,72,0.4)',
  },
  dateWeekdayActive: {
    color: 'rgba(255,255,255,0.65)',
  },
  dateDay: {
    marginTop: 4,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: AUTH_BLUE,
  },
  dateDayActive: {
    color: '#FFFFFF',
  },
  dateMonth: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(10,24,72,0.38)',
  },
  dateMonthActive: {
    color: 'rgba(255,255,255,0.6)',
  },
  timeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: SCREEN_BG,
  },
  timeChipActive: {
    backgroundColor: AUTH_BLUE,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(10,24,72,0.55)',
    letterSpacing: -0.1,
  },
  timeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  serviceList: {
    gap: 8,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: SCREEN_BG,
  },
  serviceCardActive: {
    backgroundColor: AUTH_BLUE,
  },
  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(10,24,72,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceIconActive: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  serviceCopy: {
    flex: 1,
    minWidth: 0,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: AUTH_BLUE,
    letterSpacing: -0.1,
  },
  serviceTitleActive: {
    color: '#FFFFFF',
  },
  serviceCaption: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(10,24,72,0.48)',
  },
  serviceCaptionActive: {
    color: 'rgba(255,255,255,0.72)',
  },
  field: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: SCREEN_BG,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '500',
    color: AUTH_BLUE,
  },
  ownPhoneHint: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(10,24,72,0.5)',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SCREEN_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(10,24,72,0.08)',
    overflow: 'hidden',
  },
  phonePrefix: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '600',
    color: AUTH_BLUE,
    borderRightWidth: 1,
    borderRightColor: 'rgba(10,24,72,0.08)',
  },
  phoneInput: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '500',
    color: AUTH_BLUE,
  },
  fieldError: {
    borderColor: '#DC2626',
  },
  guestToggle: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guestBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(10,24,72,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestBoxOn: {
    backgroundColor: AUTH_BLUE,
    borderColor: AUTH_BLUE,
  },
  guestToggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: AUTH_BLUE,
  },
  guestFields: {
    marginTop: 12,
    gap: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(10,24,72,0.08)',
  },
  formError: {
    marginBottom: 10,
    fontSize: 13,
    lineHeight: 18,
    color: '#B42318',
  },
  cta: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AUTH_BLUE,
    borderRadius: 14,
    minHeight: 52,
    width: '100%',
  },
  ctaDone: {
    marginTop: 8,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  doneBody: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 4,
  },
  doneClose: {
    position: 'absolute',
    top: 4,
    right: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SCREEN_BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  doneIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AUTH_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  doneTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.45,
    color: AUTH_BLUE,
    textAlign: 'center',
    marginBottom: 10,
  },
  doneBodyText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    color: 'rgba(10,24,72,0.5)',
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 12,
  },
  ticket: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: SCREEN_BG,
    marginBottom: 24,
  },
  ticketThumb: {
    width: 72,
    height: 48,
  },
  ticketCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  ticketVehicle: {
    fontSize: 14,
    fontWeight: '700',
    color: AUTH_BLUE,
  },
  ticketWhen: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(10,24,72,0.65)',
  },
  ticketWhere: {
    fontSize: 12,
    color: 'rgba(10,24,72,0.42)',
  },
});
