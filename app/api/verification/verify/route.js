import { withRoute } from '@/lib/api/withRoute';
import { verifyCurrency } from '@/lib/handlers/verification';

export const POST = withRoute(verifyCurrency, {
  auth: 'optional',
  label: 'verification/verify',
});
