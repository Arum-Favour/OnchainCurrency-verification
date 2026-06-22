import { withRoute } from '@/lib/api/withRoute';
import { getDashboard } from '@/lib/handlers/admin';

export const GET = withRoute(getDashboard, {
  auth: 'required',
  roles: ['admin'],
  label: 'admin/dashboard',
});
