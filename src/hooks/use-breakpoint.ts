import { useWindowDimensions } from 'react-native';

import { Breakpoints, ContentMaxWidth } from '@/constants/theme';

/** Multiply phone font sizes for tablet readability (~iPad reading distance). */
const TABLET_FONT_SCALE = 1.35;
/** Slightly tighter type on small phones (SE / compact Android). */
const COMPACT_FONT_SCALE = 0.94;

export function useBreakpoint() {
  const { width, height } = useWindowDimensions();
  const shortest = Math.min(width, height);
  const isTablet = shortest >= Breakpoints.tablet || width >= Breakpoints.tablet;
  /** Short phones (iPhone SE) or narrow mid-range Androids (e.g. Galaxy A55). */
  const isShort = !isTablet && height < 720;
  const isNarrow = !isTablet && width < 400;
  const isCompact = isShort || isNarrow;
  const contentMaxWidth = isTablet ? ContentMaxWidth.tablet : ContentMaxWidth.phone;
  const tabBarMaxWidth = isTablet ? ContentMaxWidth.tabBar.tablet : ContentMaxWidth.tabBar.phone;
  const contentWidth = Math.min(width, contentMaxWidth);
  const columns = isTablet ? 2 : 1;
  const gutter = isTablet ? 32 : isNarrow ? 14 : 20;
  const fontScale = isTablet ? TABLET_FONT_SCALE : isCompact ? COMPACT_FONT_SCALE : 1;

  /** Scale a phone font size up on tablet / down on compact. */
  const fs = (size: number) => Math.round(size * fontScale);
  /** Scale line height to match font size. */
  const lh = (size: number, ratio = 1.35) => Math.round(fs(size) * ratio);

  return {
    width,
    height,
    isTablet,
    isCompact,
    isShort,
    isNarrow,
    contentMaxWidth,
    contentWidth,
    tabBarMaxWidth,
    columns,
    gutter,
    fontScale,
    fs,
    lh,
  };
}
