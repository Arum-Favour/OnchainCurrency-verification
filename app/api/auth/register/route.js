import { withRoute } from '@/lib/api/withRoute';
import { register } from '@/lib/handlers/auth';

export const POST = withRoute(register, { label: 'auth/register' });
