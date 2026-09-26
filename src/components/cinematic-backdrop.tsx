import { AUTH_BLUE } from '@/constants/brand';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Platform, StyleSheet, View } from 'react-native';

const SOURCE = require('../../assets/video/preloader.mp4');
const TRIM_END_SECONDS = 5;
export { AUTH_BLUE };

function lastFlashTime(duration: number) {
  if (!duration || duration <= TRIM_END_SECONDS) return Math.max(duration - 0.05, 0);
  return duration - TRIM_END_SECONDS;
}

/** Frozen last frame of the splash video, with the same blue wash. */
export function CinematicBackdrop() {
  const player = useVideoPlayer(SOURCE, (instance) => {
    instance.muted = true;
    instance.loop = false;
    instance.playbackRate = 1;
    instance.audioMixingMode = 'mixWithOthers';
  });

  const freeze = () => {
    const at = lastFlashTime(player.duration);
    if (at > 0) player.currentTime = at;
    player.pause();
  };

  useEventListener(player, 'sourceLoad', ({ duration }) => {
    const at = lastFlashTime(duration);
    player.currentTime = at;
    player.pause();
  });

  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay') freeze();
  });

  return (
    <View pointerEvents="none" style={styles.root}>
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
      <View style={styles.wash} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: AUTH_BLUE,
    overflow: 'hidden',
  },
  video: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web'
      ? ({
          objectPosition: 'center center',
        } as object)
      : {}),
  },
  wash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 24, 72, 0.55)',
  },
});
