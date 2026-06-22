import { json } from '@/lib/api/response';
import { connectDB } from '@/lib/db';

export async function GET() {
  try {
    await connectDB();
    return json({
      status: 'OK',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return json(
      {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      503
    );
  }
}
