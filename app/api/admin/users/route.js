import { withRoute } from '@/lib/api/withRoute';
import { getUsers, createUser } from '@/lib/handlers/admin';

export const GET = withRoute(getUsers, {
  auth: 'required',
  roles: ['admin'],
  label: 'admin/users',
});

export const POST = withRoute(createUser, {
  auth: 'required',
  roles: ['admin'],
  label: 'admin/users/create',
});
