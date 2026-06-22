import { connectDB } from '@/lib/db';
import { authenticate, optionalAuth, requireRoles } from './auth';

export async function withRoute(handler, options = {}) {
  return async (request, context = {}) => {
    try {
      await connectDB();

      let user = null;
      if (options.auth === 'required') {
        const result = await authenticate(request);
        if (result.response) return result.response;
        user = result.user;
      } else if (options.auth === 'optional') {
        const result = await optionalAuth(request);
        user = result.user;
      }

      if (options.roles) {
        const roleError = requireRoles(user, options.roles);
        if (roleError) return roleError;
      }

      const params = context.params ? await context.params : {};
      return handler({ request, user, params });
    } catch (err) {
      console.error(`API error [${options.label || 'route'}]:`, err);
      const message =
        process.env.NODE_ENV === 'development' ? err.message : 'Internal server error';
      const { error } = await import('./response');
      return error(message, 500);
    }
  };
}
