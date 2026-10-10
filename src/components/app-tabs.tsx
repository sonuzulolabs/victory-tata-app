import { router, Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { FloatingTabBar } from '@/components/floating-tab-bar';
import { SCREEN_BG } from '@/constants/brand';
import { TabBarVisibilityProvider } from '@/context/tab-bar-visibility';
import { useBreakpoint } from '@/hooks/use-breakpoint';

const openProfile = () => router.push('/profile');

/** Shared tabs shell for native + web. */
export default function AppTabs() {
  const { contentMaxWidth, isTablet } = useBreakpoint();

  return (
    <TabBarVisibilityProvider>
      <View
        style={[
          styles.root,
          {
            maxWidth: contentMaxWidth,
            paddingHorizontal: isTablet ? 8 : 0,
          },
        ]}>
        <Tabs
          initialRouteName="home"
          tabBar={(props) => <FloatingTabBar {...props} />}
          screenOptions={{
            header: ({ options }) => (
              <AppHeader
                title={options.title ?? ''}
                onPressProfile={openProfile}
                onPressMenu={openProfile}
              />
            ),
            sceneStyle: { backgroundColor: SCREEN_BG },
            animation: 'fade',
            transitionSpec: {
              animation: 'timing',
              config: {
                duration: 280,
              },
            },
          }}>
          <Tabs.Screen name="home" options={{ title: 'Home' }} />
          <Tabs.Screen name="offers" options={{ title: 'Offers' }} />
          <Tabs.Screen name="referrals" options={{ title: 'Referrals' }} />
          <Tabs.Screen name="test-drive" options={{ title: 'Book a Test Drive' }} />
        </Tabs>
      </View>
    </TabBarVisibilityProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SCREEN_BG,
    width: '100%',
    alignSelf: 'center',
  },
});
