import { useEventListener } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const SOURCE = require('../../assets/video/preloader.mp4');
const TRIM_END_SECONDS = 5;
const PLAYBACK_RATE = 2;
const BLUE = '#0A1848';

function cutoffTime(duration: number) {
  if (!duration || duration <= TRIM_END_SECONDS) return duration;
  return duration - TRIM_END_SECONDS;
}

export function VideoPreloader() {
  const [visible, setVisible] = useState(true);
  const dismissed = useRef(false);
  const cutoff = useRef(0);
  const opacity = useSharedValue(1);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  const finish = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    opacity.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }, (done) => {
      'worklet';
      if (done) scheduleOnRN(dismiss);
    });
  }, [dismiss, opacity]);

  const player = useVideoPlayer(SOURCE, (instance) => {
    instance.muted = true;
    instance.loop = false;
    instance.playbackRate = PLAYBACK_RATE;
    instance.timeUpdateEventInterval = 0.05;
    instance.audioMixingMode = 'mixWithOthers';
  });

  const start = useCallback(() => {
    player.muted = true;
    player.playbackRate = PLAYBACK_RATE;
    const duration = player.duration;
    if (duration > 0 && Number.isFinite(duration)) {
      cutoff.current = cutoffTime(duration);
    }
    player.play();
  }, [player]);

  useEffect(() => {
    start();
  }, [start]);

  useEventListener(player, 'sourceLoad', ({ duration }) => {
    cutoff.current = cutoffTime(duration);
    start();
  });

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (!(cutoff.current > 0)) {
      const duration = player.duration;
      if (duration > TRIM_END_SECONDS && Number.isFinite(duration)) {
        cutoff.current = cutoffTime(duration);
      }
    }
    const end = cutoff.current;
    if (end > 0 && currentTime >= end) {
      player.pause();
      finish();
    }
  });

  useEventListener(player, 'playToEnd', finish);

  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay') {
      SplashScreen.hideAsync().catch(() => {});
      start();
    }
    if (status === 'error') {
      SplashScreen.hideAsync().catch(() => {});
      finish();
    }
  });

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || !reduce) return;
      dismissed.current = true;
      SplashScreen.hideAsync().catch(() => {});
      setVisible(false);
    });
    const cap = setTimeout(finish, 20000);
    return () => {
      cancelled = true;
      clearTimeout(cap);
    };
  }, [finish]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!visible) return null;

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      pointerEvents="none"
      style={[styles.overlay, overlayStyle]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        contentPosition={{ dx: 0, dy: 0 }}
        nativeControls={false}
        playsInline
        surfaceType="textureView"
        fullscreenOptions={{ enable: false }}
        allowsPictureInPicture={false}
        allowsVideoFrameAnalysis={false}
      />
      <View style={styles.blueWash} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: BLUE,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web'
      ? ({
          objectPosition: 'center center',
        } as object)
      : {}),
  },
  blueWash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 24, 72, 0.55)',
  },
});
