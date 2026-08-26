'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/components/ThemeContext';
import { Palette, Check, ChevronDown, Sparkles } from '@/lib/icons';

export function ThemeSelector() {
  const { currentTheme, themeId, setTheme, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-white/10 bg-zinc-900/60 hover:bg-zinc-800/80 text-xs text-zinc-300 hover:text-white transition-all backdrop-blur-md shadow-sm"
        title="Alternar Tema Visual"
      >
        <span className="text-sm">{currentTheme.icon}</span>
        <span className="hidden md:inline font-mono font-medium">{currentTheme.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 p-2 rounded-2xl bg-zinc-950/95 border border-zinc-800 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 font-mono">
          <div className="px-2.5 py-1.5 mb-1 flex items-center justify-between border-b border-zinc-800/60 text-[11px] text-zinc-400 font-semibold tracking-wider uppercase">
            <span className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-emerald-400" />
              Temas Cyber UI
            </span>
            <span className="text-[10px] text-zinc-500">{availableThemes.length} Temas</span>
          </div>

          <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
            {availableThemes.map((theme) => {
              const isSelected = theme.id === themeId;
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    setTheme(theme.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-all ${
                    isSelected 
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-white font-medium' 
                      : 'hover:bg-zinc-800/60 text-zinc-300 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{theme.icon}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-xs">{theme.name}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500">{theme.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Palette Preview Dots */}
                    <div className="flex items-center -space-x-1">
                      <span 
                        className="w-3 h-3 rounded-full border border-black/40 shadow-sm"
                        style={{ backgroundColor: theme.previewColors.bg }}
                      />
                      <span 
                        className="w-3 h-3 rounded-full border border-black/40 shadow-sm"
                        style={{ backgroundColor: theme.previewColors.card }}
                      />
                      <span 
                        className="w-3 h-3 rounded-full border border-black/40 shadow-sm ring-1 ring-white/20"
                        style={{ backgroundColor: theme.previewColors.accent }}
                      />
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
