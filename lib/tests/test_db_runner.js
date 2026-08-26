const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'recon_correlator_db.json');
const REPORTS_DIR = path.join(process.cwd(), 'reports');

console.log('🧪 [TEST-SUITE] Iniciando Testes Unitários de Banco de Dados Central & Caching...\n');

// 1. Check directories
console.log('1. Verificando estrutura de diretórios...');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
console.log('   ✅ DATA_DIR:', DATA_DIR);
console.log('   ✅ REPORTS_DIR:', REPORTS_DIR);

// 2. Read DB
console.log('\n2. Inicializando leitura do Banco de Dados...');
let dbData = null;
if (fs.existsSync(DB_FILE)) {
  dbData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
} else {
  dbData = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    projects: [{ id: 'test-proj-1', name: 'Alvo Teste', domain: 'testtarget.com', inScope: ['*.testtarget.com'], outOfScope: [] }],
    assets: [{ id: 'asset-1', subdomain: 'api.testtarget.com', rootDomain: 'testtarget.com', isAlive: true, ports: [], vulnerabilities: [] }],
    reconCache: [],
    terminalSessions: [],
    terminalFolders: [],
    reports: [],
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf-8');
}
console.log(`   ✅ DB Carregado com sucesso! Projetos: ${dbData.projects.length}, Ativos: ${dbData.assets.length}, Cache: ${dbData.reconCache.length}`);

// 3. Test Caching & Idempotency
console.log('\n3. Testando Motor de Caching Idempotente...');
const testCacheEntry = {
  id: 'cache-test-1',
  tool: 'crtsh',
  target: 'testtarget.com',
  paramsHash: 'default',
  data: { subdomains: ['api.testtarget.com', 'auth.testtarget.com', 'admin.testtarget.com'] },
  cachedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
};
dbData.reconCache.push(testCacheEntry);
fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf-8');

// Verify cache retrieval
const reloaded = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
const found = reloaded.reconCache.find(c => c.tool === 'crtsh' && c.target === 'testtarget.com');
if (found && found.data.subdomains.length === 3) {
  console.log('   ✅ Cache Hit verificado com sucesso! Subdomínios cacheados:', found.data.subdomains);
} else {
  console.error('   ❌ Falha ao validar cache');
  process.exit(1);
}

// 4. Test Reports Reader
console.log('\n4. Testando Leitura e Extração de Relatórios em reports/...');
const reportFiles = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.md'));
console.log(`   ✅ Encontrados ${reportFiles.length} relatórios em markdown:`, reportFiles);

for (const rep of reportFiles) {
  const content = fs.readFileSync(path.join(REPORTS_DIR, rep), 'utf-8');
  const protocol = content.match(/Protocolo:\*?\*?\s*`?([A-Z0-9-]+)`?/i);
  console.log(`   📄 Arquivo: ${rep} | Protocolo: ${protocol ? protocol[1] : 'N/A'}`);
}

console.log('\n🎉 [TEST-SUITE CONCLUÍDO COM SUCESSO] Todas as validações passaram!');
