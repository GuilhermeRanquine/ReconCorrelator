import fs from 'fs';
import path from 'path';
import { TargetProject, CorrelatedAsset, Vulnerability } from '@/types/recon';
import { SAMPLE_PROJECTS, SAMPLE_ASSETS } from '@/lib/sampleData';

export interface ReconCacheEntry {
  id: string;
  tool: string;
  target: string;
  paramsHash: string;
  data: any;
  cachedAt: string;
  expiresAt: string;
}

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'system' | 'banner' | 'ai';
  text: string;
  timestamp: string;
}

export interface TerminalSession {
  id: string;
  name: string;
  folderId: string;
  targetId?: string;
  lines: TerminalLine[];
  pinned: boolean;
  createdAt: string;
}

export interface TerminalFolder {
  id: string;
  name: string;
  targetId?: string;
  isOpen: boolean;
}

export interface ReportEntry {
  id: string;
  protocol: string;
  title: string;
  filename: string;
  content: string;
  targetDomain?: string;
  createdAt: string;
  author?: string;
}

export interface DatabaseSchema {
  version: number;
  lastUpdated: string;
  projects: TargetProject[];
  assets: CorrelatedAsset[];
  reconCache: ReconCacheEntry[];
  terminalSessions: TerminalSession[];
  terminalFolders: TerminalFolder[];
  reports: ReportEntry[];
  auditLogs: {
    id: string;
    timestamp: string;
    action: string;
    details: any;
  }[];
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'recon_correlator_db.json');

// Ensure data folder exists
function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

// Initial seed
function getInitialDbState(): DatabaseSchema {
  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    projects: SAMPLE_PROJECTS,
    assets: SAMPLE_ASSETS,
    reconCache: [],
    terminalSessions: [],
    terminalFolders: [
      { id: 'recon-osint', name: 'Recon & OSINT', isOpen: true },
      { id: 'vuln-scans', name: 'Auditoria & Takeovers', isOpen: true },
      { id: 'ai-chats', name: 'AI Red Team Prompts', isOpen: true },
    ],
    reports: [],
    auditLogs: [
      {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'DB_INITIALIZATION',
        details: { message: 'Banco de dados ReconCorrelator inicializado com sucesso.' },
      },
    ],
  };
}

let writeLock = Promise.resolve();

/**
 * Reads database schema with fallback & auto-recovery
 */
export async function readDb(): Promise<DatabaseSchema> {
  ensureDbDir();
  if (!fs.existsSync(DB_PATH)) {
    const initialState = getInitialDbState();
    await writeDb(initialState);
    return initialState;
  }

  try {
    const content = fs.readFileSync(DB_PATH, 'utf-8');
    if (!content.trim()) {
      const initialState = getInitialDbState();
      await writeDb(initialState);
      return initialState;
    }
    const parsed = JSON.parse(content) as DatabaseSchema;
    if (!parsed.projects || !Array.isArray(parsed.projects)) {
      parsed.projects = SAMPLE_PROJECTS;
    }
    if (!parsed.assets || !Array.isArray(parsed.assets)) {
      parsed.assets = SAMPLE_ASSETS;
    }
    if (!parsed.reconCache || !Array.isArray(parsed.reconCache)) {
      parsed.reconCache = [];
    }
    if (!parsed.terminalSessions || !Array.isArray(parsed.terminalSessions)) {
      parsed.terminalSessions = [];
    }
    if (!parsed.terminalFolders || !Array.isArray(parsed.terminalFolders)) {
      parsed.terminalFolders = [];
    }
    if (!parsed.reports || !Array.isArray(parsed.reports)) {
      parsed.reports = [];
    }
    return parsed;
  } catch (err) {
    console.error('Error reading database, restoring baseline:', err);
    const initialState = getInitialDbState();
    await writeDb(initialState);
    return initialState;
  }
}

/**
 * Thread-safe atomic write to DB
 */
export async function writeDb(data: DatabaseSchema): Promise<void> {
  ensureDbDir();
  data.lastUpdated = new Date().toISOString();
  
  // Chain write locks to avoid race conditions
  writeLock = writeLock.then(() => {
    return new Promise<void>((resolve, reject) => {
      try {
        const tmpPath = `${DB_PATH}.tmp.${Date.now()}`;
        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
        fs.renameSync(tmpPath, DB_PATH);
        resolve();
      } catch (err) {
        console.error('Failed to atomically write DB:', err);
        reject(err);
      }
    });
  });

  return writeLock;
}

// ----------------------------------------------------
// 📁 PROJECT OPERATIONS
// ----------------------------------------------------

export async function getProjects(): Promise<TargetProject[]> {
  const db = await readDb();
  return db.projects;
}

export async function getProjectById(id: string): Promise<TargetProject | null> {
  const db = await readDb();
  return db.projects.find(p => p.id === id) || null;
}

export async function saveProject(project: TargetProject): Promise<TargetProject[]> {
  const db = await readDb();
  const index = db.projects.findIndex(p => p.id === project.id);
  if (index >= 0) {
    db.projects[index] = project;
  } else {
    db.projects.unshift(project);
  }
  await writeDb(db);
  return db.projects;
}

export async function deleteProject(id: string): Promise<{ remaining: TargetProject[] }> {
  const db = await readDb();
  const projToDelete = db.projects.find(p => p.id === id);
  db.projects = db.projects.filter(p => p.id !== id);
  if (projToDelete) {
    // Also clean up or unlink assets for deleted project if applicable
    db.assets = db.assets.filter(a => a.rootDomain !== projToDelete.domain);
    db.terminalSessions = db.terminalSessions.filter(s => s.targetId !== id);
  }
  await writeDb(db);
  return { remaining: db.projects };
}

// ----------------------------------------------------
// 🎯 ASSET OPERATIONS (Deduplication & Smart Upsert)
// ----------------------------------------------------

export async function getAssets(filter?: { rootDomain?: string; projectId?: string }): Promise<CorrelatedAsset[]> {
  const db = await readDb();
  if (filter?.rootDomain) {
    const root = filter.rootDomain.toLowerCase().trim();
    return db.assets.filter(a => a.rootDomain.toLowerCase() === root || a.subdomain.toLowerCase().endsWith(`.${root}`));
  }
  return db.assets;
}

export async function upsertAssets(
  newStubs: Partial<CorrelatedAsset>[],
  defaultRootDomain: string = 'target.com'
): Promise<CorrelatedAsset[]> {
  const db = await readDb();
  const assetMap = new Map<string, CorrelatedAsset>();

  // Index existing assets by subdomain
  for (const asset of db.assets) {
    assetMap.set(asset.subdomain.toLowerCase().trim(), asset);
  }

  // Merge incoming stubs without duplicate entries
  for (const stub of newStubs) {
    if (!stub.subdomain) continue;
    const key = stub.subdomain.toLowerCase().trim();
    const existing = assetMap.get(key);

    if (existing) {
      // Merge properties smartly
      const mergedIps = Array.from(new Set([...(existing.ips || []), ...(stub.ips || [])]));
      const mergedCnames = Array.from(new Set([...(existing.cnames || []), ...(stub.cnames || [])]));
      const mergedTags = Array.from(new Set([...(existing.tags || []), ...(stub.tags || [])]));

      // Merge ports
      const portMap = new Map<number, any>();
      for (const p of existing.ports || []) portMap.set(p.port, p);
      for (const p of stub.ports || []) portMap.set(p.port, p);

      // Merge technologies
      const techMap = new Map<string, any>();
      for (const t of existing.technologies || []) techMap.set(t.name.toLowerCase(), t);
      for (const t of stub.technologies || []) techMap.set(t.name.toLowerCase(), t);

      // Merge vulnerabilities
      const vulnsMap = new Map<string, Vulnerability>();
      for (const v of existing.vulnerabilities || []) vulnsMap.set(v.id || v.name, v);
      for (const v of stub.vulnerabilities || []) vulnsMap.set(v.id || v.name, v);

      assetMap.set(key, {
        ...existing,
        isAlive: stub.isAlive !== undefined ? stub.isAlive : existing.isAlive,
        httpStatus: stub.httpStatus ?? existing.httpStatus,
        httpTitle: stub.httpTitle || existing.httpTitle,
        webServer: stub.webServer || existing.webServer,
        contentType: stub.contentType || existing.contentType,
        contentLength: stub.contentLength ?? existing.contentLength,
        responseUrl: stub.responseUrl || existing.responseUrl,
        ips: mergedIps,
        cnames: mergedCnames,
        ports: Array.from(portMap.values()),
        technologies: Array.from(techMap.values()),
        vulnerabilities: Array.from(vulnsMap.values()),
        takeoverRisk: stub.takeoverRisk !== undefined ? stub.takeoverRisk : existing.takeoverRisk,
        takeoverDetails: stub.takeoverDetails || existing.takeoverDetails,
        takeoverFingerprint: stub.takeoverFingerprint || existing.takeoverFingerprint,
        tags: mergedTags,
        lastUpdated: new Date().toISOString(),
      });
    } else {
      // Create new clean asset entry
      const newAsset: CorrelatedAsset = {
        id: stub.id || `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        subdomain: stub.subdomain.trim(),
        rootDomain: stub.rootDomain || defaultRootDomain,
        isAlive: stub.isAlive ?? false,
        httpStatus: stub.httpStatus,
        httpTitle: stub.httpTitle,
        webServer: stub.webServer,
        contentType: stub.contentType,
        contentLength: stub.contentLength,
        responseUrl: stub.responseUrl,
        cnames: stub.cnames || [],
        ips: stub.ips || [],
        dnsRecords: stub.dnsRecords || [],
        ports: stub.ports || [],
        technologies: stub.technologies || [],
        vulnerabilities: stub.vulnerabilities || [],
        takeoverRisk: stub.takeoverRisk ?? false,
        takeoverDetails: stub.takeoverDetails,
        takeoverFingerprint: stub.takeoverFingerprint,
        firstSeen: stub.firstSeen || new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        inScope: stub.inScope !== undefined ? stub.inScope : true,
        tags: stub.tags || ['live-discovery'],
        discoveredVia: stub.discoveredVia || 'manual',
      };
      assetMap.set(key, newAsset);
    }
  }

  db.assets = Array.from(assetMap.values());
  await writeDb(db);
  return db.assets;
}

export async function clearAssets(rootDomain?: string): Promise<void> {
  const db = await readDb();
  if (rootDomain) {
    const root = rootDomain.toLowerCase().trim();
    db.assets = db.assets.filter(a => a.rootDomain.toLowerCase() !== root);
  } else {
    db.assets = [];
  }
  await writeDb(db);
}

// ----------------------------------------------------
// ⚡ RECON SCRIPT CACHE & FAST RESULT DISPATCHER
// ----------------------------------------------------

/**
 * Checks if a tool run exists in cache for the target
 */
export async function getReconCache(tool: string, target: string, paramsHash: string = 'default'): Promise<any | null> {
  const db = await readDb();
  const cleanTarget = target.toLowerCase().trim();
  const now = new Date().getTime();

  const entry = db.reconCache.find(
    c => c.tool === tool && c.target.toLowerCase() === cleanTarget && c.paramsHash === paramsHash
  );

  if (entry) {
    const expTime = new Date(entry.expiresAt).getTime();
    if (expTime > now) {
      return entry.data;
    }
  }
  return null;
}

/**
 * Saves tool execution results into database cache with TTL (Default: 24h)
 */
export async function setReconCache(
  tool: string,
  target: string,
  data: any,
  ttlSeconds: number = 86400,
  paramsHash: string = 'default'
): Promise<void> {
  const db = await readDb();
  const cleanTarget = target.toLowerCase().trim();
  const cachedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const existingIdx = db.reconCache.findIndex(
    c => c.tool === tool && c.target.toLowerCase() === cleanTarget && c.paramsHash === paramsHash
  );

  const cacheEntry: ReconCacheEntry = {
    id: `cache-${tool}-${Date.now()}`,
    tool,
    target: cleanTarget,
    paramsHash,
    data,
    cachedAt,
    expiresAt,
  };

  if (existingIdx >= 0) {
    db.reconCache[existingIdx] = cacheEntry;
  } else {
    db.reconCache.push(cacheEntry);
  }

  // Keep cache to last 500 items max
  if (db.reconCache.length > 500) {
    db.reconCache = db.reconCache.slice(-500);
  }

  await writeDb(db);
}

// ----------------------------------------------------
// 💻 TERMINAL SESSIONS & FOLDERS PERSISTENCE
// ----------------------------------------------------

export async function getTerminalState(targetId: string) {
  const db = await readDb();
  const folders = db.terminalFolders.filter(f => !f.targetId || f.targetId === targetId);
  const sessions = db.terminalSessions.filter(s => !s.targetId || s.targetId === targetId);
  return { folders, sessions };
}

export async function saveTerminalState(
  targetId: string,
  folders: TerminalFolder[],
  sessions: TerminalSession[]
) {
  const db = await readDb();

  // Update folders for this target
  const otherFolders = db.terminalFolders.filter(f => f.targetId && f.targetId !== targetId);
  const taggedFolders = folders.map(f => ({ ...f, targetId }));
  db.terminalFolders = [...otherFolders, ...taggedFolders];

  // Update sessions for this target
  const otherSessions = db.terminalSessions.filter(s => s.targetId && s.targetId !== targetId);
  const taggedSessions = sessions.map(s => ({ ...s, targetId }));
  db.terminalSessions = [...otherSessions, ...taggedSessions];

  await writeDb(db);
  return { folders: db.terminalFolders, sessions: db.terminalSessions };
}

// ----------------------------------------------------
// 📜 AUDIT & BUG BOUNTY REPORTS PERSISTENCE
// ----------------------------------------------------

export async function getReports(targetDomain?: string): Promise<ReportEntry[]> {
  const db = await readDb();
  if (targetDomain) {
    return db.reports.filter(r => r.targetDomain === targetDomain);
  }
  return db.reports;
}

export async function saveReport(report: Omit<ReportEntry, 'id' | 'createdAt'>): Promise<ReportEntry> {
  const db = await readDb();
  const fullReport: ReportEntry = {
    ...report,
    id: `rep-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  db.reports.unshift(fullReport);
  await writeDb(db);
  return fullReport;
}
