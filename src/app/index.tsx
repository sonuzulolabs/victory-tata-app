import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
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
import { GoogleIcon } from '@/components/google-icon';
import { useUserProfile } from '@/context/user-profile';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { signInWithGoogleAccount } from '@/lib/google-auth';
import { phoneAuthErrorMessage } from '@/lib/phone-auth-error';
import { sendPhoneOtp } from '@/lib/phone-auth';
import { formatPhoneInput, phoneDigits } from '@/lib/phone';

/** Approximate height of the login form content (title → skip). */
const FORM_MIN_HEIGHT = 420;

export default function LoginScreen() {
  const { signInWithGoogle, profile, sessionReady } = useUserProfile();
  const insets = useSafeAreaInsets();
  const { width, height, contentMaxWidth, isTablet, fs, lh } = useBreakpoint();
  const [phone, setPhone] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = phoneDigits(phone).length === 10 && !sending && !googleBusy;
  const raise = useSharedValue(0);
  const closedTop = useSharedValue(height * 0.48);
  const openTop = useSharedValue(insets.top + height * 0.12);

  const isLandscape = width > height;
  const shortest = Math.min(width, height);

  const layout = useMemo(() => {
    const sheetMax = isTablet ? Math.min(520, width - (isLandscape ? 48 : 64)) : width;
    const logoPad = insets.top + (isTablet ? (isLandscape ? 16 : 28) : 24);
    const logoBlock = (isTablet ? (isLandscape ? 56 : 80) : 64) + logoPad + 12;
    const bottomPad = Math.max(insets.bottom, 18);
    const neededSheet = FORM_MIN_HEIGHT + bottomPad;
    const maxClosedTop = Math.max(logoBlock, height - neededSheet);
    const idealClosedTop = isTablet
      ? isLandscape
        ? height * 0.18
        : Math.min(height * 0.34, maxClosedTop)
      : height * 0.48;
    const sheetClosedTop = Math.min(idealClosedTop, maxClosedTop);
    const sheetOpenTop = insets.top + (isTablet ? (isLandscape ? 12 : 20) : height * 0.12);

    return {
      sheetWidth: sheetMax,
      sheetClosedTop,
      sheetOpenTop,
      logoPad,
      bottomPad,
      isCompact: shortest < 700 || isLandscape,
    };
  }, [height, width, insets.top, insets.bottom, isTablet, isLandscape, shortest]);

  useEffect(() => {
    closedTop.value = layout.sheetClosedTop;
    openTop.value = layout.sheetOpenTop;
  }, [layout.sheetClosedTop, layout.sheetOpenTop, closedTop, openTop]);

  useEffect(() => {
    if (sessionReady && profile) {
      router.replace('/(tabs)/home');
    }
  }, [sessionReady, profile]);

  const continueIn = async () => {
    const digits = phoneDigits(phone);
    if (digits.length !== 10 || sending) return;
    Keyboard.dismiss();
    setSending(true);
    setError(null);
    try {
      await sendPhoneOtp(digits);
      router.push({ pathname: '/otp', params: { phone: digits } });
    } catch (err) {
      setError(phoneAuthErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

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
    const top = interpolate(raise.value, [0, 1], [closedTop.value, openTop.value]);
    return {
      position: 'absolute' as const,
      left: 0,
      right: 0,
      bottom: 0,
      top,
      alignItems: 'center' as const,
    };
  });

  const logoAnim = useAnimatedStyle(() => ({
    opacity: interpolate(raise.value, [0, 1], [1, 0]),
    transform: [{ translateY: interpolate(raise.value, [0, 1], [0, -18]) }],
  }));

  return (
    <View style={styles.screen}>
      <CinematicBackdrop />

      <View style={[styles.stage, { maxWidth: contentMaxWidth, width: '100%' }]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.logoWrap, { paddingTop: layout.logoPad }, logoAnim]}>
          <Image
            source={require('../../assets/images/logo-victory-tata.png')}
            style={[
              styles.logo,
              isTablet && styles.logoTablet,
              layout.isCompact && styles.logoCompact,
            ]}
            contentFit="contain"
            accessibilityLabel="Victory Tata"
          />
        </Animated.View>

        <Animated.View style={sheetAnim}>
          <View
            style={[
              styles.sheet,
              {
                width: layout.sheetWidth,
                maxWidth: isTablet ? 520 : undefined,
                paddingBottom: layout.bottomPad,
                paddingHorizontal: isTablet ? (layout.isCompact ? 28 : 40) : 28,
                borderTopLeftRadius: isTablet ? 28 : 36,
                borderTopRightRadius: isTablet ? 28 : 36,
              },
            ]}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={[
                styles.sheetContent,
                { paddingBottom: isTablet ? 20 : 12, flexGrow: 1 },
              ]}>
              <Text style={[styles.title, { fontSize: fs(26), lineHeight: lh(26, 1.2) }]}>
                Welcome
              </Text>
              <Text style={[styles.subtitle, { fontSize: fs(14), lineHeight: lh(14, 1.4) }]}>
                Enter your phone number to continue
              </Text>

              <Text style={[styles.label, { fontSize: fs(12) }]}>Mobile number</Text>
              <View
                style={[styles.field, ready && styles.fieldReady, isTablet && { minHeight: 58 }]}>
                <Text style={[styles.prefix, { fontSize: fs(16) }]}>+91</Text>
                <View style={styles.divider} />
                <TextInput
                  style={[styles.input, { fontSize: fs(17) }]}
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(formatPhoneInput(t));
                    setError(null);
                  }}
                  placeholder="98765 43210"
                  placeholderTextColor="#B0B4C0"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  returnKeyType="done"
                  maxLength={11}
                  onFocus={() => setKeyboardOpen(true)}
                  onBlur={() => setKeyboardOpen(false)}
                  onSubmitEditing={continueIn}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !ready }}
                disabled={!ready}
                onPress={continueIn}
                style={({ pressed }) => [
                  styles.cta,
                  isTablet && { minHeight: 56 },
                  { opacity: !ready ? 0.4 : pressed ? 0.88 : 1 },
                ]}>
                <Text style={[styles.ctaLabel, { fontSize: fs(16) }]}>
                  {sending ? 'Sending code…' : 'Continue'}
                </Text>
              </Pressable>
              {error ? <Text style={[styles.error, { fontSize: fs(13) }]}>{error}</Text> : null}

              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={[styles.orText, { fontSize: fs(12) }]}>Or continue with</Text>
                <View style={styles.orLine} />
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
                disabled={googleBusy || sending}
                onPress={() => {
                  Keyboard.dismiss();
                  setGoogleBusy(true);
                  setError(null);
                  void signInWithGoogleAccount()
                    .then((account) => {
                      if (!account) return;
                      signInWithGoogle(account);
                      router.replace('/(tabs)/home');
                    })
                    .catch((err) => {
                      setError(phoneAuthErrorMessage(err));
                    })
                    .finally(() => setGoogleBusy(false));
                }}
                style={({ pressed }) => [
                  styles.googleBtn,
                  isTablet && { minHeight: 56 },
                  { opacity: googleBusy || sending ? 0.6 : pressed ? 0.85 : 1 },
                ]}>
                <GoogleIcon size={fs(20)} />
                <Text style={[styles.googleLabel, { fontSize: fs(15) }]}>
                  {googleBusy ? 'Opening Google…' : 'Google'}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Skip to offers"
                disabled={sending || googleBusy}
                onPress={() => {
                  Keyboard.dismiss();
                  router.replace('/(tabs)/offers');
                }}
                style={({ pressed }) => [
                  styles.skipBtn,
                  { opacity: sending || googleBusy ? 0.5 : pressed ? 0.75 : 1 },
                ]}>
                <Text style={[styles.skipLabel, { fontSize: fs(15) }]}>Skip to offers</Text>
              </Pressable>
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AUTH_BLUE,
    width: '100%',
  },
  stage: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  logoWrap: {
    position: 'absolute',
    top: 0,
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
  logoCompact: {
    width: 180,
    height: 56,
  },
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 24,
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
  sheetContent: {
    paddingBottom: 12,
    flexGrow: 1,
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
    marginBottom: 20,
    fontSize: 14,
    color: '#8B90A0',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8B90A0',
    marginBottom: 8,
  },
  field: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E4E6EE',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  fieldReady: {
    borderColor: AUTH_BLUE,
  },
  prefix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#12141A',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: '#D0D3DC',
  },
  input: {
    flex: 1,
    fontSize: 17,
    padding: 0,
    color: '#12141A',
    letterSpacing: 0.3,
  },
  cta: {
    marginTop: 16,
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
  error: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    color: '#B42318',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    marginBottom: 14,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E4E6EE',
  },
  orText: {
    fontSize: 12,
    color: '#8B90A0',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#E4E6EE',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  googleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#12141A',
  },
  skipBtn: {
    marginTop: 16,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  skipLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: AUTH_BLUE,
  },
});
