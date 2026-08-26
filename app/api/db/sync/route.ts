import { NextRequest, NextResponse } from 'next/server';
import { readDb, getProjects, getAssets, getTerminalState, getReports } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get('targetId');
    const rootDomain = searchParams.get('rootDomain');

    const db = await readDb();
    const projects = db.projects;
    
    // Determine active target domain
    const activeProject = targetId 
      ? projects.find(p => p.id === targetId) || projects[0]
      : projects[0];

    const activeDomain = rootDomain || activeProject?.domain;

    const assets = activeDomain 
      ? db.assets.filter(a => a.rootDomain.toLowerCase() === activeDomain.toLowerCase() || a.subdomain.toLowerCase().endsWith(`.${activeDomain.toLowerCase()}`))
      : db.assets;

    const terminal = activeProject 
      ? await getTerminalState(activeProject.id)
      : { folders: db.terminalFolders, sessions: db.terminalSessions };

    const reports = await getReports(activeDomain);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      projects,
      activeProject,
      assets,
      terminal,
      reports,
      totalAssetsCount: db.assets.length,
      cachedCommandsCount: db.reconCache.length,
    });
  } catch (err: any) {
    console.error('API /api/db/sync error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erro ao sincronizar base de dados' },
      { status: 500 }
    );
  }
}
