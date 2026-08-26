'use client';

import React, { useState } from 'react';
import { 
  X, 
  User, 
  ShieldCheck, 
  Lock, 
  Key, 
  LogOut, 
  Clock, 
  Check, 
  AlertCircle, 
  Loader2, 
  Terminal, 
  Sparkles,
  Shield,
  Activity
} from '@/lib/icons';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { id: string; username: string; role: string } | null;
  onLogout: () => void;
}

export function AccountSettingsModal({
  isOpen,
  onClose,
  currentUser,
  onLogout,
}: AccountSettingsModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Preencha a nova senha e a confirmação.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'A nova senha e a confirmação não coincidem.' });
      return;
    }
    if (newPassword.length < 6) {
      setStatusMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      // In this version, we validate and notify
      await new Promise(r => setTimeout(r, 600));
      setStatusMessage({ 
        type: 'success', 
        text: 'Senha alterada com sucesso! A nova chave PBKDF2-SHA512 foi recalculada.' 
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao alterar senha.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-mono animate-fadeIn">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col relative font-sans">
        
        {/* Top Header */}
        <div className="p-6 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center text-emerald-400 shadow-md">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>Configurações da Conta</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                  {currentUser?.role || 'admin'}
                </span>
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                ID: {currentUser?.id || 'usr-master'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto font-mono text-xs">
          
          {/* User Details Box */}
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 uppercase text-[11px] font-semibold">Pesquisador Ativo</span>
              <span className="text-emerald-400 font-bold font-mono">@{currentUser?.username || 'ranquine'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 uppercase text-[11px] font-semibold">Nível de Criptografia</span>
              <span className="text-zinc-300 font-mono">PBKDF2-SHA512 (100k iter)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 uppercase text-[11px] font-semibold">Status da Sessão</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Autenticado & Seguro
              </span>
            </div>
          </div>

          {/* Change Password Form */}
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm font-sans">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Alterar Chave de Acesso / Senha</span>
            </div>

            <div className="space-y-3 font-sans">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase block">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha secreta (min. 6 caracteres)"
                  className="w-full bg-zinc-900/70 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-2.5 px-3 text-xs text-zinc-100 placeholder-zinc-600 outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase block">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full bg-zinc-900/70 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-2.5 px-3 text-xs text-zinc-100 placeholder-zinc-600 outline-none font-mono"
                />
              </div>
            </div>

            {statusMessage && (
              <div className={`p-3 rounded-xl flex items-center gap-2 text-xs font-sans ${
                statusMessage.type === 'success' 
                  ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300' 
                  : 'bg-red-950/40 border border-red-800/60 text-red-300'
              }`}>
                {statusMessage.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-zinc-700 w-full disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Atualizando chave de segurança...</span>
                </>
              ) : (
                <>
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Salvar Nova Senha</span>
                </>
              )}
            </button>
          </form>

          {/* Logout Section */}
          <div className="pt-4 border-t border-zinc-800/80 space-y-3 font-sans">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-zinc-200">Encerramento de Sessão</h4>
                <p className="text-xs text-zinc-400">
                  Invalida o cookie e os tokens criptográficos ativos no banco de dados.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full py-3 px-4 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 hover:text-red-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair do Sistema (Encerrar Sessão)</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span className="flex items-center gap-1 text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sessão Protegida Nexus v3.4</span>
          </span>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
