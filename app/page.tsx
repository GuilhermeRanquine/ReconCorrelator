'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginScreen } from '@/components/LoginScreen';
import { Loader2, ShieldCheck } from '@/lib/icons';

export default function RootPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function determineRoute() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setIsAuthenticated(true);
            router.replace('/dashboard');
            return;
          }
        }
        setIsAuthenticated(false);
      } catch (err) {
        console.error('Session check error on root router:', err);
        setIsAuthenticated(false);
      } finally {
        setCheckingSession(false);
      }
    }

    determineRoute();
  }, [router]);

  if (checkingSession) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center font-mono text-zinc-400 gap-4 selection:bg-emerald-500 selection:text-black">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shadow-2xl shadow-emerald-500/20 animate-pulse">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-zinc-950 animate-ping" />
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-sm font-bold text-zinc-200 tracking-wider">
            RECON CORRELATOR <span className="text-emerald-400 font-mono">NEXUS</span>
          </h1>
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 font-mono">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span>Inicializando sistema de segurança...</span>
          </div>
        </div>
      </div>
    );
  }

  // If already authenticated, redirecting to dashboard
  if (isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center font-mono text-zinc-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
        <span className="text-xs text-zinc-400">Acessando Dashboard...</span>
      </div>
    );
  }

  // If unauthenticated, render LoginScreen directly and redirect on login success
  return (
    <LoginScreen
      onLoginSuccess={() => {
        router.push('/dashboard');
      }}
    />
  );
}
