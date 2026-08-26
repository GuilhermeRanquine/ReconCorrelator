import { NextRequest, NextResponse } from 'next/server';
import { readDb, getProjects, getAssets, getTerminalState, getReports, getProjectByAccessCode, ReportEntry, TerminalFolder, TerminalSession } from '@/lib/db';
import { CorrelatedAsset } from '@/types/recon';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get('targetId');
    const rootDomain = searchParams.get('rootDomain');
    const accessCode = searchParams.get('accessCode');

    const db = await readDb();
    const projects = db.projects;
    
    // Determine active target project
    let activeProject = null;
    if (accessCode) {
      activeProject = await getProjectByAccessCode(accessCode);
    } else if (targetId) {
      activeProject = projects.find(p => p.id === targetId) || null;
    }

    // Strictly isolated assets
    let assets: CorrelatedAsset[] = [];
    let terminal: { folders: TerminalFolder[]; sessions: TerminalSession[] } = { folders: [], sessions: [] };
    let reports: ReportEntry[] = [];

    if (activeProject) {
      assets = await getAssets({ projectId: activeProject.id, rootDomain: activeProject.domain });
      terminal = await getTerminalState(activeProject.id);
      reports = await getReports(activeProject.domain, activeProject.id);
    } else if (rootDomain) {
      assets = await getAssets({ rootDomain });
      reports = await getReports(rootDomain);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      projectsCount: projects.length,
      // Only return projects list metadata (or filtered if authenticated)
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        domain: p.domain,
        description: p.description,
        accessCode: p.accessCode,
        platform: p.platform,
        createdAt: p.createdAt,
        inScope: p.inScope,
        outOfScope: p.outOfScope,
        rules: p.rules,
        policy: p.policy,
      })),
      activeProject,
      assets,
      terminal,
      reports,
      totalAssetsCount: assets.length,
    });
  } catch (err: any) {
    console.error('API /api/db/sync error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erro ao sincronizar base de dados' },
      { status: 500 }
    );
  }
}
