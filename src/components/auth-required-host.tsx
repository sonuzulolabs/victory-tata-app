import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AUTH_BLUE } from '@/constants/brand';
import { subscribeAuthRequired, type AuthRequiredPrompt } from '@/lib/require-auth';

/** Renders the sign-in dialog triggered by `requireAuth` (works on web + native). */
export function AuthRequiredHost() {
  const [prompt, setPrompt] = useState<AuthRequiredPrompt | null>(null);

  useEffect(() => subscribeAuthRequired(setPrompt), []);

  const close = () => setPrompt(null);

  return (
    <Modal
      visible={prompt != null}
      transparent
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
      presentationStyle="overFullScreen">
      <View style={styles.backdrop} pointerEvents="box-none">
        <View style={styles.card} accessibilityRole="alert">
          <Text style={styles.title}>Sign in required</Text>
          <Text style={styles.message}>{prompt?.message}</Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={close}
              style={({ pressed }) => [styles.btn, styles.btnGhost, { opacity: pressed ? 0.7 : 1 }]}>
              <Text style={styles.btnGhostLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              onPress={() => {
                close();
                router.replace('/');
              }}
              style={({ pressed }) => [styles.btn, styles.btnPrimary, { opacity: pressed ? 0.88 : 1 }]}>
              <Text style={styles.btnPrimaryLabel}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 24, 72, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    zIndex: 9999,
    elevation: 9999,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#12141A',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5C6370',
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  btn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnGhostLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5C6370',
  },
  btnPrimary: {
    backgroundColor: AUTH_BLUE,
  },
  btnPrimaryLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
