import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeContext';

export const metadata: Metadata = {
  title: 'ReconCorrelator Nexus | Enterprise MSSP & Cyber Threat Intelligence Platform',
  description: 'Plataforma soberana de inteligência cibernética ofensiva, correlação de ativos e gestão contínua de superfície de ataque (ASM) com cofre criptografado militar.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning className="antialiased min-h-screen">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
