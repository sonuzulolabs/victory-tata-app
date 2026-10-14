import { useCallback, useMemo, useState } from 'react';
import { RefreshControl } from 'react-native';

import { AUTH_BLUE } from '@/constants/brand';

export function useRefreshControl(onRefresh: () => void | Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        colors={[AUTH_BLUE]}
        tintColor={AUTH_BLUE}
      />
    ),
    [refresh, refreshing],
  );

  return { refreshing, refresh, refreshControl };
}
