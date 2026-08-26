import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, createSession, logAudit } from '@/lib/db';
import { verifyPassword, generateSessionToken, hashSessionToken, generateCsrfToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Usuário e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim();
    const user = await getUserByUsername(cleanUsername);

    if (!user) {
      // Return generic error to avoid user enumeration timing attacks
      return NextResponse.json(
        { success: false, error: 'Credenciais inválidas. Verifique o usuário e senha.' },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(String(password), user.passwordHash, user.salt);
    if (!isValid) {
      await logAudit('LOGIN_FAILED', { username: cleanUsername, reason: 'Invalid password' }, user.id);
      return NextResponse.json(
        { success: false, error: 'Credenciais inválidas. Verifique o usuário e senha.' },
        { status: 401 }
      );
    }

    // Generate secure session token and CSRF token
    const plainToken = generateSessionToken();
    const tokenHash = hashSessionToken(plainToken);
    const csrfToken = generateCsrfToken();

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const session = await createSession(
      user.id,
      tokenHash,
      csrfToken,
      ipAddress,
      userAgent,
      7 // 7 days expiration
    );

    await logAudit('LOGIN_SUCCESS', { username: user.username, role: user.role, ip: ipAddress }, user.id);

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      csrfToken: session.csrfToken,
    });

    // Set secure HttpOnly session cookie
    res.cookies.set('recon_session', plainToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return res;
  } catch (err: any) {
    console.error('Error during login:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erro interno ao processar login' },
      { status: 500 }
    );
  }
}
