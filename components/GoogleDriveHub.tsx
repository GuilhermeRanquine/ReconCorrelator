'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TargetProject, CorrelatedAsset } from '@/types/recon';
import { 
  googleSignIn, 
  googleLogout, 
  getAccessToken, 
  initAuth 
} from '@/lib/googleAuth';
import { 
  listDriveFiles, 
  getOrCreateReconFolder, 
  uploadFileToDrive, 
  getDriveFileContent, 
  deleteDriveFile, 
  GoogleDriveFile 
} from '@/lib/googleDrive';
import { User } from '@/lib/googleAuth';
import { 
  HardDrive, 
  CloudUpload, 
  RefreshCw, 
  Trash2, 
  FileText, 
  ExternalLink, 
  Download, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  FolderSync, 
  FileJson, 
  Search, 
  Plus,
  Lock,
  LogOut,
  Check,
  X
} from '@/lib/icons';

interface GoogleDriveHubProps {
  target: TargetProject | null;
  assets: CorrelatedAsset[];
  onImportRawData?: (rawText: string) => void;
}

export function GoogleDriveHub({ target, assets, onImportRawData }: GoogleDriveHubProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isUploadingBackup, setIsUploadingBackup] = useState(false);
  
  // Confirmation Modal state for destructive operations (Mandatory Security Protocol)
  const [fileToDelete, setFileToDelete] = useState<GoogleDriveFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New Note Modal state
  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);

  const fetchFiles = useCallback(async (authToken: string, fId?: string) => {
    setIsLoadingFiles(true);
    try {
      let targetFolder = fId;
      if (!targetFolder) {
        targetFolder = await getOrCreateReconFolder(authToken);
        setFolderId(targetFolder);
      }

      const res = await listDriveFiles(authToken, {
        folderId: targetFolder,
        searchTerm: searchQuery || undefined,
      });
      setFiles(res.files || []);
    } catch (err: unknown) {
      console.error('Error fetching Google Drive files:', err);
      const errMsg = err instanceof Error ? err.message : 'Falha ao sincronizar arquivos do Google Drive';
      setStatusMessage({ type: 'error', text: errMsg });
    } finally {
      setIsLoadingFiles(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, authToken) => {
        setUser(currentUser);
        setToken(authToken);
        setIsAuthChecking(false);
        fetchFiles(authToken);
      },
      () => {
        setUser(null);
        setToken(null);
        setIsAuthChecking(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [fetchFiles]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setStatusMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setStatusMessage({ type: 'success', text: `Conectado como ${result.user.email}` });
        await fetchFiles(result.accessToken);
      }
    } catch (err: unknown) {
      console.error('Sign in failed:', err);
      const errMsg = err instanceof Error ? err.message : 'Falha na autenticação com Google Drive';
      setStatusMessage({ type: 'error', text: errMsg });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await googleLogout();
    setUser(null);
    setToken(null);
    setFiles([]);
    setStatusMessage({ type: 'info', text: 'Desconectado do Google Drive.' });
  };

  // Upload current session backup
  const handleBackupToDrive = async (format: 'markdown' | 'json') => {
    const currentToken = token || getAccessToken();
    if (!currentToken) {
      setStatusMessage({ type: 'error', text: 'Você precisa estar autenticado no Google Drive.' });
      return;
    }

    setIsUploadingBackup(true);
    setStatusMessage(null);

    try {
      let targetFolder = folderId;
      if (!targetFolder) {
        targetFolder = await getOrCreateReconFolder(currentToken);
        setFolderId(targetFolder);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      let fileName = '';
      let fileContent = '';
      let mime = 'text/plain';

      const targetDomain = target?.domain || 'target.com';
      const targetName = target?.name || 'Projeto Recon';
      const inScopeList = target?.inScope?.join(', ') || '*.target.com';
      const outOfScopeList = target?.outOfScope?.join(', ') || 'Nenhum';

      if (format === 'markdown') {
        fileName = `Recon_Report_${targetDomain}_${timestamp}.md`;
        mime = 'text/markdown';
        fileContent = `# Reconnaissance & Attack Surface Report: ${targetDomain}\n\n` +
          `**Data do Snapshot:** ${new Date().toLocaleString()}\n` +
          `**Alvo:** ${targetName} (\`${targetDomain}\`)\n` +
          `**Total de Ativos:** ${assets.length} | **Vivos:** ${assets.filter(a => a.isAlive).length}\n\n` +
          `## Escopo\n- **In-Scope:** ${inScopeList}\n- **Out-of-Scope:** ${outOfScopeList}\n\n` +
          `## Matriz de Ativos Descobertos\n` +
          assets.map(a => `- **${a.subdomain}** (${a.httpStatus || 'Down'}) - IPs: ${a.ips.join(', ') || 'N/A'} - Vulns: ${a.vulnerabilities.length}`).join('\n');
      } else {
        fileName = `Recon_Data_${targetDomain}_${timestamp}.json`;
        mime = 'application/json';
        fileContent = JSON.stringify({ target, assets, exportedAt: new Date().toISOString() }, null, 2);
      }

      await uploadFileToDrive(currentToken, fileName, fileContent, mime, targetFolder);
      setStatusMessage({ type: 'success', text: `Arquivo '${fileName}' enviado com sucesso para o Google Drive!` });
      await fetchFiles(currentToken, targetFolder);
    } catch (err: unknown) {
      console.error('Backup failed:', err);
      const errMsg = err instanceof Error ? err.message : 'Falha ao salvar no Google Drive';
      setStatusMessage({ type: 'error', text: errMsg });
    } finally {
      setIsUploadingBackup(false);
    }
  };

  // Create custom notes in Drive
  const handleCreateNote = async () => {
    const currentToken = token || getAccessToken();
    if (!currentToken || !docTitle.trim()) return;

    setIsCreatingDoc(true);
    try {
      let targetFolder = folderId;
      if (!targetFolder) {
        targetFolder = await getOrCreateReconFolder(currentToken);
        setFolderId(targetFolder);
      }

      const fileName = docTitle.endsWith('.md') ? docTitle : `${docTitle}.md`;
      await uploadFileToDrive(currentToken, fileName, docContent, 'text/markdown', targetFolder);
      
      setShowNewDocModal(false);
      setDocTitle('');
      setDocContent('');
      setStatusMessage({ type: 'success', text: `Nota '${fileName}' criada no Google Drive com sucesso!` });
      await fetchFiles(currentToken, targetFolder);
    } catch (err: unknown) {
      console.error('Create note failed:', err);
      const errMsg = err instanceof Error ? err.message : 'Falha ao criar nota no Google Drive';
      setStatusMessage({ type: 'error', text: errMsg });
    } finally {
      setIsCreatingDoc(false);
    }
  };

  // Confirm and delete file (Mandatory User Confirmation Dialog)
  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    const currentToken = token || getAccessToken();
    if (!currentToken) return;

    setIsDeleting(true);
    try {
      await deleteDriveFile(currentToken, fileToDelete.id);
      setStatusMessage({ type: 'success', text: `Arquivo '${fileToDelete.name}' excluído do Google Drive.` });
      setFileToDelete(null);
      await fetchFiles(currentToken, folderId || undefined);
    } catch (err: unknown) {
      console.error('Delete failed:', err);
      const errMsg = err instanceof Error ? err.message : 'Falha ao excluir arquivo do Google Drive';
      setStatusMessage({ type: 'error', text: errMsg });
    } finally {
      setIsDeleting(false);
    }
  };

  // Import text from Drive into app session
  const handleImportFile = async (file: GoogleDriveFile) => {
    const currentToken = token || getAccessToken();
    if (!currentToken) return;

    try {
      setStatusMessage({ type: 'info', text: `Carregando conteúdo de '${file.name}'...` });
      const content = await getDriveFileContent(currentToken, file.id);
      if (onImportRawData) {
        onImportRawData(content);
        setStatusMessage({ type: 'success', text: `Conteúdo de '${file.name}' importado com sucesso para a sessão!` });
      }
    } catch (err: unknown) {
      console.error('Import failed:', err);
      const errMsg = err instanceof Error ? err.message : 'Falha ao importar arquivo';
      setStatusMessage({ type: 'error', text: errMsg });
    }
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-100">Google Drive Cloud Storage Hub</h2>
              <span className="px-2 py-0.5 text-[10px] bg-blue-950/80 border border-blue-800 text-blue-400 rounded-full font-bold uppercase">
                OAuth 2.0 Ativo
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Armazene, sincronize e gerencie relatórios de Bug Bounty, matrizes de ativos e artefatos na nuvem com permissão do usuário.
            </p>
          </div>
        </div>

        {/* Auth Action */}
        <div>
          {isAuthChecking ? (
            <div className="text-xs text-zinc-500 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Verificando autenticação...
            </div>
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-semibold text-zinc-200">{user.displayName || 'Pesquisador'}</div>
                <div className="text-[10px] text-zinc-400">{user.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Desconectar da conta Google"
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-900 font-semibold rounded-lg text-xs flex items-center gap-2.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isSigningIn ? 'Conectando...' : 'Conectar Google Drive'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-red-950/40 border-red-800/80 text-red-300'
              : 'bg-cyan-950/40 border-cyan-800/80 text-cyan-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-zinc-500 hover:text-zinc-300 text-xs ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Content Area */}
      {!user ? (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-10 text-center space-y-4">
          <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto text-blue-400">
            <Lock className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-zinc-100">Autenticação Necessária</h3>
            <p className="text-xs text-zinc-400">
              Conecte sua conta do Google para sincronizar automaticamente relatórios de reconhecimento e manter cópias seguras da sua superfície de ataque no Google Drive.
            </p>
          </div>
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <CloudUpload className="w-4 h-4" />
            <span>Fazer Login com Google</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Quick Cloud Sync & Actions */}
          <div className="space-y-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <FolderSync className="w-4 h-4 text-emerald-400" />
                  <span>Sincronização Rápida</span>
                </span>
                <span className="text-[10px] text-zinc-500">Alvo: {target?.domain || 'Global'}</span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Envie o estado atual da sua superfície de ataque ({assets.length} ativos) diretamente para sua pasta no Google Drive:
              </p>

              <div className="space-y-2 pt-1">
                <button
                  onClick={() => handleBackupToDrive('markdown')}
                  disabled={isUploadingBackup}
                  className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-200 flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Salvar Relatório Markdown (.md)</span>
                  </div>
                  <CloudUpload className="w-3.5 h-3.5 text-zinc-400" />
                </button>

                <button
                  onClick={() => handleBackupToDrive('json')}
                  disabled={isUploadingBackup}
                  className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-200 flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <FileJson className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Salvar Dados Brutos JSON (.json)</span>
                  </div>
                  <CloudUpload className="w-3.5 h-3.5 text-zinc-400" />
                </button>

                <button
                  onClick={() => setShowNewDocModal(true)}
                  className="w-full py-2 px-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 rounded-lg text-xs font-semibold text-blue-300 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-blue-400" />
                    <span>Criar Nota / PoC no Drive</span>
                  </div>
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                </button>
              </div>
            </div>

            {/* Folder Info Box */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Pasta de Armazenamento</span>
              </div>
              <div className="text-[11px] text-zinc-400">
                Os relatórios são organizados na pasta: <strong className="text-zinc-200">ReconCorrelator Reports</strong> no seu Google Drive.
              </div>
              <div className="pt-2 flex items-center gap-2 text-[10px] text-zinc-500">
                <span>Total de Arquivos: {files.length}</span>
                <span>•</span>
                <span>Ativos mapeados: {assets.length}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Files List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-bold text-zinc-200">Arquivos no Google Drive</h3>
                  <span className="px-2 py-0.5 text-[10px] bg-zinc-800 text-zinc-400 rounded-md">
                    {files.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filtrar arquivos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && token) fetchFiles(token, folderId || undefined);
                      }}
                      className="pl-8 pr-2.5 py-1 bg-black border border-zinc-800 rounded-md text-xs text-zinc-200 focus:outline-none focus:border-blue-500 w-44"
                    />
                  </div>

                  <button
                    onClick={() => token && fetchFiles(token, folderId || undefined)}
                    disabled={isLoadingFiles}
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                    title="Atualizar lista de arquivos"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin text-blue-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Files Table / List */}
              {isLoadingFiles ? (
                <div className="py-12 text-center text-xs text-zinc-500 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-400" />
                  <p>Consultando Google Drive...</p>
                </div>
              ) : files.length === 0 ? (
                <div className="py-10 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-lg p-6 space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-zinc-600" />
                  <p className="text-zinc-400">Nenhum relatório encontrado na sua pasta do Google Drive.</p>
                  <p className="text-[11px] text-zinc-600">
                    Utilize os botões de sincronização rápida ao lado para fazer o primeiro upload.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/80 border border-zinc-800/80 rounded-lg overflow-hidden bg-black/40">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-900/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-zinc-800/80 rounded-lg text-zinc-300 shrink-0">
                          {file.name.endsWith('.json') ? (
                            <FileJson className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <FileText className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-zinc-200 truncate">{file.name}</div>
                          <div className="text-[10px] text-zinc-500 flex items-center gap-2 mt-0.5">
                            <span>
                              {file.modifiedTime
                                ? new Date(file.modifiedTime).toLocaleString()
                                : 'Data desconhecida'}
                            </span>
                            {file.size && (
                              <>
                                <span>•</span>
                                <span>{(parseInt(file.size, 10) / 1024).toFixed(1)} KB</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {onImportRawData && (
                          <button
                            onClick={() => handleImportFile(file)}
                            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                            title="Importar dados para a sessão atual"
                          >
                            <Download className="w-3 h-3 text-cyan-400" />
                            <span className="hidden sm:inline">Importar</span>
                          </button>
                        )}

                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                            title="Abrir no Google Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                          </a>
                        )}

                        <button
                          onClick={() => setFileToDelete(file)}
                          className="p-1.5 bg-zinc-800 hover:bg-red-950/80 text-zinc-400 hover:text-red-400 rounded transition-colors cursor-pointer"
                          title="Excluir arquivo do Google Drive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Dialog for Destructive Operations */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-red-900/60 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm text-zinc-100">Confirmar Exclusão de Arquivo</h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Você tem certeza de que deseja excluir permanentemente o arquivo{' '}
              <strong className="text-red-300 font-mono">&quot;{fileToDelete.name}&quot;</strong> do seu Google Drive?
              Esta ação não poderá ser desfeita.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Note Modal */}
      {showNewDocModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Criar Nota / PoC no Google Drive</span>
              </h3>
              <button
                onClick={() => setShowNewDocModal(false)}
                className="text-zinc-500 hover:text-zinc-200 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Nome do Arquivo:</label>
                <input
                  type="text"
                  placeholder={`PoC_Notes_${target?.domain || 'target'}.md`}
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-black border border-zinc-800 rounded-md text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Conteúdo da Nota (Markdown):</label>
                <textarea
                  rows={6}
                  placeholder={`# Notas de Reconhecimento: ${target?.domain || 'target.com'}\n- Descobertas preliminares...\n- Endpoints com parâmetros refletidos...`}
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-md text-xs text-zinc-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setShowNewDocModal(false)}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateNote}
                disabled={isCreatingDoc || !docTitle.trim()}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>{isCreatingDoc ? 'Salvando...' : 'Salvar no Drive'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
