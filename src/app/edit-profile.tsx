import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AUTH_BLUE, AUTH_BLUE_SOFT, SCREEN_BG } from '@/constants/brand';
import { useUserProfile } from '@/context/user-profile';
import {
  formatPhoneDisplay,
  formatPhoneInput,
  isValidIndianMobile,
  mobileDigitsFromStored,
  phoneDigits,
} from '@/lib/phone';

function EditField({
  label,
  value,
  onChangeText,
  locked,
  keyboardType = 'default',
  placeholder,
  autoCapitalize = 'words',
  error,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  locked: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  placeholder?: string;
  autoCapitalize?: 'none' | 'words' | 'sentences';
  error?: string;
}) {
  return (
    <View style={styles.fieldBlock}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {locked ? (
          <View style={styles.lockedBadge}>
            <Ionicons name="lock-closed" size={10} color={AUTH_BLUE_SOFT} />
            <Text style={styles.lockedText}>From sign-in</Text>
          </View>
        ) : null}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={!locked}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor="rgba(18,20,26,0.35)"
        style={[
          styles.fieldInput,
          locked && styles.fieldInputLocked,
          Boolean(error) && styles.fieldInputError,
        ]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function MobileField({
  value,
  onChangeText,
  locked,
  error,
  onBlur,
}: {
  value: string;
  onChangeText: (text: string) => void;
  locked: boolean;
  error?: string;
  onBlur?: () => void;
}) {
  return (
    <View style={styles.fieldBlock}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>Mobile number</Text>
        {locked ? (
          <View style={styles.lockedBadge}>
            <Ionicons name="lock-closed" size={10} color={AUTH_BLUE_SOFT} />
            <Text style={styles.lockedText}>From sign-in</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.phoneRow, Boolean(error) && styles.fieldInputError]}>
        <Text style={styles.phonePrefix}>+91</Text>
        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(formatPhoneInput(t))}
          editable={!locked}
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={11}
          placeholder="98765 43210"
          placeholderTextColor="rgba(18,20,26,0.35)"
          onBlur={onBlur}
          style={[styles.phoneInput, locked && styles.phoneInputLocked]}
        />
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, isFieldLocked } = useUserProfile();

  const [name, setName] = useState('');
  /** 10-digit mobile formatted as "98765 43210" (no +91). */
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phoneError, setPhoneError] = useState<string | undefined>();

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setMobile(formatPhoneInput(mobileDigitsFromStored(profile.phone)));
    setEmail(profile.email);
    setPhoneTouched(false);
    setPhoneError(undefined);
  }, [profile]);

  const mobileDigits = phoneDigits(mobile);
  const mobileValid = mobileDigits.length === 0 || isValidIndianMobile(mobileDigits);

  useEffect(() => {
    if (!phoneTouched || mobileDigits.length === 0) {
      setPhoneError(undefined);
      return;
    }
    if (!isValidIndianMobile(mobileDigits)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number');
    } else {
      setPhoneError(undefined);
    }
  }, [mobile, mobileDigits, phoneTouched]);

  const goBack = () => {
    Keyboard.dismiss();
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };

  const save = () => {
    if (!profile) return;
    const patch: { name?: string; phone?: string; email?: string } = {};

    if (!isFieldLocked('name')) patch.name = name.trim();
    if (!isFieldLocked('phone')) {
      const digits = phoneDigits(mobile);
      if (digits.length > 0 && !isValidIndianMobile(digits)) {
        setPhoneTouched(true);
        setPhoneError('Enter a valid 10-digit Indian mobile number');
        return;
      }
      patch.phone = digits.length === 10 ? formatPhoneDisplay(digits) : '';
    }
    if (!isFieldLocked('email')) patch.email = email.trim();

    updateProfile(patch);
    goBack();
  };

  const canSave =
    !profile ||
    profile.authMethod !== 'google' ||
    mobileValid ||
    mobileDigits.length === 0;

  if (!profile) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={AUTH_BLUE} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit profile</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Sign in to edit your profile.</Text>
        </View>
      </View>
    );
  }

  const isGoogle = profile.authMethod === 'google';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={6}
          onPress={goBack}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.75 : 1 }]}>
          <Ionicons name="arrow-back" size={20} color={AUTH_BLUE} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEyebrow}>Victory Tata</Text>
          <Text style={styles.headerTitle}>Edit profile</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.hint}>
          {isGoogle
            ? 'Add your mobile number. Name and email stay linked to Google.'
            : 'Add your name and email. Your verified mobile number cannot be changed.'}
        </Text>

        <View style={styles.formCard}>
          {!isGoogle ? (
            <>
              <EditField
                label="Full name"
                value={name}
                onChangeText={setName}
                locked={false}
                placeholder="Your name"
              />
              <EditField
                label="Email"
                value={email}
                onChangeText={setEmail}
                locked={false}
                keyboardType="email-address"
                placeholder="you@email.com"
                autoCapitalize="none"
              />
            </>
          ) : (
            <MobileField
              value={mobile}
              onChangeText={setMobile}
              locked={false}
              error={phoneError}
              onBlur={() => setPhoneTouched(true)}
            />
          )}

          {isGoogle ? (
            <>
              <EditField
                label="Full name"
                value={name}
                onChangeText={setName}
                locked
                placeholder=""
              />
              <EditField
                label="Email"
                value={email}
                onChangeText={setEmail}
                locked
                placeholder=""
                autoCapitalize="none"
              />
            </>
          ) : (
            <MobileField
              value={formatPhoneInput(mobileDigitsFromStored(profile.phone))}
              onChangeText={() => {}}
              locked
            />
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
          disabled={!canSave}
          onPress={save}
          style={({ pressed }) => [
            styles.saveBtn,
            !canSave && styles.saveBtnDisabled,
            { opacity: !canSave ? 0.45 : pressed ? 0.88 : 1 },
          ]}>
          <Text style={styles.saveBtnText}>Save changes</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SCREEN_BG,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(10,24,72,0.08)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SCREEN_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: 'rgba(10,24,72,0.4)',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: AUTH_BLUE,
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(18,20,26,0.55)',
    marginBottom: 14,
    marginHorizontal: 4,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(10,24,72,0.08)',
    gap: 4,
  },
  fieldBlock: {
    marginBottom: 12,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(10,24,72,0.55)',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(10,24,72,0.06)',
  },
  lockedText: {
    fontSize: 10,
    fontWeight: '600',
    color: AUTH_BLUE_SOFT,
  },
  fieldInput: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(10,24,72,0.12)',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '500',
    color: AUTH_BLUE,
  },
  fieldInputLocked: {
    backgroundColor: 'rgba(10,24,72,0.04)',
    borderColor: 'rgba(10,24,72,0.08)',
    color: 'rgba(10,24,72,0.72)',
  },
  fieldInputError: {
    borderColor: '#B42318',
  },
  fieldError: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#B42318',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(10,24,72,0.12)',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    gap: 10,
  },
  phonePrefix: {
    fontSize: 15,
    fontWeight: '700',
    color: AUTH_BLUE,
  },
  phoneInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: AUTH_BLUE,
    paddingVertical: 12,
  },
  phoneInputLocked: {
    color: 'rgba(10,24,72,0.72)',
  },
  saveBtn: {
    marginTop: 18,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: AUTH_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  saveBtnDisabled: {
    backgroundColor: 'rgba(10,24,72,0.35)',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(18,20,26,0.55)',
    textAlign: 'center',
  },
});
