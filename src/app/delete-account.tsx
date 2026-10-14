import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AUTH_BLUE, DELETE_ACCOUNT_URL, SCREEN_BG } from '@/constants/brand';
import { useUserProfile } from '@/context/user-profile';
import { useBreakpoint } from '@/hooks/use-breakpoint';

const STEPS = [
  'Tap the button below to open the account deletion page in your browser.',
  'Enter your registered 10-digit mobile number and confirm you want to delete your account.',
  'Verify with the one-time password (OTP) sent to your phone.',
  'After verification, your Victory Tata profile and linked data are deleted immediately.',
];

export default function DeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, gutter, isTablet, fs, lh } = useBreakpoint();
  const { profile } = useUserProfile();
  const signedIn = profile?.authMethod === 'phone' || profile?.authMethod === 'google';
  const backSize = isTablet ? 48 : 40;

  useEffect(() => {
    if (!signedIn) {
      router.replace('/profile');
    }
  }, [signedIn]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };

  const openDeletionPage = () => {
    void Linking.openURL(DELETE_ACCOUNT_URL);
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
            Account deletion is completed on our secure website. Follow the steps below.
          </Text>

          <View style={styles.steps}>
            {STEPS.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <Text style={[styles.stepNumber, { fontSize: fs(13) }]}>{index + 1}</Text>
                <Text style={[styles.stepText, { fontSize: fs(14), lineHeight: lh(14, 1.45) }]}>
                  {step}
                </Text>
              </View>
            ))}
          </View>

          <Text style={[styles.urlLabel, { fontSize: fs(13) }]}>Account deletion link</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Open account deletion page"
            onPress={openDeletionPage}
            style={({ pressed }) => [styles.urlBox, { opacity: pressed ? 0.85 : 1 }]}>
            <Ionicons name="link-outline" size={fs(18)} color={AUTH_BLUE} />
            <Text
              selectable
              style={[styles.urlText, { fontSize: fs(14), lineHeight: lh(14, 1.4) }]}>
              {DELETE_ACCOUNT_URL}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={openDeletionPage}
            style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.85 : 1 }]}>
            <Text style={[styles.primaryBtnText, { fontSize: fs(16) }]}>Open deletion page</Text>
            <Ionicons name="open-outline" size={fs(18)} color="#FFFFFF" />
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
  steps: {
    gap: 12,
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(10,24,72,0.08)',
    color: AUTH_BLUE,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 22,
    overflow: 'hidden',
  },
  stepText: {
    flex: 1,
    color: 'rgba(18,20,26,0.72)',
  },
  urlLabel: {
    fontWeight: '700',
    color: AUTH_BLUE,
    marginBottom: 8,
  },
  urlBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(10,24,72,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(10,24,72,0.1)',
    marginBottom: 16,
  },
  urlText: {
    flex: 1,
    color: AUTH_BLUE,
    fontWeight: '600',
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#B42318',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
