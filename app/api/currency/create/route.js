import { withRoute } from '@/lib/api/withRoute';
import { createCurrency } from '@/lib/handlers/currency';

export const POST = withRoute(createCurrency, {
  auth: 'required',
  roles: ['admin'],
  label: 'currency/create',
});
