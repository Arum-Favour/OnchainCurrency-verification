import { withRoute } from '@/lib/api/withRoute';
import { deleteUser } from '@/lib/handlers/admin';

export const DELETE = withRoute(deleteUser, {
  auth: 'required',
  roles: ['admin'],
  label: 'admin/users/delete',
});
