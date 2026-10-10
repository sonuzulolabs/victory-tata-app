import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  findNodeHandle,
  Keyboard,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AUTH_BLUE, AUTH_BLUE_SOFT, SCREEN_BG } from '@/constants/brand';
import { useTabBarVisibility } from '@/context/tab-bar-visibility';
import { useUserProfile } from '@/context/user-profile';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import {
  formatInr,
  formatReferralDate,
  getCreditSummary,
  isValidIndianMobile,
  maskPhone,
  REFERRAL_STATUS_LABEL,
  statusTone,
  type Referral,
  type ReferralStatus,
} from '@/data/referrals';
import { ApiError, fetchReferrals, fetchVehicles, submitReferral, type VehicleOption } from '@/lib/api';
import { formatPhoneInput, mobileDigitsFromStored, phoneDigits } from '@/lib/phone';
import { requireAuth } from '@/lib/require-auth';

const TAB_PILL = 64;
const SCROLL_THRESHOLD = 8;

const TONE_STYLES: Record<
  ReturnType<typeof statusTone>,
  { bg: string; text: string }
> = {
  neutral: { bg: 'rgba(10,24,72,0.08)', text: AUTH_BLUE },
  progress: { bg: 'rgba(37,99,235,0.12)', text: '#1D4ED8' },
  success: { bg: 'rgba(5,150,105,0.12)', text: '#047857' },
  credit: { bg: 'rgba(180,83,9,0.14)', text: '#B45309' },
};

export default function ReferralsScreen() {
  const insets = useSafeAreaInsets();
  const { show, hide } = useTabBarVisibility();
  const { profile } = useUserProfile();
  const { gutter, isTablet, fs, lh } = useBreakpoint();
  const lastY = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const keyboardTop = useRef(Dimensions.get('screen').height);
  const focusedRef = useRef<TextInput | null>(null);
  const cityRef = useRef<TextInput>(null);
  const noteRef = useRef<TextInput>(null);
  const [keyboardPad, setKeyboardPad] = useState(0);

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const summary = useMemo(() => getCreditSummary(referrals), [referrals]);

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [vehicleId, setVehicleId] = useState<string | undefined>();
  const [city, setCity] = useState('');
  const [note, setNote] = useState('');
  const [showModels, setShowModels] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const referrerPhone = mobileDigitsFromStored(profile?.phone ?? '');
  const referrerReady = isValidIndianMobile(referrerPhone);
  const selectedVehicle = vehicles.find((item) => item.id === vehicleId);

  const tabClearance = TAB_PILL + Math.max(insets.bottom, 14) + 16;
  const phone = phoneDigits(mobile);
  const nameOk = name.trim().length >= 2;
  const phoneOk = isValidIndianMobile(phone);
  const canSubmit = nameOk && phoneOk && !submitting;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const nextVehicles = await fetchVehicles();
      setVehicles(nextVehicles);
      if (!referrerReady) {
        setReferrals([]);
        setLoadError(null);
        return;
      }
      const nextReferrals = await fetchReferrals(referrerPhone);
      setReferrals(nextReferrals);
      setLoadError(null);
    } catch (err: unknown) {
      setLoadError(err instanceof ApiError ? err.message : 'Could not load referrals.');
    } finally {
      setLoading(false);
    }
  }, [referrerPhone, referrerReady]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        show();
      };
    }, [refresh, show]),
  );

  const reveal = useCallback((node: TextInput | null) => {
    if (!node) return;
    const run = () => {
      node.measureInWindow((_x, y, _width, height) => {
        const scroll = scrollRef.current as (ScrollView & {
          measureInWindow?: (
            callback: (x: number, y: number, width: number, height: number) => void,
          ) => void;
        }) | null;
        if (!scroll?.measureInWindow) return;
        scroll.measureInWindow((_sx, sy, _sw, sh) => {
          const limitBottom = Math.min(sy + sh, keyboardTop.current) - 12;
          const delta = y + height - limitBottom;
          if (Math.abs(delta) < 4) return;
          scroll.scrollTo({ y: Math.max(0, scrollY.current + delta), animated: true });
        });
      });
    };
    requestAnimationFrame(() => {
      setTimeout(run, 60);
    });
  }, []);

  const scrollAboveKeyboard = useCallback(
    (node: TextInput | null) => {
      if (!node || !scrollRef.current) return;
      // findNodeHandle is native-only; web throws if called.
      if (Platform.OS !== 'web') {
        const handle = findNodeHandle(node);
        const scroll = scrollRef.current as ScrollView & {
          scrollResponderScrollNativeHandleToKeyboard?: (
            nodeHandle: number,
            additionalOffset?: number,
            preventNegativeScrollOffset?: boolean,
          ) => void;
        };
        if (handle != null && scroll.scrollResponderScrollNativeHandleToKeyboard) {
          scroll.scrollResponderScrollNativeHandleToKeyboard(handle, 16, true);
          return;
        }
      }
      reveal(node);
    },
    [reveal],
  );

  const focusField = (input: TextInput | null) => {
    focusedRef.current = input;
    scrollAboveKeyboard(input);
  };

  useFocusEffect(
    useCallback(() => {
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
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (keyboardPad === 0 || !focusedRef.current) return;
      const id = setTimeout(() => scrollAboveKeyboard(focusedRef.current), 40);
      return () => clearTimeout(id);
    }, [keyboardPad, scrollAboveKeyboard]),
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      scrollY.current = y;
      const dy = y - lastY.current;
      if (Math.abs(dy) < SCROLL_THRESHOLD) return;

      if (dy > 0 && y > 24) hide();
      else if (dy < 0) show();

      lastY.current = y;
    },
    [hide, show],
  );

  const onSubmit = async () => {
    if (!requireAuth(profile, 'Sign in first to refer a friend.')) {
      return;
    }
    setTouched(true);
    if (!nameOk || !phoneOk) return;
    if (!referrerReady) {
      Alert.alert('Add your mobile', 'Save a mobile number on your profile before referring.');
      return;
    }

    setSubmitting(true);
    try {
      const notes = [city.trim() && `City: ${city.trim()}`, note.trim()].filter(Boolean).join('\n');
      const result = await submitReferral({
        referrerName: profile?.name.trim() || 'Customer',
        referrerPhone,
        customerName: name.trim(),
        customerPhone: phone,
        carId: vehicleId,
        notes,
      });

      setName('');
      setMobile('');
      setVehicleId(undefined);
      setCity('');
      setNote('');
      setTouched(false);
      setShowModels(false);
      setFormOpen(false);
      await refresh();
      Alert.alert('Referral submitted', `${result.customerName} is with Victory sales now.`);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : 'Could not submit this referral.';
      Alert.alert(message.toLowerCase().includes('already') ? 'Already referred' : 'Unable to submit', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}>
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: tabClearance + 16 + keyboardPad,
            paddingHorizontal: gutter,
            paddingTop: isTablet ? 14 : 8,
            maxWidth: isTablet ? 760 : undefined,
            width: '100%',
            alignSelf: 'center',
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}>
        {/* Points credited + New referral */}
        <View style={[styles.mainCard, isTablet && styles.mainCardTablet]}>
          <View style={styles.creditRow}>
            <View style={styles.creditCopy}>
              <Text style={[styles.creditLabel, { fontSize: fs(14), lineHeight: lh(14, 1.3) }]}>
                Points credited
              </Text>
              <Text style={[styles.creditAmount, { fontSize: fs(32), lineHeight: lh(32, 1.15) }]}>
                {formatInr(summary.credited)}
              </Text>
            </View>
            <View style={[styles.creditIcon, isTablet && styles.creditIconTablet]}>
              <Ionicons name="wallet-outline" size={fs(22)} color={AUTH_BLUE} />
            </View>
          </View>

          <View style={[styles.cardDivider, isTablet && { marginVertical: 22 }]} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={formOpen ? 'Collapse new referral form' : 'Expand new referral form'}
            onPress={() => {
              setFormOpen((o) => !o);
            }}
            style={({ pressed }) => [styles.formToggle, { opacity: pressed ? 0.85 : 1 }]}>
            <View style={styles.formToggleCopy}>
              <Text style={[styles.formTitle, { fontSize: fs(18), lineHeight: lh(18, 1.25) }]}>
                New referral
              </Text>
              <Text style={[styles.formSub, { fontSize: fs(14), lineHeight: lh(14, 1.4) }]}>
                {formOpen
                  ? 'Share a lead — Victory follows up for you.'
                  : 'Tap to add a customer lead'}
              </Text>
            </View>
            <View style={[styles.formToggleIcon, isTablet && styles.formToggleIconTablet]}>
              <Ionicons
                name={formOpen ? 'chevron-up' : 'chevron-down'}
                size={fs(18)}
                color={AUTH_BLUE}
              />
            </View>
          </Pressable>

          {formOpen ? (
            <View style={[styles.formBody, isTablet && { marginTop: 22 }]}>
              <View style={isTablet ? styles.fieldRow : undefined}>
                <View style={isTablet ? styles.fieldHalf : undefined}>
                  <Text style={[styles.fieldLabel, { fontSize: fs(13), lineHeight: lh(13, 1.3) }]}>
                    Customer name
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Full name"
                    placeholderTextColor="rgba(10,24,72,0.35)"
                    autoCapitalize="words"
                    style={[
                      styles.input,
                      { fontSize: fs(16), paddingVertical: isTablet ? 16 : 13 },
                      touched && !nameOk && styles.inputError,
                    ]}
                    returnKeyType="next"
                  />
                </View>

                <View style={isTablet ? styles.fieldHalf : undefined}>
                  <Text style={[styles.fieldLabel, { fontSize: fs(13), lineHeight: lh(13, 1.3) }]}>
                    Mobile number
                  </Text>
                  <View
                    style={[
                      styles.phoneRow,
                      isTablet && { minHeight: 56 },
                      touched && !phoneOk && styles.inputError,
                    ]}>
                    <Text
                      style={[
                        styles.phonePrefix,
                        { fontSize: fs(16), paddingVertical: isTablet ? 16 : 13 },
                      ]}>
                      +91
                    </Text>
                    <TextInput
                      value={mobile}
                      onChangeText={(v) => setMobile(formatPhoneInput(v))}
                      placeholder="98765 43210"
                      placeholderTextColor="rgba(10,24,72,0.35)"
                      keyboardType="phone-pad"
                      maxLength={11}
                      style={[
                        styles.phoneInput,
                        { fontSize: fs(16), paddingVertical: isTablet ? 16 : 13 },
                      ]}
                    />
                  </View>
                </View>
              </View>

              <Text style={[styles.fieldLabel, { fontSize: fs(13), lineHeight: lh(13, 1.3) }]}>
                Interested model
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  Keyboard.dismiss();
                  setShowModels((s) => !s);
                }}
                style={({ pressed }) => [
                  styles.select,
                  { paddingVertical: isTablet ? 16 : 13, opacity: pressed ? 0.9 : 1 },
                ]}>
                <Text style={[styles.selectText, { fontSize: fs(16) }]}>
                  {selectedVehicle?.label ?? 'No preference'}
                </Text>
                <Ionicons
                  name={showModels ? 'chevron-up' : 'chevron-down'}
                  size={fs(16)}
                  color="rgba(10,24,72,0.45)"
                />
              </Pressable>
              {showModels ? (
                <View style={styles.modelList}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setVehicleId(undefined);
                      setShowModels(false);
                    }}
                    style={({ pressed }) => [
                      styles.modelChip,
                      isTablet && styles.modelChipTablet,
                      !vehicleId && styles.modelChipSelected,
                      { opacity: pressed ? 0.85 : 1 },
                    ]}>
                    <Text
                      style={[
                        styles.modelChipText,
                        { fontSize: fs(14) },
                        !vehicleId && styles.modelChipTextSelected,
                      ]}>
                      No preference
                    </Text>
                  </Pressable>
                  {vehicles.map((opt) => {
                    const selected = vehicleId === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        accessibilityRole="button"
                        onPress={() => {
                          setVehicleId(opt.id);
                          setShowModels(false);
                        }}
                        style={({ pressed }) => [
                          styles.modelChip,
                          isTablet && styles.modelChipTablet,
                          selected && styles.modelChipSelected,
                          { opacity: pressed ? 0.85 : 1 },
                        ]}>
                        <Text
                          style={[
                            styles.modelChipText,
                            { fontSize: fs(14) },
                            selected && styles.modelChipTextSelected,
                          ]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              <View style={isTablet ? styles.fieldRow : undefined}>
                <View style={isTablet ? styles.fieldHalf : undefined}>
                  <Text style={[styles.fieldLabel, { fontSize: fs(13), lineHeight: lh(13, 1.3) }]}>
                    City
                  </Text>
                  <TextInput
                    ref={cityRef}
                    value={city}
                    onChangeText={setCity}
                    onFocus={() => focusField(cityRef.current)}
                    placeholder="Tirupur"
                    placeholderTextColor="rgba(10,24,72,0.35)"
                    autoCapitalize="words"
                    style={[
                      styles.input,
                      { fontSize: fs(16), paddingVertical: isTablet ? 16 : 13 },
                    ]}
                    returnKeyType="next"
                  />
                </View>
                {isTablet ? <View style={styles.fieldHalf} /> : null}
              </View>

              <Text style={[styles.fieldLabel, { fontSize: fs(13), lineHeight: lh(13, 1.3) }]}>
                Note for sales
              </Text>
              <TextInput
                ref={noteRef}
                value={note}
                onChangeText={setNote}
                onFocus={() => focusField(noteRef.current)}
                placeholder="Preferred time, budget, etc."
                placeholderTextColor="rgba(10,24,72,0.35)"
                multiline
                style={[
                  styles.input,
                  styles.noteInput,
                  {
                    fontSize: fs(16),
                    paddingVertical: isTablet ? 16 : 13,
                    minHeight: isTablet ? 96 : 72,
                  },
                ]}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Submit referral"
                disabled={!canSubmit && touched}
                onPress={onSubmit}
                style={({ pressed }) => [
                  styles.submitBtn,
                  isTablet && styles.submitBtnTablet,
                  (!canSubmit || submitting) && styles.submitDisabled,
                  { opacity: pressed && canSubmit ? 0.9 : 1 },
                ]}>
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[styles.submitText, { fontSize: fs(16) }]}>Submit referral</Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Past referrals */}
        <View style={[styles.historyHead, isTablet && { marginBottom: 16 }]}>
          <Text style={[styles.historyTitle, { fontSize: fs(20), lineHeight: lh(20, 1.25) }]}>
            Past referrals
          </Text>
          {referrals.length > 0 ? (
            <Text style={[styles.historyCount, { fontSize: fs(14) }]}>{referrals.length}</Text>
          ) : null}
        </View>

        {loading && referrals.length === 0 ? (
          <View style={[styles.emptyCard, isTablet && styles.emptyCardTablet]}>
            <ActivityIndicator color={AUTH_BLUE} />
          </View>
        ) : loadError && referrals.length === 0 ? (
          <View style={[styles.emptyCard, isTablet && styles.emptyCardTablet]}>
            <Text style={[styles.emptyTitle, { fontSize: fs(16), lineHeight: lh(16, 1.3) }]}>
              Referrals unavailable
            </Text>
            <Text style={[styles.emptyBody, { fontSize: fs(14), lineHeight: lh(14, 1.4) }]}>
              {loadError}
            </Text>
          </View>
        ) : !referrerReady ? (
          <View style={[styles.emptyCard, isTablet && styles.emptyCardTablet]}>
            <Text style={[styles.emptyTitle, { fontSize: fs(16), lineHeight: lh(16, 1.3) }]}>
              Add your mobile number
            </Text>
            <Text style={[styles.emptyBody, { fontSize: fs(14), lineHeight: lh(14, 1.4) }]}>
              Referrals are matched to the phone number on your Victory profile.
            </Text>
          </View>
        ) : referrals.length === 0 ? (
          <View style={[styles.emptyCard, isTablet && styles.emptyCardTablet]}>
            <Text style={[styles.emptyTitle, { fontSize: fs(16), lineHeight: lh(16, 1.3) }]}>
              No referrals yet
            </Text>
            <Text style={[styles.emptyBody, { fontSize: fs(14), lineHeight: lh(14, 1.4) }]}>
              Add a friend or customer above to get started.
            </Text>
          </View>
        ) : (
          <View style={[styles.listCard, isTablet && styles.listCardTablet]}>
            {referrals.map((item, index) => (
              <ReferralRow
                key={item.id}
                referral={item}
                isLast={index === referrals.length - 1}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ReferralRow({ referral, isLast }: { referral: Referral; isLast: boolean }) {
  const { isTablet, fs, lh } = useBreakpoint();
  const tone = statusTone(referral.status);
  const chip = TONE_STYLES[tone];
  const credit =
    referral.status === 'Credited' && referral.creditAmount != null
      ? formatInr(referral.creditAmount)
      : null;

  return (
    <View style={[styles.row, isTablet && styles.rowTablet, isLast && styles.rowLast]}>
      <View style={styles.rowMain}>
        <Text style={[styles.rowName, { fontSize: fs(16), lineHeight: lh(16, 1.3) }]}>
          {referral.customerName}
        </Text>
        <Text style={[styles.rowMeta, { fontSize: fs(14), lineHeight: lh(14, 1.35) }]}>
          +91 {maskPhone(referral.customerPhone)}
          {referral.vehicleLabel ? ` · ${referral.vehicleLabel}` : ''}
        </Text>
        <Text style={[styles.rowDate, { fontSize: fs(13), lineHeight: lh(13, 1.3) }]}>
          {formatReferralDate(referral.createdAt)}
        </Text>
      </View>
      <View style={styles.rowSide}>
        <StatusChip status={referral.status} bg={chip.bg} color={chip.text} />
        {credit ? (
          <Text style={[styles.creditSide, { fontSize: fs(13) }]}>{credit}</Text>
        ) : null}
      </View>
    </View>
  );
}

function StatusChip({
  status,
  bg,
  color,
}: {
  status: ReferralStatus;
  bg: string;
  color: string;
}) {
  const { isTablet, fs } = useBreakpoint();
  return (
    <View style={[styles.chip, isTablet && styles.chipTablet, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color, fontSize: fs(12) }]}>
        {REFERRAL_STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  content: {
    paddingTop: 8,
  },

  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(10,24,72,0.08)',
    shadowColor: '#0A1848',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
    marginBottom: 28,
  },
  mainCardTablet: {
    borderRadius: 26,
    padding: 24,
    marginBottom: 32,
  },
  creditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  creditCopy: {
    flex: 1,
  },
  creditLabel: {
    fontWeight: '500',
    color: 'rgba(10,24,72,0.5)',
    marginBottom: 4,
  },
  creditAmount: {
    fontWeight: '700',
    color: AUTH_BLUE,
    letterSpacing: -0.8,
  },
  creditIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(10,24,72,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditIconTablet: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(10,24,72,0.12)',
    marginVertical: 18,
  },
  formToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  formToggleCopy: {
    flex: 1,
    minWidth: 0,
  },
  formTitle: {
    fontWeight: '700',
    color: AUTH_BLUE,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  formSub: {
    color: 'rgba(18,20,26,0.5)',
  },
  formToggleIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(10,24,72,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formToggleIconTablet: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  formBody: {
    marginTop: 18,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  fieldHalf: {
    flex: 1,
    minWidth: 0,
  },

  fieldLabel: {
    fontWeight: '500',
    color: 'rgba(10,24,72,0.5)',
    letterSpacing: 0.2,
    marginBottom: 7,
  },
  input: {
    backgroundColor: SCREEN_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(10,24,72,0.08)',
    paddingHorizontal: 14,
    fontWeight: '400',
    color: AUTH_BLUE,
    marginBottom: 14,
  },
  inputError: {
    borderColor: '#DC2626',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SCREEN_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(10,24,72,0.08)',
    marginBottom: 14,
    overflow: 'hidden',
  },
  phonePrefix: {
    paddingHorizontal: 14,
    fontWeight: '600',
    color: AUTH_BLUE,
    borderRightWidth: 1,
    borderRightColor: 'rgba(10,24,72,0.08)',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontWeight: '400',
    color: AUTH_BLUE,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SCREEN_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(10,24,72,0.08)',
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  selectText: {
    fontWeight: '400',
    color: AUTH_BLUE,
  },
  modelList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
    marginTop: -4,
  },
  modelChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: SCREEN_BG,
    borderWidth: 1,
    borderColor: 'rgba(10,24,72,0.1)',
  },
  modelChipTablet: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modelChipSelected: {
    backgroundColor: AUTH_BLUE,
    borderColor: AUTH_BLUE,
  },
  modelChipText: {
    fontWeight: '500',
    color: AUTH_BLUE,
  },
  modelChipTextSelected: {
    color: '#FFFFFF',
  },
  noteInput: {
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AUTH_BLUE_SOFT,
    borderRadius: 14,
    paddingVertical: 15,
  },
  submitBtnTablet: {
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 8,
  },
  submitDisabled: {
    opacity: 0.55,
  },
  submitText: {
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  historyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  historyTitle: {
    fontWeight: '700',
    color: AUTH_BLUE,
    letterSpacing: -0.3,
  },
  historyCount: {
    fontWeight: '600',
    color: AUTH_BLUE,
    backgroundColor: 'rgba(10,24,72,0.08)',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(10,24,72,0.08)',
    overflow: 'hidden',
  },
  listCardTablet: {
    borderRadius: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(10,24,72,0.1)',
  },
  rowTablet: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 16,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontWeight: '600',
    color: AUTH_BLUE,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  rowMeta: {
    color: 'rgba(18,20,26,0.5)',
    marginBottom: 2,
  },
  rowDate: {
    color: 'rgba(10,24,72,0.4)',
  },
  rowSide: {
    alignItems: 'flex-end',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chipTablet: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  creditSide: {
    fontWeight: '600',
    color: '#B45309',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(10,24,72,0.08)',
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyCardTablet: {
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 28,
  },
  emptyTitle: {
    fontWeight: '600',
    color: AUTH_BLUE,
    marginBottom: 4,
  },
  emptyBody: {
    color: 'rgba(18,20,26,0.5)',
    textAlign: 'center',
  },
});
