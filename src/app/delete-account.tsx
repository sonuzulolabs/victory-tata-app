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

import { AUTH_BLUE, SCREEN_BG } from '@/constants/brand';
import { useUserProfile } from '@/context/user-profile';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { checkAccountDeletion } from '@/lib/api/account-deletion';
import { ApiError } from '@/lib/api/client';
import { phoneAuthErrorMessage } from '@/lib/phone-auth-error';
import { sendPhoneOtp } from '@/lib/phone-auth';
import { formatPhoneInput, mobileDigitsFromStored, phoneDigits } from '@/lib/phone';

export default function DeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, gutter, isTablet, fs, lh } = useBreakpoint();
  const { profile } = useUserProfile();
  const signedIn = profile?.authMethod === 'phone' || profile?.authMethod === 'google';
  const backSize = isTablet ? 48 : 40;

  const [phone, setPhone] = useState(mobileDigitsFromStored(profile?.phone ?? ''));
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) {
      router.replace('/profile');
    }
  }, [signedIn]);

  useEffect(() => {
    const digits = mobileDigitsFromStored(profile?.phone ?? '');
    if (digits) setPhone(digits);
  }, [profile?.phone]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };

  const continueDeletion = async () => {
    const digits = phoneDigits(phone);
    if (digits.length !== 10) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    if (!confirmed) {
      setError('Please confirm that you want to delete your account.');
      return;
    }

    Keyboard.dismiss();
    setBusy(true);
    setError(null);
    try {
      const check = await checkAccountDeletion(digits);
      if (!check.verification_token) {
        setError(check.message ?? 'Enter a valid 10-digit Indian mobile number.');
        return;
      }

      await sendPhoneOtp(digits);
      router.push({
        pathname: '/delete-account-otp',
        params: { phone: digits, verificationToken: check.verification_token },
      });
    } catch (err) {
      if (err instanceof ApiError && err.message) {
        setError(err.message);
      } else {
        setError(phoneAuthErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  if (!signedIn) return null;

  return (
    <View style={[styles.root, { paddingTop: insets.top, maxWidth: contentMaxWidth }]}>
      <View style={[styles.header, { paddingHorizontal: gutter }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={goBack}
          style={({ pressed }) => [
            styles.backBtn,
            { width: backSize, height: backSize, opacity: pressed ? 0.75 : 1 },
          ]}>
          <Ionicons name="arrow-back" size={fs(20)} color={AUTH_BLUE} />
        </Pressable>
        <Text style={[styles.headerTitle, { fontSize: fs(20) }]}>Delete account</Text>
        <View style={{ width: backSize }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: gutter,
          paddingBottom: insets.bottom + 28,
          paddingTop: 16,
        }}>
        <View style={styles.card}>
          <Text style={[styles.lead, { fontSize: fs(15), lineHeight: lh(15, 1.45) }]}>
            Enter your registered mobile number. We verify with OTP, then delete your data
            immediately.
          </Text>

          <Text style={styles.label}>Registered mobile number</Text>
          <TextInput
            value={phone}
            onChangeText={(text) => setPhone(phoneDigits(text).slice(0, 10))}
            keyboardType="phone-pad"
            placeholder="10-digit mobile number"
            placeholderTextColor="rgba(18,20,26,0.35)"
            style={styles.input}
            editable={!busy}
          />
          {phone.length === 10 ? (
            <Text style={[styles.phoneHint, { fontSize: fs(13) }]}>
              +91 {formatPhoneInput(phone)}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: confirmed }}
            onPress={() => setConfirmed((value) => !value)}
            style={styles.checkRow}>
            <Ionicons
              name={confirmed ? 'checkbox' : 'square-outline'}
              size={fs(20)}
              color={AUTH_BLUE}
            />
            <Text style={[styles.checkText, { fontSize: fs(14), lineHeight: lh(14, 1.4) }]}>
              I request permanent deletion of my Victory Tata app account and associated personal
              data.
            </Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void continueDeletion()}
            style={({ pressed }) => [
              styles.deleteBtn,
              { opacity: pressed || busy ? 0.85 : 1 },
            ]}>
            <Text style={[styles.deleteBtnText, { fontSize: fs(16) }]}>
              {busy ? 'Checking…' : 'Continue'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SCREEN_BG,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  backBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontWeight: '800',
    color: AUTH_BLUE,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(10,24,72,0.08)',
  },
  lead: {
    color: 'rgba(18,20,26,0.62)',
    marginBottom: 18,
  },
  label: {
    fontWeight: '700',
    color: AUTH_BLUE,
    marginBottom: 6,
    fontSize: 14,
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(10,24,72,0.12)',
    paddingHorizontal: 12,
    marginBottom: 14,
    fontSize: 16,
    color: AUTH_BLUE,
  },
  phoneHint: {
    color: 'rgba(18,20,26,0.45)',
    marginTop: -8,
    marginBottom: 14,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  checkText: {
    flex: 1,
    color: 'rgba(18,20,26,0.62)',
  },
  error: {
    color: '#B42318',
    fontWeight: '600',
    marginBottom: 12,
  },
  deleteBtn: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#B42318',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
