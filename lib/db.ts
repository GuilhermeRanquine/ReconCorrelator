import fs from 'fs';
import path from 'path';
import { TargetProject, CorrelatedAsset, Vulnerability, generateAccessCode } from '@/types/recon';

export interface ReconCacheEntry {
  id: string;
  tool: string;
  target: string;
  targetId?: string;
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
  targetId?: string;
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

// Initial clean zero-state
function getInitialDbState(): DatabaseSchema {
  return {
    version: 2,
    lastUpdated: new Date().toISOString(),
    projects: [],
    assets: [],
    reconCache: [],
    terminalSessions: [],
    terminalFolders: [],
    reports: [],
    auditLogs: [
      {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'DB_CLEAN_SLATE_INITIALIZED',
        details: { message: 'Banco de dados ReconCorrelator inicializado limpo e zerado com isolamento por código de acesso.' },
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
      parsed.projects = [];
    }
    if (!parsed.assets || !Array.isArray(parsed.assets)) {
      parsed.assets = [];
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

    // Ensure all existing projects have an access code
    let mutated = false;
    for (const p of parsed.projects) {
      if (!p.accessCode) {
        p.accessCode = generateAccessCode();
        mutated = true;
      }
    }
    if (mutated) {
      await writeDb(parsed);
    }

    return parsed;
  } catch (err) {
    console.error('Error reading database, restoring pristine baseline:', err);
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
// 📁 PROJECT & BOUNTY OPERATIONS (Strict Access Code Isolation)
// ----------------------------------------------------

export async function getProjects(accessCode?: string): Promise<TargetProject[]> {
  const db = await readDb();
  if (accessCode) {
    const cleanCode = accessCode.trim().toUpperCase();
    return db.projects.filter(p => p.accessCode?.toUpperCase() === cleanCode);
  }
  return db.projects;
}

export async function getProjectById(id: string): Promise<TargetProject | null> {
  const db = await readDb();
  return db.projects.find(p => p.id === id) || null;
}

export async function getProjectByAccessCode(accessCode: string): Promise<TargetProject | null> {
  const db = await readDb();
  const cleanCode = accessCode.trim().toUpperCase();
  return db.projects.find(p => p.accessCode?.toUpperCase() === cleanCode) || null;
}

export async function saveProject(project: TargetProject): Promise<TargetProject[]> {
  const db = await readDb();
  
  // Ensure accessCode is present and uppercase
  if (!project.accessCode) {
    project.accessCode = generateAccessCode();
  } else {
    project.accessCode = project.accessCode.trim().toUpperCase();
  }

  // Ensure unique accessCode among other projects
  const existingWithCode = db.projects.find(p => p.id !== project.id && p.accessCode?.toUpperCase() === project.accessCode.toUpperCase());
  if (existingWithCode) {
    project.accessCode = generateAccessCode();
  }

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
    // Completely wipe all isolated data for this project
    db.assets = db.assets.filter(a => a.projectId !== id && a.rootDomain !== projToDelete.domain);
    db.terminalSessions = db.terminalSessions.filter(s => s.targetId !== id);
    db.terminalFolders = db.terminalFolders.filter(f => f.targetId !== id);
    db.reconCache = db.reconCache.filter(c => c.targetId !== id && c.target !== projToDelete.domain);
    db.reports = db.reports.filter(r => r.targetId !== id && r.targetDomain !== projToDelete.domain);
  }
  
  await writeDb(db);
  return { remaining: db.projects };
}

// ----------------------------------------------------
// 🎯 ASSET OPERATIONS (Strict Isolation by Project / Domain)
// ----------------------------------------------------

export async function getAssets(filter?: { rootDomain?: string; projectId?: string; accessCode?: string }): Promise<CorrelatedAsset[]> {
  const db = await readDb();
  
  if (filter?.projectId) {
    const pid = filter.projectId;
    const project = db.projects.find(p => p.id === pid);
    const domain = project?.domain.toLowerCase().trim();
    
    return db.assets.filter(a => {
      if (a.projectId && a.projectId === pid) return true;
      if (domain && (a.rootDomain.toLowerCase() === domain || a.subdomain.toLowerCase().endsWith(`.${domain}`))) {
        return true;
      }
      return false;
    });
  }

  if (filter?.accessCode) {
    const cleanCode = filter.accessCode.trim().toUpperCase();
    const project = db.projects.find(p => p.accessCode?.toUpperCase() === cleanCode);
    if (!project) return [];
    
    const domain = project.domain.toLowerCase().trim();
    return db.assets.filter(a => {
      if (a.projectId && a.projectId === project.id) return true;
      if (a.accessCode && a.accessCode.toUpperCase() === cleanCode) return true;
      if (a.rootDomain.toLowerCase() === domain || a.subdomain.toLowerCase().endsWith(`.${domain}`)) {
        return true;
      }
      return false;
    });
  }

  if (filter?.rootDomain) {
    const root = filter.rootDomain.toLowerCase().trim();
    return db.assets.filter(a => a.rootDomain.toLowerCase() === root || a.subdomain.toLowerCase().endsWith(`.${root}`));
  }

  return db.assets;
}

export async function upsertAssets(
  newStubs: Partial<CorrelatedAsset>[],
  defaultRootDomain: string = 'target.com',
  projectId?: string
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
        projectId: stub.projectId || existing.projectId || projectId,
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
        projectId: stub.projectId || projectId,
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

export async function clearAssets(rootDomain?: string, projectId?: string): Promise<void> {
  const db = await readDb();
  if (projectId) {
    db.assets = db.assets.filter(a => a.projectId !== projectId);
  } else if (rootDomain) {
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

export async function getReconCache(
  tool: string,
  target: string,
  paramsHash: string = 'default',
  targetId?: string
): Promise<any | null> {
  const db = await readDb();
  const cleanTarget = target.toLowerCase().trim();
  const now = new Date().getTime();

  const entry = db.reconCache.find(c => {
    const matchTool = c.tool === tool && c.paramsHash === paramsHash;
    const matchTarget = c.target.toLowerCase() === cleanTarget;
    const matchTargetId = targetId ? c.targetId === targetId : true;
    return matchTool && matchTarget && matchTargetId;
  });

  if (entry) {
    const expTime = new Date(entry.expiresAt).getTime();
    if (expTime > now) {
      return entry.data;
    }
  }
  return null;
}

export async function setReconCache(
  tool: string,
  target: string,
  data: any,
  ttlSeconds: number = 86400,
  paramsHash: string = 'default',
  targetId?: string
): Promise<void> {
  const db = await readDb();
  const cleanTarget = target.toLowerCase().trim();
  const cachedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const existingIdx = db.reconCache.findIndex(c => {
    return c.tool === tool && c.target.toLowerCase() === cleanTarget && c.paramsHash === paramsHash;
  });

  const cacheEntry: ReconCacheEntry = {
    id: `cache-${tool}-${Date.now()}`,
    tool,
    target: cleanTarget,
    targetId,
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

  if (db.reconCache.length > 500) {
    db.reconCache = db.reconCache.slice(-500);
  }

  await writeDb(db);
}

// ----------------------------------------------------
// 💻 TERMINAL SESSIONS & FOLDERS PERSISTENCE (Strict Isolation)
// ----------------------------------------------------

export async function getTerminalState(targetId: string) {
  const db = await readDb();
  
  // Default folders if target has none
  let folders = db.terminalFolders.filter(f => f.targetId === targetId);
  if (folders.length === 0) {
    folders = [
      { id: `folder-recon-${targetId}`, name: 'Recon & OSINT', targetId, isOpen: true },
      { id: `folder-vulns-${targetId}`, name: 'Auditoria & Takeovers', targetId, isOpen: true },
      { id: `folder-ai-${targetId}`, name: 'AI Red Team Prompts', targetId, isOpen: true },
    ];
  }

  const sessions = db.terminalSessions.filter(s => s.targetId === targetId);
  return { folders, sessions };
}

export async function saveTerminalState(
  targetId: string,
  folders: TerminalFolder[],
  sessions: TerminalSession[]
) {
  const db = await readDb();

  // Replace folders for this specific target
  const otherFolders = db.terminalFolders.filter(f => f.targetId !== targetId);
  const taggedFolders = folders.map(f => ({ ...f, targetId }));
  db.terminalFolders = [...otherFolders, ...taggedFolders];

  // Replace sessions for this specific target
  const otherSessions = db.terminalSessions.filter(s => s.targetId !== targetId);
  const taggedSessions = sessions.map(s => ({ ...s, targetId }));
  db.terminalSessions = [...otherSessions, ...taggedSessions];

  await writeDb(db);
  return { 
    folders: db.terminalFolders.filter(f => f.targetId === targetId), 
    sessions: db.terminalSessions.filter(s => s.targetId === targetId) 
  };
}

// ----------------------------------------------------
// 📜 AUDIT & BUG BOUNTY REPORTS PERSISTENCE (Strict Isolation)
// ----------------------------------------------------

export async function getReports(targetDomain?: string, targetId?: string): Promise<ReportEntry[]> {
  const db = await readDb();
  if (targetId) {
    return db.reports.filter(r => r.targetId === targetId);
  }
  if (targetDomain) {
    return db.reports.filter(r => r.targetDomain?.toLowerCase() === targetDomain.toLowerCase());
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
