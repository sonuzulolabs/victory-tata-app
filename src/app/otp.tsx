import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AUTH_BLUE, CinematicBackdrop } from '@/components/cinematic-backdrop';
import { useUserProfile } from '@/context/user-profile';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { phoneAuthErrorMessage } from '@/lib/phone-auth-error';
import { confirmPhoneOtp, sendPhoneOtp, subscribePhoneUser } from '@/lib/phone-auth';
import { formatPhoneInput, phoneDigits } from '@/lib/phone';

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const { signInWithPhone } = useUserProfile();
  const insets = useSafeAreaInsets();
  const { height, contentMaxWidth, isTablet, fs, lh } = useBreakpoint();
  const params = useLocalSearchParams<{ phone?: string }>();
  const phone = phoneDigits(typeof params.phone === 'string' ? params.phone : '');
  const displayPhone = useMemo(() => {
    if (phone.length !== 10) return '+91 ••••• •••••';
    const formatted = formatPhoneInput(phone);
    return `+91 ${formatted.slice(0, 5)} •••••`;
  }, [phone]);

  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(30);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const finished = useRef(false);
  const verifying = useRef(false);
  const complete = code.length >= OTP_LENGTH && !checking;
  const digits = code.padEnd(OTP_LENGTH, ' ').slice(0, OTP_LENGTH).split('');
  const raise = useSharedValue(0);

  const goBack = () => {
    Keyboard.dismiss();
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  const finishSignIn = useCallback(() => {
    if (finished.current || phone.length !== 10) return;
    finished.current = true;
    signInWithPhone(phone);
    router.replace('/(tabs)/home');
  }, [phone, signInWithPhone]);

  const verify = useCallback(
    async (nextCode: string) => {
      if (nextCode.length < OTP_LENGTH || verifying.current || finished.current) return;
      verifying.current = true;
      Keyboard.dismiss();
      setChecking(true);
      setError(null);
      try {
        await confirmPhoneOtp(nextCode);
        finishSignIn();
      } catch (err) {
        setError(phoneAuthErrorMessage(err));
        setCode('');
        setChecking(false);
        verifying.current = false;
      }
    },
    [finishSignIn],
  );

  useEffect(() => {
    if (code.length < OTP_LENGTH) return;
    void verify(code);
  }, [code, verify]);

  useEffect(() => {
    return subscribePhoneUser(phone, finishSignIn);
  }, [phone, finishSignIn]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardOpen(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardOpen(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    raise.value = withTiming(keyboardOpen ? 1 : 0, {
      duration: 360,
      easing: Easing.out(Easing.cubic),
    });
  }, [keyboardOpen, raise]);

  const sheetAnim = useAnimatedStyle(() => {
    const top = interpolate(raise.value, [0, 1], [height * 0.52, height * 0.16 + insets.top]);
    return {
      position: 'absolute' as const,
      left: 0,
      right: 0,
      bottom: 0,
      top,
    };
  });

  const logoAnim = useAnimatedStyle(() => ({
    opacity: interpolate(raise.value, [0, 1], [1, 0]),
    transform: [{ translateY: interpolate(raise.value, [0, 1], [0, -18]) }],
  }));

  return (
    <View style={[styles.root, { maxWidth: contentMaxWidth }]}>
      <CinematicBackdrop />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={goBack}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <Animated.View pointerEvents="none" style={[styles.logoWrap, { top: insets.top + 56 }, logoAnim]}>
        <Image
          source={require('../../assets/images/logo-victory-tata.png')}
          style={[styles.logo, isTablet && styles.logoTablet]}
          contentFit="contain"
          accessibilityLabel="Victory Tata"
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          sheetAnim,
          {
            paddingBottom: Math.max(insets.bottom, 22),
            paddingHorizontal: isTablet ? 40 : 28,
            maxWidth: isTablet ? 520 : undefined,
            width: '100%',
            alignSelf: 'center',
          },
        ]}>
        <Text style={[styles.title, { fontSize: fs(26), lineHeight: lh(26, 1.2) }]}>Verify OTP</Text>
        <Text style={[styles.subtitle, { fontSize: fs(14), lineHeight: lh(14, 1.4) }]}>
          We sent a 6-digit code to {displayPhone}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enter OTP"
          onPress={() => inputRef.current?.focus()}
          style={styles.otpRow}>
          {digits.map((d, i) => {
            const filled = d.trim().length > 0;
            const active = i === code.length && !complete;
            return (
              <View
                key={i}
                style={[
                  styles.box,
                  active && styles.boxActive,
                  filled && styles.boxFilled,
                  isTablet && { width: 52, height: 60, borderRadius: 14 },
                ]}>
                <Text style={[styles.boxDigit, { fontSize: fs(22) }]}>{filled ? d : ''}</Text>
              </View>
            );
          })}
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, OTP_LENGTH))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={OTP_LENGTH}
            onFocus={() => setKeyboardOpen(true)}
            onBlur={() => setKeyboardOpen(false)}
            style={styles.hidden}
          />
        </Pressable>

        {seconds > 0 ? (
          <Text style={[styles.resend, { fontSize: fs(13) }]}>
            Resend in 0:{seconds < 10 ? `0${seconds}` : seconds}
          </Text>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setError(null);
              setCode('');
              setSeconds(30);
              inputRef.current?.focus();
              void sendPhoneOtp(phone).catch((err) => {
                setError(phoneAuthErrorMessage(err));
                setSeconds(0);
              });
            }}
            style={styles.resendBtn}>
            <Text style={[styles.resendAction, { fontSize: fs(13) }]}>Resend code</Text>
          </Pressable>
        )}

        {error ? <Text style={[styles.error, { fontSize: fs(13) }]}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !complete }}
          disabled={!complete}
          onPress={() => void verify(code)}
          style={({ pressed }) => [
            styles.cta,
            isTablet && { minHeight: 56 },
            { opacity: !complete ? 0.4 : pressed ? 0.88 : 1 },
          ]}>
          <Text style={[styles.ctaLabel, { fontSize: fs(16) }]}>
            {checking ? 'Checking…' : 'Continue'}
          </Text>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={goBack} style={styles.change}>
          <Text style={[styles.changeLabel, { fontSize: fs(13) }]}>Change number</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AUTH_BLUE,
    width: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 4,
    paddingHorizontal: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(5, 10, 32, 0.28)',
  },
  logoWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  logo: {
    width: 200,
    height: 64,
  },
  logoTablet: {
    width: 260,
    height: 80,
  },
  sheet: {
    zIndex: 3,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 24,
    paddingHorizontal: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#0A1848',
        shadowOpacity: 0.18,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: -6 },
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  title: {
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '700',
    color: '#12141A',
    letterSpacing: -0.3,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
    fontSize: 14,
    color: '#8B90A0',
    lineHeight: 20,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  box: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: '#E4E6EE',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  boxActive: {
    borderColor: AUTH_BLUE,
  },
  boxFilled: {
    borderColor: AUTH_BLUE,
  },
  boxDigit: {
    fontSize: 22,
    fontWeight: '700',
    color: '#12141A',
  },
  hidden: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  resend: {
    textAlign: 'center',
    fontSize: 13,
    color: '#8B90A0',
    marginBottom: 8,
  },
  resendBtn: {
    alignSelf: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  resendAction: {
    fontSize: 13,
    fontWeight: '600',
    color: AUTH_BLUE,
  },
  error: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    color: '#B42318',
    marginBottom: 4,
  },
  cta: {
    marginTop: 12,
    minHeight: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AUTH_BLUE,
  },
  ctaLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  change: {
    alignSelf: 'center',
    marginTop: 14,
    paddingVertical: 4,
  },
  changeLabel: {
    fontSize: 13,
    color: '#8B90A0',
  },
});
