import { withRoute } from '@/lib/api/withRoute';
import { getPrintableNote } from '@/lib/handlers/currency';

export const GET = withRoute(getPrintableNote, {
  auth: 'required',
  roles: ['admin', 'issuer'],
  label: 'currency/printable',
});
