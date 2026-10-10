import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';

import { useBreakpoint } from '@/hooks/use-breakpoint';

type Props = TextProps & {
  /** Phone base font size — scaled up automatically on tablets. */
  size: number;
  /** Line-height ratio vs font size (default 1.35). */
  lineRatio?: number;
  style?: StyleProp<TextStyle>;
};

/**
 * Text that uses larger, readable sizes on tablets.
 * Prefer this for body/UI copy that must stay legible at arm's length.
 */
export function Type({ size, lineRatio = 1.35, style, allowFontScaling = true, ...rest }: Props) {
  const { fs, lh } = useBreakpoint();

  return (
    <Text
      {...rest}
      allowFontScaling={allowFontScaling}
      style={[{ fontSize: fs(size), lineHeight: lh(size, lineRatio) }, style]}
    />
  );
}
