'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    async function determineRoute() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            router.replace('/dashboard');
            return;
          }
        }
        router.replace('/login');
      } catch (err) {
        console.error('Session check error on root router:', err);
        router.replace('/login');
      }
    }

    determineRoute();
  }, [router]);

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
          <span>Verificando sessão de segurança...</span>
        </div>
      </div>
    </div>
  );
}
