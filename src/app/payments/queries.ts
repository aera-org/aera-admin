import { useQuery } from '@tanstack/react-query';

import type { PaymentsQuery } from '@/common/types';

import { getPayments } from './paymentsApi';

const paymentKeys = {
  list: (params: PaymentsQuery) => ['payments', params] as const,
};

export function usePayments(params: PaymentsQuery) {
  return useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: () => getPayments(params),
    placeholderData: (previousData) => previousData,
  });
}
