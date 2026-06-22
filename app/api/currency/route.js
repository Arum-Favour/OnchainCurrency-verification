import { withRoute } from '@/lib/api/withRoute';
import { listCurrencies } from '@/lib/handlers/currency';

export const GET = withRoute(listCurrencies, {
  auth: 'required',
  label: 'currency/list',
});
