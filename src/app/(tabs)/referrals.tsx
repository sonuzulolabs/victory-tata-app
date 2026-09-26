import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

const PAD = 20;
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
  const lastY = useRef(0);

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

  const onSubmit = async () => {
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
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: tabClearance + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}>
        {/* Points credited + New referral */}
        <View style={styles.mainCard}>
          <View style={styles.creditRow}>
            <View style={styles.creditCopy}>
              <Text style={styles.creditLabel}>Points credited</Text>
              <Text style={styles.creditAmount}>{formatInr(summary.credited)}</Text>
            </View>
            <View style={styles.creditIcon}>
              <Ionicons name="wallet-outline" size={20} color={AUTH_BLUE} />
            </View>
          </View>

          <View style={styles.cardDivider} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={formOpen ? 'Collapse new referral form' : 'Expand new referral form'}
            onPress={() => setFormOpen((o) => !o)}
            style={({ pressed }) => [styles.formToggle, { opacity: pressed ? 0.85 : 1 }]}>
            <View style={styles.formToggleCopy}>
              <Text style={styles.formTitle}>New referral</Text>
              <Text style={styles.formSub}>
                {formOpen
                  ? 'Share a lead — Victory follows up for you.'
                  : 'Tap to add a customer lead'}
              </Text>
            </View>
            <View style={styles.formToggleIcon}>
              <Ionicons
                name={formOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={AUTH_BLUE}
              />
            </View>
          </Pressable>

          {formOpen ? (
            <View style={styles.formBody}>
              <Text style={styles.fieldLabel}>Customer name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Full name"
                placeholderTextColor="rgba(10,24,72,0.35)"
                autoCapitalize="words"
                style={[styles.input, touched && !nameOk && styles.inputError]}
                returnKeyType="next"
              />

              <Text style={styles.fieldLabel}>Mobile number</Text>
              <View style={[styles.phoneRow, touched && !phoneOk && styles.inputError]}>
                <Text style={styles.phonePrefix}>+91</Text>
                <TextInput
                  value={mobile}
                  onChangeText={(v) => setMobile(formatPhoneInput(v))}
                  placeholder="98765 43210"
                  placeholderTextColor="rgba(10,24,72,0.35)"
                  keyboardType="phone-pad"
                  maxLength={11}
                  style={styles.phoneInput}
                />
              </View>

              <Text style={styles.fieldLabel}>Interested model</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowModels((s) => !s)}
                style={({ pressed }) => [styles.select, { opacity: pressed ? 0.9 : 1 }]}>
                <Text style={[styles.selectText, !selectedVehicle && styles.selectPlaceholder]}>
                  {selectedVehicle?.label ?? 'Select a Tata model'}
                </Text>
                <Ionicons
                  name={showModels ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="rgba(10,24,72,0.45)"
                />
              </Pressable>
              {showModels ? (
                <View style={styles.modelList}>
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
                          selected && styles.modelChipSelected,
                          { opacity: pressed ? 0.85 : 1 },
                        ]}>
                        <Text
                          style={[
                            styles.modelChipText,
                            selected && styles.modelChipTextSelected,
                          ]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>City</Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="Tirupur"
                placeholderTextColor="rgba(10,24,72,0.35)"
                autoCapitalize="words"
                style={styles.input}
                returnKeyType="next"
              />

              <Text style={styles.fieldLabel}>Note for sales</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Preferred time, budget, etc."
                placeholderTextColor="rgba(10,24,72,0.35)"
                multiline
                style={[styles.input, styles.noteInput]}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Submit referral"
                disabled={!canSubmit && touched}
                onPress={onSubmit}
                style={({ pressed }) => [
                  styles.submitBtn,
                  (!canSubmit || submitting) && styles.submitDisabled,
                  { opacity: pressed && canSubmit ? 0.9 : 1 },
                ]}>
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>Submit referral</Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Past referrals */}
        <View style={styles.historyHead}>
          <Text style={styles.historyTitle}>Past referrals</Text>
          {referrals.length > 0 ? (
            <Text style={styles.historyCount}>{referrals.length}</Text>
          ) : null}
        </View>

        {loading && referrals.length === 0 ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color={AUTH_BLUE} />
          </View>
        ) : loadError && referrals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Referrals unavailable</Text>
            <Text style={styles.emptyBody}>{loadError}</Text>
          </View>
        ) : !referrerReady ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Add your mobile number</Text>
            <Text style={styles.emptyBody}>
              Referrals are matched to the phone number on your Victory profile.
            </Text>
          </View>
        ) : referrals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No referrals yet</Text>
            <Text style={styles.emptyBody}>Add a friend or customer above to get started.</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
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
  const tone = statusTone(referral.status);
  const chip = TONE_STYLES[tone];
  const credit =
    referral.status === 'Credited' && referral.creditAmount != null
      ? formatInr(referral.creditAmount)
      : null;

  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.rowMain}>
        <Text style={styles.rowName}>{referral.customerName}</Text>
        <Text style={styles.rowMeta}>
          +91 {maskPhone(referral.customerPhone)}
          {referral.vehicleLabel ? ` · ${referral.vehicleLabel}` : ''}
        </Text>
        <Text style={styles.rowDate}>{formatReferralDate(referral.createdAt)}</Text>
      </View>
      <View style={styles.rowSide}>
        <StatusChip status={referral.status} bg={chip.bg} color={chip.text} />
        {credit ? <Text style={styles.creditSide}>{credit}</Text> : null}
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
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color }]}>{REFERRAL_STATUS_LABEL[status]}</Text>
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
    paddingHorizontal: PAD,
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
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(10,24,72,0.5)',
    marginBottom: 4,
  },
  creditAmount: {
    fontSize: 32,
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
    fontSize: 17,
    fontWeight: '700',
    color: AUTH_BLUE,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  formSub: {
    fontSize: 13,
    lineHeight: 18,
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
  formBody: {
    marginTop: 18,
  },

  fieldLabel: {
    fontSize: 12,
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
    paddingVertical: 13,
    fontSize: 15,
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
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: '600',
    color: AUTH_BLUE,
    borderRightWidth: 1,
    borderRightColor: 'rgba(10,24,72,0.08)',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
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
    paddingVertical: 13,
    marginBottom: 14,
  },
  selectText: {
    fontSize: 15,
    fontWeight: '400',
    color: AUTH_BLUE,
  },
  selectPlaceholder: {
    color: 'rgba(10,24,72,0.35)',
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
  modelChipSelected: {
    backgroundColor: AUTH_BLUE,
    borderColor: AUTH_BLUE,
  },
  modelChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: AUTH_BLUE,
  },
  modelChipTextSelected: {
    color: '#FFFFFF',
  },
  noteInput: {
    minHeight: 72,
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
  submitDisabled: {
    opacity: 0.55,
  },
  submitText: {
    fontSize: 15,
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
    fontSize: 18,
    fontWeight: '700',
    color: AUTH_BLUE,
    letterSpacing: -0.3,
  },
  historyCount: {
    fontSize: 13,
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
  rowLast: {
    borderBottomWidth: 0,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    color: AUTH_BLUE,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  rowMeta: {
    fontSize: 13,
    color: 'rgba(18,20,26,0.5)',
    marginBottom: 2,
  },
  rowDate: {
    fontSize: 12,
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
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  creditSide: {
    fontSize: 12,
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
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: AUTH_BLUE,
    marginBottom: 4,
  },
  emptyBody: {
    fontSize: 13,
    color: 'rgba(18,20,26,0.5)',
    textAlign: 'center',
  },
});
