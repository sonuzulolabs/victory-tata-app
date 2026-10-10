import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AUTH_BLUE, SCREEN_BG } from '@/constants/brand';
import { useUserProfile } from '@/context/user-profile';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { completeAccountDeletion } from '@/lib/api/account-deletion';
import { phoneAuthErrorMessage } from '@/lib/phone-auth-error';
import { confirmPhoneOtp, getFirebaseIdToken, signOutPhoneAuth } from '@/lib/phone-auth';
import { formatPhoneInput, phoneDigits } from '@/lib/phone';

const OTP_LENGTH = 6;

export default function DeleteAccountOtpScreen() {
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, gutter, isTablet, fs, lh } = useBreakpoint();
  const { signOut } = useUserProfile();
  const params = useLocalSearchParams<{
    phone?: string;
    verificationToken?: string;
  }>();

  const phone = phoneDigits(typeof params.phone === 'string' ? params.phone : '');
  const verificationToken =
    typeof params.verificationToken === 'string' ? params.verificationToken : '';

  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const verifying = useRef(false);
  const backSize = isTablet ? 48 : 40;

  const displayPhone = useMemo(() => {
    if (phone.length !== 10) return '+91 ••••• •••••';
    return `+91 ${formatPhoneInput(phone)}`;
  }, [phone]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/delete-account');
  };

  const verify = useCallback(
    async (nextCode: string) => {
      if (
        nextCode.length < OTP_LENGTH ||
        verifying.current ||
        deleted ||
        !verificationToken ||
        phone.length !== 10
      ) {
        return;
      }
      verifying.current = true;
      Keyboard.dismiss();
      setChecking(true);
      setError(null);
      try {
        await confirmPhoneOtp(nextCode);
        const idToken = await getFirebaseIdToken();
        await completeAccountDeletion(verificationToken, idToken);
        await signOutPhoneAuth();
        signOut();
        setDeleted(true);
      } catch (err) {
        setError(phoneAuthErrorMessage(err));
        setCode('');
        setChecking(false);
        verifying.current = false;
      }
    },
    [deleted, phone, signOut, verificationToken],
  );

  useEffect(() => {
    if (code.length < OTP_LENGTH) return;
    void verify(code);
  }, [code, verify]);

  useEffect(() => {
    if (!verificationToken || phone.length !== 10) {
      router.replace('/delete-account');
    }
  }, [phone.length, verificationToken]);

  if (deleted) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, maxWidth: contentMaxWidth }]}>
        <View style={[styles.card, { marginHorizontal: gutter, marginTop: 24 }]}>
          <Ionicons name="checkmark-circle" size={fs(48)} color="#067647" />
          <Text style={[styles.successTitle, { fontSize: fs(22), lineHeight: lh(22, 1.3) }]}>
            Account successfully deleted
          </Text>
          <Text style={[styles.successBody, { fontSize: fs(15), lineHeight: lh(15, 1.45) }]}>
            Your Victory Tata profile and linked data have been removed from our systems.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/')}
            style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.85 : 1 }]}>
            <Text style={[styles.primaryBtnText, { fontSize: fs(16) }]}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
        <Text style={[styles.headerTitle, { fontSize: fs(20) }]}>Verify OTP</Text>
        <View style={{ width: backSize }} />
      </View>

      <View style={[styles.body, { paddingHorizontal: gutter }]}>
        <Text style={[styles.lead, { fontSize: fs(15), lineHeight: lh(15, 1.45) }]}>
          Enter the 6-digit code sent to {displayPhone}. Your account will be deleted immediately
          after verification.
        </Text>
        <TextInput
          value={code}
          onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, OTP_LENGTH))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={OTP_LENGTH}
          style={[styles.otpInput, { fontSize: fs(24) }]}
          editable={!checking}
        />
        {error ? <Text style={[styles.error, { fontSize: fs(14) }]}>{error}</Text> : null}
        {checking ? (
          <Text style={[styles.hint, { fontSize: fs(14) }]}>Verifying and deleting account…</Text>
        ) : null}
      </View>
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
  body: {
    paddingTop: 24,
  },
  lead: {
    color: 'rgba(18,20,26,0.62)',
    marginBottom: 20,
  },
  otpInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(10,24,72,0.12)',
    paddingVertical: 16,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
    color: AUTH_BLUE,
  },
  error: {
    marginTop: 12,
    color: '#B42318',
    fontWeight: '600',
  },
  hint: {
    marginTop: 12,
    color: 'rgba(18,20,26,0.5)',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  successTitle: {
    fontWeight: '800',
    color: AUTH_BLUE,
    textAlign: 'center',
  },
  successBody: {
    color: 'rgba(18,20,26,0.62)',
    textAlign: 'center',
    marginBottom: 8,
  },
  primaryBtn: {
    marginTop: 8,
    minHeight: 48,
    width: '100%',
    borderRadius: 12,
    backgroundColor: AUTH_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
