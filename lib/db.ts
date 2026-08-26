import fs from 'fs';
import path from 'path';
import { TargetProject, CorrelatedAsset, Vulnerability } from '@/types/recon';
import { SAMPLE_PROJECTS, SAMPLE_ASSETS } from '@/lib/sampleData';

export interface ReconCacheEntry {
  id: string;
  tool: string;
  target: string;
  paramsHash?: string;
  data: any;
  cachedAt: string;
  expiresAt: string;
}

export interface StoredTerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'system' | 'banner' | 'ai';
  text: string;
  timestamp: string;
}

export interface StoredTerminalSession {
  id: string;
  projectId: string;
  name: string;
  folderId: string;
  lines: StoredTerminalLine[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoredTerminalFolder {
  id: string;
  projectId: string;
  name: string;
  isOpen: boolean;
}

export interface StoredReport {
  id: string;
  protocol: string;
  projectId?: string;
  title: string;
  fileName: string;
  classification: string;
  status: string;
  content: string;
  approvals: {
    role: string;
    handle: string;
    status: 'AUTORIZADO' | 'HOMOLOGADO' | 'CONFORME' | 'RELEASE_CONCLUIDA' | 'PENDENTE';
  }[];
  createdAt: string;
}

export interface ReconDatabaseSchema {
  version: number;
  lastUpdated: string;
  projects: TargetProject[];
  assets: CorrelatedAsset[];
  reconCache: ReconCacheEntry[];
  terminalSessions: StoredTerminalSession[];
  terminalFolders: StoredTerminalFolder[];
  reports: StoredReport[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'recon_correlator_db.json');
const REPORTS_DIR = path.join(process.cwd(), 'reports');

// Ensure data and reports directories exist
function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

// Initial state with sample data if fresh database
function getInitialDatabaseState(): ReconDatabaseSchema {
  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    projects: SAMPLE_PROJECTS,
    assets: SAMPLE_ASSETS,
    reconCache: [],
    terminalSessions: [
      {
        id: 'default-session',
        projectId: SAMPLE_PROJECTS[0].id,
        name: 'Console Alpha (Red Team)',
        folderId: 'recon-osint',
        lines: [
          {
            id: 'line-init-1',
            type: 'banner',
            text: 'ReconCorrelator Arsenal v3.5 [ALPHA Red Team Squad] - Sistema Autônomo Ativo',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'line-init-2',
            type: 'system',
            text: 'Conexão segura com banco de dados central estabelecida. Caching idempotente ativado.',
            timestamp: new Date().toISOString(),
          }
        ],
        pinned: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ],
    terminalFolders: [
      { id: 'recon-osint', projectId: SAMPLE_PROJECTS[0].id, name: 'Recon & OSINT', isOpen: true },
      { id: 'vuln-scans', projectId: SAMPLE_PROJECTS[0].id, name: 'Auditoria & Takeovers', isOpen: true },
      { id: 'ai-chats', projectId: SAMPLE_PROJECTS[0].id, name: 'AI Red Team Prompts', isOpen: true },
    ],
    reports: [],
  };
}

// Read database from disk
export function readDatabase(): ReconDatabaseSchema {
  ensureDirectories();
  if (!fs.existsSync(DB_FILE)) {
    const initialState = getInitialDatabaseState();
    writeDatabase(initialState);
    return initialState;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as ReconDatabaseSchema;
    
    // Ensure all tables exist in case of version upgrades
    if (!Array.isArray(parsed.projects)) parsed.projects = SAMPLE_PROJECTS;
    if (!Array.isArray(parsed.assets)) parsed.assets = SAMPLE_ASSETS;
    if (!Array.isArray(parsed.reconCache)) parsed.reconCache = [];
    if (!Array.isArray(parsed.terminalSessions)) parsed.terminalSessions = [];
    if (!Array.isArray(parsed.terminalFolders)) parsed.terminalFolders = [];
    if (!Array.isArray(parsed.reports)) parsed.reports = [];

    return parsed;
  } catch (err) {
    console.error('Error reading database file, repairing with fallback:', err);
    const fallback = getInitialDatabaseState();
    writeDatabase(fallback);
    return fallback;
  }
}

// Write database to disk atomically
export function writeDatabase(data: ReconDatabaseSchema): void {
  ensureDirectories();
  data.lastUpdated = new Date().toISOString();
  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing database file atomically:', err);
    // Fallback direct write
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }
}

/* ========================================================================= */
/* PROJECTS API HELPERS                                                      */
/* ========================================================================= */

export function getProjects(): TargetProject[] {
  const db = readDatabase();
  return db.projects;
}

export function getProjectById(projectId: string): TargetProject | undefined {
  const db = readDatabase();
  return db.projects.find(p => p.id === projectId);
}

export function upsertProject(project: TargetProject): TargetProject {
  const db = readDatabase();
  const index = db.projects.findIndex(p => p.id === project.id);
  if (index >= 0) {
    db.projects[index] = { ...db.projects[index], ...project };
  } else {
    db.projects.unshift(project);
  }
  writeDatabase(db);
  return project;
}

export function deleteProject(projectId: string): boolean {
  const db = readDatabase();
  const initialCount = db.projects.length;
  db.projects = db.projects.filter(p => p.id !== projectId);
  // Cascade delete assets belonging to project domain
  const targetProj = db.projects.find(p => p.id === projectId);
  if (targetProj) {
    db.assets = db.assets.filter(a => a.rootDomain !== targetProj.domain);
  }
  // Delete terminal sessions
  db.terminalSessions = db.terminalSessions.filter(s => s.projectId !== projectId);
  db.terminalFolders = db.terminalFolders.filter(f => f.projectId !== projectId);
  
  writeDatabase(db);
  return db.projects.length < initialCount;
}

/* ========================================================================= */
/* ASSETS & VULNERABILITIES API HELPERS                                      */
/* ========================================================================= */

export function getAssets(domainOrProjectId?: string): CorrelatedAsset[] {
  const db = readDatabase();
  if (!domainOrProjectId) {
    return db.assets;
  }
  
  // Find project if ID provided
  const proj = db.projects.find(p => p.id === domainOrProjectId || p.domain === domainOrProjectId);
  const targetDomain = proj ? proj.domain.toLowerCase() : domainOrProjectId.toLowerCase();

  return db.assets.filter(a => {
    return a.rootDomain?.toLowerCase() === targetDomain || 
           a.subdomain?.toLowerCase().endsWith(`.${targetDomain}`) ||
           a.subdomain?.toLowerCase() === targetDomain;
  });
}

export function upsertAssets(newStubs: Partial<CorrelatedAsset>[], rootDomain?: string): CorrelatedAsset[] {
  const db = readDatabase();
  const mergedMap = new Map<string, CorrelatedAsset>();

  // Load existing assets into map
  for (const existing of db.assets) {
    mergedMap.set(existing.subdomain.toLowerCase(), existing);
  }

  // Merge or add new stubs
  for (const stub of newStubs) {
    if (!stub.subdomain) continue;
    const key = stub.subdomain.toLowerCase().trim();
    const existing = mergedMap.get(key);

    if (existing) {
      mergedMap.set(key, {
        ...existing,
        rootDomain: stub.rootDomain || existing.rootDomain || rootDomain || '',
        isAlive: stub.isAlive ?? existing.isAlive,
        httpStatus: stub.httpStatus ?? existing.httpStatus,
        httpTitle: stub.httpTitle ?? existing.httpTitle,
        webServer: stub.webServer ?? existing.webServer,
        contentType: stub.contentType ?? existing.contentType,
        contentLength: stub.contentLength ?? existing.contentLength,
        ips: Array.from(new Set([...existing.ips, ...(stub.ips || [])])),
        cnames: Array.from(new Set([...existing.cnames, ...(stub.cnames || [])])),
        ports: stub.ports && stub.ports.length > 0 ? stub.ports : existing.ports,
        technologies: stub.technologies && stub.technologies.length > 0 ? stub.technologies : existing.technologies,
        vulnerabilities: stub.vulnerabilities && stub.vulnerabilities.length > 0 ? stub.vulnerabilities : existing.vulnerabilities,
        tags: Array.from(new Set([...existing.tags, ...(stub.tags || [])])),
        takeoverRisk: stub.takeoverRisk ?? existing.takeoverRisk,
        takeoverDetails: stub.takeoverDetails ?? existing.takeoverDetails,
        cloudProvider: stub.cloudProvider ?? existing.cloudProvider,
        lastUpdated: new Date().toISOString(),
      });
    } else {
      const newAsset: CorrelatedAsset = {
        id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        subdomain: key,
        rootDomain: stub.rootDomain || rootDomain || (key.includes('.') ? key.split('.').slice(-2).join('.') : key),
        isAlive: stub.isAlive ?? false,
        httpStatus: stub.httpStatus,
        httpTitle: stub.httpTitle,
        webServer: stub.webServer,
        contentType: stub.contentType,
        contentLength: stub.contentLength,
        cnames: stub.cnames || [],
        ips: stub.ips || [],
        ports: stub.ports || [],
        technologies: stub.technologies || [],
        vulnerabilities: stub.vulnerabilities || [],
        takeoverRisk: stub.takeoverRisk ?? false,
        takeoverDetails: stub.takeoverDetails,
        cloudProvider: stub.cloudProvider || 'unknown',
        firstSeen: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        inScope: stub.inScope ?? true,
        tags: stub.tags || ['discovery'],
        discoveredVia: stub.discoveredVia || 'manual',
      };
      mergedMap.set(key, newAsset);
    }
  }

  db.assets = Array.from(mergedMap.values());
  writeDatabase(db);
  return db.assets;
}

export function addVulnerabilityToAsset(vuln: Vulnerability): CorrelatedAsset[] {
  const db = readDatabase();
  db.assets = db.assets.map(asset => {
    if (asset.subdomain === vuln.matchedAt || vuln.matchedAt.includes(asset.subdomain)) {
      return {
        ...asset,
        vulnerabilities: [vuln, ...asset.vulnerabilities.filter(v => v.id !== vuln.id)],
        lastUpdated: new Date().toISOString(),
      };
    }
    return asset;
  });
  writeDatabase(db);
  return db.assets;
}

export function clearAssetsForDomain(rootDomain: string): void {
  const db = readDatabase();
  const cleanDomain = rootDomain.toLowerCase().trim();
  db.assets = db.assets.filter(a => a.rootDomain?.toLowerCase() !== cleanDomain && a.subdomain?.toLowerCase() !== cleanDomain);
  writeDatabase(db);
}

/* ========================================================================= */
/* RECON CACHING ENGINE (IDEMPOTENCY & SPEED)                                */
/* ========================================================================= */

export function getCachedRecon(tool: string, target: string, paramsHash: string = 'default'): any | null {
  const db = readDatabase();
  const cleanTarget = target.trim().toLowerCase();
  const now = new Date().getTime();

  const entry = db.reconCache.find(c => 
    c.tool === tool && 
    c.target.toLowerCase() === cleanTarget && 
    (c.paramsHash || 'default') === paramsHash
  );

  if (entry) {
    const expires = new Date(entry.expiresAt).getTime();
    if (expires > now) {
      return entry.data;
    }
  }
  return null;
}

export function setCachedRecon(tool: string, target: string, data: any, ttlMinutes: number = 60, paramsHash: string = 'default'): void {
  const db = readDatabase();
  const cleanTarget = target.trim().toLowerCase();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString();

  // Remove existing cache entry for this combination
  db.reconCache = db.reconCache.filter(c => 
    !(c.tool === tool && c.target.toLowerCase() === cleanTarget && (c.paramsHash || 'default') === paramsHash)
  );

  db.reconCache.push({
    id: `cache-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    tool,
    target: cleanTarget,
    paramsHash,
    data,
    cachedAt: now.toISOString(),
    expiresAt,
  });

  // Limit cache entries to 500 to keep DB compact
  if (db.reconCache.length > 500) {
    db.reconCache = db.reconCache.slice(-300);
  }

  writeDatabase(db);
}

/* ========================================================================= */
/* TERMINAL SESSIONS & FOLDERS                                               */
/* ========================================================================= */

export function getTerminalData(projectId: string) {
  const db = readDatabase();
  const sessions = db.terminalSessions.filter(s => s.projectId === projectId);
  const folders = db.terminalFolders.filter(f => f.projectId === projectId);

  return {
    sessions: sessions.length > 0 ? sessions : [
      {
        id: `sess-${projectId}-main`,
        projectId,
        name: 'Console Principal (Red Team)',
        folderId: 'recon-osint',
        lines: [
          {
            id: `line-${Date.now()}-1`,
            type: 'banner' as const,
            text: 'ReconCorrelator Terminal Arsenal v3.5 - Central Server Backend Ativo',
            timestamp: new Date().toISOString(),
          },
          {
            id: `line-${Date.now()}-2`,
            type: 'system' as const,
            text: `Alvo ativo: ${projectId}. Comandos e respostas persistidos no banco de dados central.`,
            timestamp: new Date().toISOString(),
          }
        ],
        pinned: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ],
    folders: folders.length > 0 ? folders : [
      { id: 'recon-osint', projectId, name: 'Recon & OSINT', isOpen: true },
      { id: 'vuln-scans', projectId, name: 'Auditoria & Takeovers', isOpen: true },
      { id: 'ai-chats', projectId, name: 'AI Red Team Prompts', isOpen: true },
    ]
  };
}

export function saveTerminalData(projectId: string, sessions: StoredTerminalSession[], folders: StoredTerminalFolder[]): void {
  const db = readDatabase();
  
  // Replace sessions for this project
  db.terminalSessions = [
    ...db.terminalSessions.filter(s => s.projectId !== projectId),
    ...sessions.map(s => ({ ...s, projectId, updatedAt: new Date().toISOString() }))
  ];

  // Replace folders for this project
  db.terminalFolders = [
    ...db.terminalFolders.filter(f => f.projectId !== projectId),
    ...folders.map(f => ({ ...f, projectId }))
  ];

  writeDatabase(db);
}

/* ========================================================================= */
/* AUDIT & BUG BOUNTY REPORTS                                                */
/* ========================================================================= */

export function getAllReports(): StoredReport[] {
  ensureDirectories();
  const reportsList: StoredReport[] = [];

  // Read from reports/ directory
  try {
    const files = fs.readdirSync(REPORTS_DIR);
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(REPORTS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Extract basic metadata
        const protocolMatch = content.match(/Protocolo:\*?\*?\s*`?([A-Z0-9-]+)`?/i);
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const statusMatch = content.match(/Status da Entrega:\*?\*?\s*(.+)$/m);
        const classificationMatch = content.match(/Classificação:\*?\*?\s*(.+)$/m);
        
        const stat = fs.statSync(filePath);

        reportsList.push({
          id: `rep-${file}`,
          protocol: protocolMatch ? protocolMatch[1] : file.replace('.md', ''),
          title: titleMatch ? titleMatch[1].replace(/^[📋🛡️🔍🚀📢\s]+/, '').trim() : file,
          fileName: file,
          classification: classificationMatch ? classificationMatch[1].trim() : 'Auditoria & Engenharia',
          status: statusMatch ? statusMatch[1].trim() : '✅ APROVADO & HOMOLOGADO',
          content,
          approvals: [
            { role: 'Chefe de Engenharia & Arquitetura', handle: '@ApexBlueprint', status: 'AUTORIZADO' },
            { role: 'Chefe de Red Team & Ciberdefesa', handle: '@ShadowStrike', status: 'AUTORIZADO' },
            { role: 'Chefe de Blue Team & Defesa', handle: '@SentinelNexus', status: 'CONFORME' },
            { role: 'Chefe de DevSecOps & Mitigação', handle: '@AegisForge', status: 'HOMOLOGADO' },
            { role: 'Chefe de Governança & Risco (GRC)', handle: '@CoreGovernance', status: 'CONFORME' },
            { role: 'Diretoria Executiva / Board', handle: '@NexusPrime', status: 'RELEASE_CONCLUIDA' },
          ],
          createdAt: stat.birthtime.toISOString(),
        });
      }
    }
  } catch (err) {
    console.error('Error reading reports directory:', err);
  }

  // Sort descending by creation date
  return reportsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function saveReportToDisk(report: {
  protocol: string;
  title: string;
  content: string;
  classification?: string;
  status?: string;
}): StoredReport {
  ensureDirectories();
  const safeProtocol = report.protocol.replace(/[^a-zA-Z0-9-_]/g, '');
  const fileName = `${safeProtocol}.md`;
  const filePath = path.join(REPORTS_DIR, fileName);

  fs.writeFileSync(filePath, report.content, 'utf-8');

  const stored: StoredReport = {
    id: `rep-${safeProtocol}`,
    protocol: report.protocol,
    title: report.title,
    fileName,
    classification: report.classification || 'Governança Corporativa / Engenharia & Ciberdefesa',
    status: report.status || '✅ APROVADO & HOMOLOGADO',
    content: report.content,
    approvals: [
      { role: 'Chefe de Engenharia & Arquitetura', handle: '@ApexBlueprint', status: 'AUTORIZADO' },
      { role: 'Chefe de Red Team & Ciberdefesa', handle: '@ShadowStrike', status: 'AUTORIZADO' },
      { role: 'Chefe de Blue Team & Defesa', handle: '@SentinelNexus', status: 'CONFORME' },
      { role: 'Chefe de DevSecOps & Mitigação', handle: '@AegisForge', status: 'HOMOLOGADO' },
      { role: 'Chefe de Governança & Risco (GRC)', handle: '@CoreGovernance', status: 'CONFORME' },
      { role: 'Diretoria Executiva / Board', handle: '@NexusPrime', status: 'RELEASE_CONCLUIDA' },
    ],
    createdAt: new Date().toISOString(),
  };

  return stored;
}
