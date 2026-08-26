import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);

    if (!auth.authenticated || !auth.user || !auth.session) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: auth.user.id,
        username: auth.user.username,
        role: auth.user.role,
      },
      csrfToken: auth.session.csrfToken,
      expiresAt: auth.session.expiresAt,
    });
  } catch (err: any) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      error: err.message,
    });
  }
}
