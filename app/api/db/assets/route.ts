import { NextRequest, NextResponse } from 'next/server';
import { getAssets, upsertAssets, addVulnerabilityToAsset, clearAssetsForDomain } from '@/lib/db';
import { CorrelatedAsset, Vulnerability } from '@/types/recon';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || searchParams.get('domain') || undefined;
    const assets = getAssets(projectId);

    return NextResponse.json({
      success: true,
      count: assets.length,
      assets,
      aliveCount: assets.filter(a => a.isAlive).length,
      vulnsCount: assets.reduce((acc, a) => acc + (a.vulnerabilities?.length || 0), 0),
      takeoverCount: assets.filter(a => a.takeoverRisk).length,
    });
  } catch (err: any) {
    console.error('Error fetching assets from DB:', err);
    return NextResponse.json({ success: false, error: err.message, assets: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Check if adding single vulnerability
    if (body.action === 'add_vulnerability' && body.vulnerability) {
      const updated = addVulnerabilityToAsset(body.vulnerability as Vulnerability);
      return NextResponse.json({ success: true, count: updated.length, assets: updated });
    }

    // Check if clear assets for domain
    if (body.action === 'clear' && body.domain) {
      clearAssetsForDomain(body.domain);
      return NextResponse.json({ success: true, message: `Ativos do domínio ${body.domain} limpos com sucesso.` });
    }

    // Bulk upsert assets
    const newStubs: Partial<CorrelatedAsset>[] = Array.isArray(body) 
      ? body 
      : Array.isArray(body.assets) 
        ? body.assets 
        : body.asset 
          ? [body.asset] 
          : [];

    if (newStubs.length === 0) {
      return NextResponse.json({ success: false, error: 'Nenhum ativo informado para persistência.' }, { status: 400 });
    }

    const rootDomain = body.rootDomain || undefined;
    const updated = upsertAssets(newStubs, rootDomain);

    return NextResponse.json({
      success: true,
      message: `${newStubs.length} ativos processados e salvos no banco de dados central.`,
      count: updated.length,
      assets: updated,
    });
  } catch (err: any) {
    console.error('Error upserting assets to DB:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
