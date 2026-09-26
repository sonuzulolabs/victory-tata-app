import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { VideoPreloader } from '@/components/video-preloader';
import { SCREEN_BG } from '@/constants/brand';
import { LikedOffersProvider } from '@/context/liked-offers';
import { UserProfileProvider } from '@/context/user-profile';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <UserProfileProvider>
        <LikedOffersProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: '#0A1848' },
          }}>
          <Stack.Screen name="index" />
          <Stack.Screen
            name="otp"
            options={{
              animation: 'slide_from_right',
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
            }}
          />
          <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
          <Stack.Screen
            name="offer/[id]"
            options={{
              animation: 'slide_from_right',
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
              contentStyle: { backgroundColor: SCREEN_BG },
            }}
          />
          <Stack.Screen
            name="profile"
            options={{
              animation: 'slide_from_right',
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="edit-profile"
            options={{
              animation: 'slide_from_right',
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
              contentStyle: { backgroundColor: SCREEN_BG },
            }}
          />
        </Stack>
        <VideoPreloader />
        </LikedOffersProvider>
      </UserProfileProvider>
    </ThemeProvider>
  );
}
