export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type BugBountyPlatform = 
  | 'hackerone'
  | 'bugcrowd'
  | 'intigriti'
  | 'yeswehack'
  | 'federacy'
  | 'private_vdp'
  | 'responsible_disclosure'
  | 'custom';

export interface ScopeRule {
  id: string;
  type: 'wildcard' | 'domain' | 'cidr' | 'ip' | 'regex' | 'mobile_app' | 'api' | 'source_code';
  pattern: string;
  description?: string;
  isOutOfScope: boolean;
  rewardEligible?: boolean;
}

export interface BountyTier {
  severity: Severity;
  minUsd: number;
  maxUsd: number;
}

export interface BugBountyPolicy {
  platform: BugBountyPlatform;
  programUrl?: string;
  policySummary: string;
  safeHarbor: boolean;
  safeHarborTerms?: string;
  bountyTiers?: BountyTier[];
  requiredHeaders?: { key: string; value: string; description?: string }[];
  permittedAttacks?: string[];
  prohibitedVulns: string[];
  allowedTargetTypes?: string[];
  reconStrategy?: string[];
  maxRateLimitReqSec?: number;
  targetArchitecture?: 'spa_web' | 'microservices_api' | 'cloud_native' | 'hybrid' | 'mobile_backend';
  extractedAt: string;
}

export interface TargetProject {
  id: string;
  name: string;
  domain: string;
  accessCode: string; // Unique access code for strict isolation (e.g. BB-7F8A-9C2D)
  description: string;
  createdAt: string;
  platform?: BugBountyPlatform;
  programUrl?: string;
  inScope: string[];
  outOfScope: string[];
  rules: ScopeRule[];
  policy?: BugBountyPolicy;
  isDemo?: boolean;
}

export function generateAccessCode(prefix: string = 'BB'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let p1 = '';
  let p2 = '';
  for (let i = 0; i < 4; i++) {
    p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    p2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${p1}-${p2}`;
}

export interface Vulnerability {
  id: string;
  templateId: string;
  name: string;
  severity: Severity;
  description?: string;
  matchedAt: string;
  extractedResults?: string[];
  curlCommand?: string;
  cve?: string[];
  cwe?: string[];
  cvssScore?: number;
  remediation?: string;
  sourceTool: 'nuclei' | 'nmap-script' | 'manual' | 'gemini-ai' | 'live-probe';
  timestamp: string;
}

export interface ServicePort {
  port: number;
  protocol: 'tcp' | 'udp';
  state: 'open' | 'filtered' | 'closed';
  service?: string;
  product?: string;
  version?: string;
  banner?: string;
}

export interface WebTech {
  name: string;
  category?: string;
  version?: string;
  confidence?: number;
}

export interface DnsRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'NS' | 'SOA' | 'PTR';
  value: string;
  ttl?: number;
}

export interface CorrelatedAsset {
  id: string;
  projectId?: string;
  accessCode?: string;
  subdomain: string;
  rootDomain: string;
  isAlive: boolean;
  httpStatus?: number;
  httpTitle?: string;
  webServer?: string;
  contentLength?: number;
  responseUrl?: string;
  contentType?: string;
  cnames: string[];
  ips: string[];
  dnsRecords?: DnsRecord[];
  ports: ServicePort[];
  technologies: WebTech[];
  vulnerabilities: Vulnerability[];
  cloudProvider?: 'aws' | 'gcp' | 'azure' | 'cloudflare' | 'digitalocean' | 'unknown';
  takeoverRisk: boolean;
  takeoverDetails?: string;
  takeoverFingerprint?: string;
  firstSeen: string;
  lastUpdated: string;
  inScope: boolean;
  tags: string[];
  screenshotUrl?: string;
  notes?: string;
  headers?: Record<string, string>;
  discoveredVia?: 'crtsh' | 'subfinder' | 'amass' | 'dnsx' | 'wayback' | 'manual' | 'sample';
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'root' | 'subdomain' | 'ip' | 'port' | 'tech' | 'vulnerability';
  group?: string;
  severity?: Severity;
  alive?: boolean;
  details?: Record<string, any>;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: 'resolves_to' | 'hosts' | 'runs' | 'vulnerable_to' | 'has_tech';
}

export interface AttackGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ToolLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success' | 'vuln';
  tool: string;
  message: string;
  raw?: any;
}

export interface ReconJob {
  id: string;
  targetId: string;
  name: string;
  tools: ('subfinder' | 'amass' | 'dnsx' | 'httpx' | 'naabu' | 'nmap' | 'nuclei' | 'crtsh' | 'wayback')[];
  status: 'idle' | 'running' | 'completed' | 'failed' | 'stopped';
  currentTool?: string;
  progress: number; // 0 to 100
  startedAt?: string;
  finishedAt?: string;
  logs: ToolLogEntry[];
  discoveredSubdomainsCount: number;
  aliveCount: number;
  vulnsCount: number;
}

export interface ReconFlowStep {
  id: string;
  phaseNumber: number;
  phaseName: string;
  stepTitle: string;
  description: string;
  targetCategory: 'passive_dns' | 'active_dns' | 'port_scan' | 'web_probe' | 'js_analysis' | 'fuzzing' | 'vuln_scan' | 'reporting';
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked';
  recommendedTools: string[];
  commandSnippets: {
    toolName: string;
    cliCommand: string;
    explanation: string;
    wordlistSuggestion?: string;
  }[];
  expertProTips: string[];
  findingsCount?: number;
  dependsOn?: string[];
  isAutomationSupported?: boolean;
  automationAction?: 'run_crtsh' | 'run_dns_lookup' | 'run_wayback' | 'run_http_probe' | 'run_nuclei_triage';
}

export interface ReconPlaybook {
  id: string;
  targetDomain: string;
  targetArchitecture: string;
  overallProgress: number; // 0 to 100
  steps: ReconFlowStep[];
  lastUpdated: string;
}

export interface TestCaseResult {
  id: string;
  suite: string;
  name: string;
  status: 'passed' | 'failed' | 'running' | 'pending';
  durationMs: number;
  assertionsCount: number;
  evidence: string;
  error?: string;
  author: 'ALPHA' | 'BETA' | 'GAMMA' | 'DELTA';
}

export interface TddSuite {
  name: string;
  description: string;
  file: string;
  tests: TestCaseResult[];
}

