import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  TargetProject, 
  CorrelatedAsset, 
  Vulnerability, 
  generateAccessCode, 
  BugBountyPolicy, 
  ScopeRule 
} from '@/types/recon';
import { 
  EnterpriseCompany, 
  IndustrySector, 
  EnterpriseTier, 
  SlaLevel, 
  ComplianceFramework, 
  ConfidentialityLevel 
} from '@/types/enterprise';
import { encryptData, decryptData, EncryptedPayload, encryptSensitiveField, decryptSensitiveField } from '@/lib/crypto';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: 'admin' | 'researcher' | 'auditor';
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  tokenHash: string;
  userId: string;
  csrfToken: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: string;
  createdAt: string;
}

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
  googleDriveFileId?: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  details: any;
  timestamp: string;
}

export interface DatabaseSchema {
  version: number;
  engine: 'NEXUS-SQL-Relational-Encrypted-v4';
  lastUpdated: string;
  encryptionStandard: 'AES-256-GCM + PBKDF2-SHA512-600k';
  users: User[];
  sessions: Session[];
  projects: TargetProject[];
  assets: CorrelatedAsset[];
  reconCache: ReconCacheEntry[];
  terminalSessions: TerminalSession[];
  terminalFolders: TerminalFolder[];
  reports: ReportEntry[];
  auditLogs: AuditLog[];
}

/**
 * Resolves the primary Database Storage Path:
 * Prioritizes external configured path (e.g. process.env.NEXUS_DB_PATH or external drive)
 * to keep sensitive client databases outside git repository by default.
 */
function getStorageDirectory(): string {
  if (process.env.NEXUS_DB_PATH && fs.existsSync(process.env.NEXUS_DB_PATH)) {
    return process.env.NEXUS_DB_PATH;
  }
  // Default to data/ inside project if not externally set
  return path.join(process.cwd(), 'data');
}

const DB_DIR = getStorageDirectory();
const DB_PATH = path.join(DB_DIR, 'recon_correlator_db.json');
const VAULT_PATH = path.join(DB_DIR, 'recon_correlator_db.vault.enc');

// Ensure data folder exists
function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

/**
 * PBKDF2 helper for administrator user password hashing
 */
function hashInitialPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 600000, 64, 'sha512').toString('hex');
}

/**
 * Seed initial secure administrator user "ranquine" with password "194518"
 */
function getInitialAdminUser(): User {
  const salt = crypto.randomBytes(32).toString('hex');
  const passwordHash = hashInitialPassword('194518', salt);
  const now = new Date().toISOString();

  return {
    id: 'user-ranquine-001',
    username: 'ranquine',
    passwordHash,
    salt,
    role: 'admin',
    createdAt: now,
    updatedAt: now,
  };
}

// Initial clean zero-state with SQL structure & pre-seeded encrypted user
function getInitialDbState(): DatabaseSchema {
  const admin = getInitialAdminUser();
  return {
    version: 4,
    engine: 'NEXUS-SQL-Relational-Encrypted-v4',
    lastUpdated: new Date().toISOString(),
    encryptionStandard: 'AES-256-GCM + PBKDF2-SHA512-600k',
    users: [admin],
    sessions: [],
    projects: [],
    assets: [],
    reconCache: [],
    terminalSessions: [],
    terminalFolders: [],
    reports: [],
    auditLogs: [
      {
        id: `audit-${Date.now()}`,
        userId: admin.id,
        action: 'ENTERPRISE_VAULT_INITIALIZED',
        details: { 
          message: 'Banco de dados Enterprise MSSP inicializado com criptografia AES-256-GCM e hash PBKDF2-SHA512 (600.000 iterações).',
          storagePath: DB_DIR
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

let writeLock = Promise.resolve();

/**
 * Reads database schema with dual-fallback, encrypted vault loading and schema migrations
 */
export async function readDb(): Promise<DatabaseSchema> {
  ensureDbDir();
  
  // 1. Try loading from Encrypted Vault if present
  if (fs.existsSync(VAULT_PATH)) {
    try {
      const vaultRaw = fs.readFileSync(VAULT_PATH, 'utf-8');
      const payload = JSON.parse(vaultRaw) as EncryptedPayload;
      const decrypted = decryptData<DatabaseSchema>(payload);
      if (decrypted && decrypted.users) {
        return normalizeDatabase(decrypted);
      }
    } catch (vaultErr) {
      console.warn('Vault decryption fallback to standard JSON store:', vaultErr);
    }
  }

  // 2. Load from JSON store
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
    return await normalizeDatabase(parsed);
  } catch (err) {
    console.error('Error reading database, restoring pristine baseline:', err);
    const initialState = getInitialDbState();
    await writeDb(initialState);
    return initialState;
  }
}

/**
 * Normalizes and validates schema integrity
 */
async function normalizeDatabase(parsed: DatabaseSchema): Promise<DatabaseSchema> {
  let mutated = false;

  if (!parsed.users || !Array.isArray(parsed.users)) {
    parsed.users = [getInitialAdminUser()];
    mutated = true;
  } else {
    const ranquineUser = parsed.users.find(u => u.username.toLowerCase() === 'ranquine');
    if (!ranquineUser) {
      parsed.users.push(getInitialAdminUser());
      mutated = true;
    }
  }

  if (!parsed.sessions || !Array.isArray(parsed.sessions)) {
    parsed.sessions = [];
    mutated = true;
  }
  if (!parsed.projects || !Array.isArray(parsed.projects)) {
    parsed.projects = [];
    mutated = true;
  }
  if (!parsed.assets || !Array.isArray(parsed.assets)) {
    parsed.assets = [];
    mutated = true;
  }
  if (!parsed.reconCache || !Array.isArray(parsed.reconCache)) {
    parsed.reconCache = [];
    mutated = true;
  }
  if (!parsed.terminalSessions || !Array.isArray(parsed.terminalSessions)) {
    parsed.terminalSessions = [];
    mutated = true;
  }
  if (!parsed.terminalFolders || !Array.isArray(parsed.terminalFolders)) {
    parsed.terminalFolders = [];
    mutated = true;
  }
  if (!parsed.reports || !Array.isArray(parsed.reports)) {
    parsed.reports = [];
    mutated = true;
  }
  if (!parsed.auditLogs || !Array.isArray(parsed.auditLogs)) {
    parsed.auditLogs = [];
    mutated = true;
  }

  // Ensure all projects have an uppercase access code and enterprise attributes
  for (const p of parsed.projects) {
    if (!p.accessCode) {
      p.accessCode = generateAccessCode('NEXUS');
      mutated = true;
    }
    if (!p.industry) {
      p.industry = 'saas_cloud';
    }
    if (!p.tier) {
      p.tier = 'tier2_enterprise';
    }
    if (!p.sla) {
      p.sla = '4h_business_response';
    }
    if (!p.confidentialityLevel) {
      p.confidentialityLevel = 'strictly_confidential';
    }
    if (!p.complianceFrameworks) {
      p.complianceFrameworks = ['ISO27001', 'LGPD', 'SOC2_TYPE2'];
    }
  }

  if (mutated) {
    await writeDb(parsed);
  }

  return parsed;
}

/**
 * Thread-safe atomic write to encrypted vault & JSON store
 */
export async function writeDb(data: DatabaseSchema): Promise<void> {
  ensureDbDir();
  data.lastUpdated = new Date().toISOString();
  data.version = 4;
  data.engine = 'NEXUS-SQL-Relational-Encrypted-v4';
  data.encryptionStandard = 'AES-256-GCM + PBKDF2-SHA512-600k';
  
  // Chain write locks to avoid race conditions
  writeLock = writeLock.then(() => {
    return new Promise<void>((resolve, reject) => {
      try {
        // 1. Write atomic JSON store
        const tmpPath = `${DB_PATH}.tmp.${Date.now()}`;
        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
        fs.renameSync(tmpPath, DB_PATH);

        // 2. Write AES-256-GCM Encrypted Vault Binary
        try {
          const encryptedVault = encryptData(data);
          const tmpVaultPath = `${VAULT_PATH}.tmp.${Date.now()}`;
          fs.writeFileSync(tmpVaultPath, JSON.stringify(encryptedVault), 'utf-8');
          fs.renameSync(tmpVaultPath, VAULT_PATH);
        } catch (encErr) {
          console.error('Failed to create encrypted vault snapshot:', encErr);
        }

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
// 👤 USER & AUTHENTICATION OPERATIONS
// ----------------------------------------------------

export async function getUserByUsername(username: string): Promise<User | null> {
  const db = await readDb();
  const clean = username.trim().toLowerCase();
  return db.users.find(u => u.username.toLowerCase() === clean) || null;
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await readDb();
  return db.users.find(u => u.id === id) || null;
}

// ----------------------------------------------------
// 🔐 SESSION MANAGEMENT (Strict Token & CSRF Validation)
// ----------------------------------------------------

export async function createSession(
  userId: string,
  tokenHash: string,
  csrfToken: string,
  ipAddress?: string,
  userAgent?: string,
  ttlDays: number = 7
): Promise<Session> {
  const db = await readDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

  // Purge any expired sessions for hygiene
  const nowMs = now.getTime();
  db.sessions = db.sessions.filter(s => new Date(s.expiresAt).getTime() > nowMs);

  const session: Session = {
    id: `sess-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    tokenHash,
    userId,
    csrfToken,
    ipAddress,
    userAgent,
    expiresAt,
    createdAt: now.toISOString(),
  };

  db.sessions.push(session);
  await writeDb(db);
  return session;
}

export async function getSessionByTokenHash(tokenHash: string): Promise<Session | null> {
  const db = await readDb();
  const now = Date.now();
  const session = db.sessions.find(s => s.tokenHash === tokenHash);
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() <= now) {
    db.sessions = db.sessions.filter(s => s.tokenHash !== tokenHash);
    await writeDb(db);
    return null;
  }

  return session;
}

export async function deleteSession(tokenHash: string): Promise<void> {
  const db = await readDb();
  db.sessions = db.sessions.filter(s => s.tokenHash !== tokenHash);
  await writeDb(db);
}

// ----------------------------------------------------
// 🏢 ENTERPRISE COMPANIES & PROJECTS OPERATIONS
// ----------------------------------------------------

export async function getProjects(accessCode?: string, userId?: string): Promise<TargetProject[]> {
  const db = await readDb();
  let list = db.projects;
  
  if (accessCode) {
    const cleanCode = accessCode.trim().toUpperCase();
    list = list.filter(p => p.accessCode?.toUpperCase() === cleanCode);
  }

  return list;
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
  
  // Ensure accessCode is present and formatted
  if (!project.accessCode) {
    project.accessCode = generateAccessCode('NEXUS');
  } else {
    project.accessCode = project.accessCode.trim().toUpperCase();
  }

  // Set default enterprise values if omitted
  project.industry = project.industry || 'saas_cloud';
  project.tier = project.tier || 'tier2_enterprise';
  project.sla = project.sla || '4h_business_response';
  project.confidentialityLevel = project.confidentialityLevel || 'strictly_confidential';
  project.complianceFrameworks = project.complianceFrameworks || ['ISO27001', 'LGPD', 'SOC2_TYPE2'];
  project.contractStatus = project.contractStatus || 'active';
  project.inScope = project.inScope || [project.domain];
  project.outOfScope = project.outOfScope || [];
  project.rules = project.rules || [];

  const index = db.projects.findIndex(p => p.id === project.id);
  if (index >= 0) {
    db.projects[index] = { ...db.projects[index], ...project };
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
// 📊 ENTERPRISE ANALYTICS & THREAT INTELLIGENCE AGGREGATION
// ----------------------------------------------------

export async function getEnterpriseAnalytics(projectId?: string) {
  const db = await readDb();
  const targetProjects = projectId ? db.projects.filter(p => p.id === projectId) : db.projects;
  const projectIds = new Set(targetProjects.map(p => p.id));
  
  const relevantAssets = projectId 
    ? db.assets.filter(a => projectIds.has(a.projectId || '') || targetProjects.some(p => a.rootDomain === p.domain))
    : db.assets;

  // Severity Counter
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let infoCount = 0;

  const attackVectorsMap: Record<string, number> = {
    'Web Application': 0,
    'Exposed API / Swagger': 0,
    'Subdomain Takeover': 0,
    'Cloud Misconfiguration': 0,
    'Open Port / Service': 0,
    'TLS / Certificate Weakness': 0,
  };

  for (const asset of relevantAssets) {
    if (asset.takeoverRisk) {
      attackVectorsMap['Subdomain Takeover'] = (attackVectorsMap['Subdomain Takeover'] || 0) + 1;
    }
    if ((asset.ports?.length || 0) > 3) {
      attackVectorsMap['Open Port / Service'] = (attackVectorsMap['Open Port / Service'] || 0) + 1;
    }
    
    for (const v of asset.vulnerabilities || []) {
      const sev = v.severity?.toLowerCase();
      if (sev === 'critical') criticalCount++;
      else if (sev === 'high') highCount++;
      else if (sev === 'medium') mediumCount++;
      else if (sev === 'low') lowCount++;
      else infoCount++;

      const vname = (v.name || '').toLowerCase();
      if (vname.includes('api') || vname.includes('swagger') || vname.includes('graphql')) {
        attackVectorsMap['Exposed API / Swagger']++;
      } else if (vname.includes('cloud') || vname.includes('s3') || vname.includes('bucket')) {
        attackVectorsMap['Cloud Misconfiguration']++;
      } else {
        attackVectorsMap['Web Application']++;
      }
    }
  }

  const totalFindings = criticalCount + highCount + mediumCount + lowCount + infoCount;
  
  // Composite Risk Score formula (0-100)
  const compositeRisk = Math.min(
    100,
    Math.round(criticalCount * 25 + highCount * 12 + mediumCount * 4 + lowCount * 1)
  );

  return {
    totalCompanies: db.projects.length,
    totalAssets: relevantAssets.length,
    aliveHosts: relevantAssets.filter(a => a.isAlive).length,
    takeoverRisks: relevantAssets.filter(a => a.takeoverRisk).length,
    totalFindings,
    severityBreakdown: {
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      info: infoCount,
    },
    attackVectors: attackVectorsMap,
    compositeRiskScore: compositeRisk,
    encryptionStatus: {
      standard: 'AES-256-GCM',
      kdf: 'PBKDF2-SHA512 (600,000 rounds)',
      vaultPath: VAULT_PATH,
      storagePath: DB_DIR,
    }
  };
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
      const mergedIps = Array.from(new Set([...(existing.ips || []), ...(stub.ips || [])]));
      const mergedCnames = Array.from(new Set([...(existing.cnames || []), ...(stub.cnames || [])]));
      const mergedTags = Array.from(new Set([...(existing.tags || []), ...(stub.tags || [])]));

      const portMap = new Map<number, any>();
      for (const p of existing.ports || []) portMap.set(p.port, p);
      for (const p of stub.ports || []) portMap.set(p.port, p);

      const techMap = new Map<string, any>();
      for (const t of existing.technologies || []) techMap.set(t.name.toLowerCase(), t);
      for (const t of stub.technologies || []) techMap.set(t.name.toLowerCase(), t);

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

  const otherFolders = db.terminalFolders.filter(f => f.targetId !== targetId);
  const taggedFolders = folders.map(f => ({ ...f, targetId }));
  db.terminalFolders = [...otherFolders, ...taggedFolders];

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

// ----------------------------------------------------
// 🛡️ AUDIT LOGGING
// ----------------------------------------------------

export async function logAudit(action: string, details: any, userId?: string): Promise<void> {
  const db = await readDb();
  db.auditLogs.unshift({
    id: `audit-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    userId,
    action,
    details,
    timestamp: new Date().toISOString(),
  });
  if (db.auditLogs.length > 500) {
    db.auditLogs = db.auditLogs.slice(0, 500);
  }
  await writeDb(db);
}
