import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useBreakpoint } from '@/hooks/use-breakpoint';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Centers screen content and clamps width for phones and tablets. */
export function ContentFrame({ children, style }: Props) {
  const { contentMaxWidth } = useBreakpoint();

  return (
    <View style={[styles.root, { maxWidth: contentMaxWidth }, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
});
