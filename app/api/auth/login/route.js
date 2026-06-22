import { withRoute } from '@/lib/api/withRoute';
import { login } from '@/lib/handlers/auth';

export const POST = withRoute(login, { label: 'auth/login' });
