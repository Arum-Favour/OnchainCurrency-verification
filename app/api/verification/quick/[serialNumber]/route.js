import { withRoute } from '@/lib/api/withRoute';
import { quickVerify } from '@/lib/handlers/verification';

export const GET = withRoute(quickVerify, {
  auth: 'optional',
  label: 'verification/quick',
});
