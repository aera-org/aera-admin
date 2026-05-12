import { useQuery } from '@tanstack/react-query';

import {
  getInAppPurchases,
  type InAppPurchasesListParams,
} from './inAppPurchasesApi';

const inAppPurchaseKeys = {
  list: (params: InAppPurchasesListParams) =>
    ['in-app-purchases', params] as const,
};

export function useInAppPurchases(params: InAppPurchasesListParams) {
  return useQuery({
    queryKey: inAppPurchaseKeys.list(params),
    queryFn: () => getInAppPurchases(params),
  });
}
