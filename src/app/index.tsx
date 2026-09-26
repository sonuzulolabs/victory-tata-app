import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
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
import { signInWithGoogleAccount } from '@/lib/google-auth';
import { phoneAuthErrorMessage } from '@/lib/phone-auth-error';
import { sendPhoneOtp } from '@/lib/phone-auth';
import { formatPhoneInput, phoneDigits } from '@/lib/phone';

export default function LoginScreen() {
  const { signInWithGoogle } = useUserProfile();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [phone, setPhone] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = phoneDigits(phone).length === 10 && !sending && !googleBusy;
  const raise = useSharedValue(0);

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
    const top = interpolate(raise.value, [0, 1], [height * 0.5, height * 0.16 + insets.top]);
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
    <View style={styles.root}>
      <CinematicBackdrop />

      <Animated.View
        pointerEvents="none"
        style={[styles.logoWrap, { paddingTop: insets.top + 24 }, logoAnim]}>
        <Image
          source={require('../../assets/images/logo-victory-tata.png')}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="Victory Tata"
        />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetAnim, { paddingBottom: Math.max(insets.bottom, 22) }]}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Enter your phone number to continue</Text>

        <Text style={styles.label}>Mobile number</Text>
        <View style={[styles.field, ready && styles.fieldReady]}>
          <Text style={styles.prefix}>+91</Text>
          <View style={styles.divider} />
          <TextInput
            style={styles.input}
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
          style={({ pressed }) => [styles.cta, { opacity: !ready ? 0.4 : pressed ? 0.88 : 1 }]}>
          <Text style={styles.ctaLabel}>{sending ? 'Sending code…' : 'Continue'}</Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>Or continue with</Text>
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
            { opacity: googleBusy || sending ? 0.6 : pressed ? 0.85 : 1 },
          ]}>
          <GoogleIcon size={20} />
          <Text style={styles.googleLabel}>{googleBusy ? 'Opening Google…' : 'Google'}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AUTH_BLUE,
    maxWidth: 480,
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
});
