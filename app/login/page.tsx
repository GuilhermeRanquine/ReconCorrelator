'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginScreen } from '@/components/LoginScreen';
import { Loader2, ShieldCheck } from '@/lib/icons';

export default function LoginPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    async function checkExistingSession() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            router.replace('/dashboard');
            return;
          }
        }
      } catch (err) {
        console.error('Session verification error on login page:', err);
      } finally {
        setCheckingSession(false);
      }
    }

    checkExistingSession();
  }, [router]);

  if (checkingSession) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center font-mono text-zinc-400 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10 animate-pulse">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
          <span>Verificando integridade da sessão...</span>
        </div>
      </div>
    );
  }

  return (
    <LoginScreen
      onLoginSuccess={() => {
        router.push('/dashboard');
      }}
    />
  );
}
