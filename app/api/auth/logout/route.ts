import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, logAudit } from '@/lib/db';
import { extractSessionToken, hashSessionToken, verifyAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const token = extractSessionToken(req);
    if (token) {
      const tokenHash = hashSessionToken(token);
      await deleteSession(tokenHash);
    }

    const { user } = await verifyAuth(req);
    if (user) {
      await logAudit('LOGOUT', { username: user.username }, user.id);
    }

    const res = NextResponse.json({
      success: true,
      message: 'Sessão encerrada com sucesso',
    });

    // Clear session cookie
    res.cookies.set('recon_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });

    return res;
  } catch (err: any) {
    console.error('Error during logout:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erro ao realizar logout' },
      { status: 500 }
    );
  }
}
