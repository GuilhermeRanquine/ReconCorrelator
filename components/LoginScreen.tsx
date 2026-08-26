'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Lock, 
  User as UserIcon, 
  Key, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: { id: string; username: string; role: string }, csrfToken?: string) => void;
}

interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  size: number;
  baseColorIndex: number;
  colorSpeed: number;
  colorPhase: number;
  alpha: number;
  alphaSpeed: number;
}

const PARTICLE_COLORS = [
  '16, 185, 129', // Emerald
  '6, 182, 212',  // Cyan
  '139, 92, 246', // Violet
  '59, 130, 246', // Blue
  '245, 158, 11', // Amber
  '168, 85, 247', // Purple
];

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('ranquine');
  const [password, setPassword] = useState('194518');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, targetX: -1000, targetY: -1000 });

  // -------------------------------------------------------------
  // ✨ INTERACTIVE PARTICLE CANVAS WITH SMOOTH MOUSE FOLLOWING
  // -------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    window.addEventListener('resize', handleResize);

    // Mouse & Touch Tracking with Smooth Target Coordinates
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseRef.current.targetX = e.touches[0].clientX;
        mouseRef.current.targetY = e.touches[0].clientY;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    // Initialize Particles Grid
    let particles: Particle[] = [];
    const spacing = Math.max(36, Math.min(50, Math.floor(Math.sqrt((width * height) / 450))));

    function initParticles() {
      particles = [];
      const cols = Math.ceil(width / spacing) + 2;
      const rows = Math.ceil(height / spacing) + 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * spacing + (Math.random() - 0.5) * 12;
          const y = r * spacing + (Math.random() - 0.5) * 12;
          particles.push({
            x,
            y,
            originX: x,
            originY: y,
            vx: 0,
            vy: 0,
            size: Math.random() * 2 + 1.2,
            baseColorIndex: Math.floor(Math.random() * PARTICLE_COLORS.length),
            colorSpeed: 0.008 + Math.random() * 0.015,
            colorPhase: Math.random() * Math.PI * 2,
            alpha: 0.2 + Math.random() * 0.5,
            alphaSpeed: 0.01 + Math.random() * 0.02,
          });
        }
      }
    }

    initParticles();

    // Initial mouse center position for gentle entry
    mouseRef.current.targetX = width / 2;
    mouseRef.current.targetY = height / 2;
    mouseRef.current.x = width / 2;
    mouseRef.current.y = height / 2;

    let time = 0;

    // Render loop with smooth easing physics (lerp)
    function render() {
      if (!ctx) return;
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Deep space subtle gradient background
      const bgGrad = ctx.createRadialGradient(
        width / 2, height / 2, 50,
        width / 2, height / 2, Math.max(width, height)
      );
      bgGrad.addColorStop(0, '#0c0f14');
      bgGrad.addColorStop(0.5, '#07090c');
      bgGrad.addColorStop(1, '#030406');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Smooth mouse easing (spring lerp: follows smoothly instead of snapping)
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.045;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.045;

      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;
      const influenceRadius = 220;

      // Draw subtle connecting lines near mouse
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Physics: distance to smoothly following mouse
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < influenceRadius) {
          const force = (1 - dist / influenceRadius);
          // Soft attraction & gentle orbital swirl
          const angle = Math.atan2(dy, dx);
          p.vx += Math.cos(angle) * force * 0.6;
          p.vy += Math.sin(angle) * force * 0.6;
        }

        // Return to origin spring force
        const homeDx = p.originX - p.x;
        const homeDy = p.originY - p.y;
        p.vx += homeDx * 0.03;
        p.vy += homeDy * 0.03;

        // Damping friction
        p.vx *= 0.88;
        p.vy *= 0.88;

        p.x += p.vx;
        p.y += p.vy;

        // Subtle floating idle motion
        const floatX = Math.sin(time + p.originX) * 2;
        const floatY = Math.cos(time + p.originY) * 2;
        const renderX = p.x + floatX;
        const renderY = p.y + floatY;

        // Dynamic Color Shifting
        const colorIdx = Math.floor((Math.sin(time * p.colorSpeed + p.colorPhase) * 0.5 + 0.5) * PARTICLE_COLORS.length) % PARTICLE_COLORS.length;
        const rgb = PARTICLE_COLORS[colorIdx];

        // Dynamic luminance / alpha boost near mouse
        const mouseProximityBoost = dist < influenceRadius ? (1 - dist / influenceRadius) * 0.7 : 0;
        const currentAlpha = Math.min(1, p.alpha + Math.sin(time * p.alphaSpeed) * 0.2 + mouseProximityBoost);

        // Draw particle glow
        ctx.beginPath();
        ctx.arc(renderX, renderY, p.size + (dist < influenceRadius ? 1.5 : 0), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${currentAlpha})`;
        ctx.shadowColor = `rgba(${rgb}, 0.8)`;
        ctx.shadowBlur = dist < influenceRadius ? 12 : 4;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    }

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // -------------------------------------------------------------
  // 🔑 LOGIN SUBMISSION HANDLER
  // -------------------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Por favor, informe seu usuário e senha.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Credenciais inválidas.');
      }

      onLoginSuccess(data.user, data.csrfToken);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao conectar ao servidor de autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans selection:bg-emerald-500 selection:text-black">
      {/* Background Interactive Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Subtle Ambient Light Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-slow" />

      {/* Center Translucent Glass Card (Minimalist iOS Style) */}
      <div className="relative z-10 w-full max-w-[420px] mx-4">
        <div className="relative rounded-[28px] p-8 sm:p-9 bg-zinc-950/45 backdrop-blur-3xl border border-white/[0.08] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] overflow-hidden transition-all duration-300">
          
          {/* Ultra-fine Glass Highlight Border */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Logo / Insignia Header */}
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-b from-zinc-800/80 to-zinc-900/90 border border-white/10 shadow-lg shadow-black/50 text-emerald-400 mb-1">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center justify-center gap-2">
                <span>ReconCorrelator</span>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  NEXUS
                </span>
              </h1>
              <p className="text-xs text-zinc-400 font-medium">
                Autonomous Bug Bounty Correlation & Red Team Engine
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold tracking-wider text-zinc-300 uppercase block pl-1">
                Usuário
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Nome de usuário"
                  autoComplete="username"
                  required
                  className="w-full bg-zinc-900/50 hover:bg-zinc-900/70 focus:bg-zinc-900/90 border border-zinc-800/80 focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl py-3 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 transition-all duration-200 outline-none font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between pl-1">
                <label className="text-[11px] font-semibold tracking-wider text-zinc-300 uppercase block">
                  Senha
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Sua senha secreta"
                  autoComplete="current-password"
                  required
                  className="w-full bg-zinc-900/50 hover:bg-zinc-900/70 focus:bg-zinc-900/90 border border-zinc-800/80 focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl py-3 pl-10 pr-11 text-sm text-zinc-100 placeholder-zinc-500 transition-all duration-200 outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            {/* Submit Button (iOS Style with Haptic-feel active scale) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 active:scale-[0.98] text-black font-bold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Autenticando sessão...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer Security Badges */}
          <div className="mt-8 pt-5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span className="flex items-center gap-1 text-zinc-400">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Sessão PBKDF2 Criptografada</span>
            </span>
            <span className="text-zinc-500">v3.4 Nexus</span>
          </div>
        </div>
      </div>
    </div>
  );
}
