import { withRoute } from '@/lib/api/withRoute';
import { getCurrencies } from '@/lib/handlers/admin';

export const GET = withRoute(getCurrencies, {
  auth: 'required',
  roles: ['admin'],
  label: 'admin/currencies',
});
