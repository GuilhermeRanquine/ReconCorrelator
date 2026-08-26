import { NextRequest, NextResponse } from 'next/server';
import { getAssets, upsertAssets, clearAssets, readDb, writeDb } from '@/lib/db';
import { CorrelatedAsset } from '@/types/recon';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rootDomain = searchParams.get('rootDomain');
    const projectId = searchParams.get('projectId');

    const assets = await getAssets({ rootDomain: rootDomain || undefined, projectId: projectId || undefined });
    return NextResponse.json({ success: true, count: assets.length, assets });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assets: incomingAssets, asset: singleAsset, rootDomain } = body;

    let listToUpsert: Partial<CorrelatedAsset>[] = [];

    if (Array.isArray(incomingAssets)) {
      listToUpsert = incomingAssets;
    } else if (singleAsset) {
      listToUpsert = [singleAsset];
    } else if (Array.isArray(body)) {
      listToUpsert = body;
    } else {
      return NextResponse.json({ success: false, error: 'Payload de ativos inválido' }, { status: 400 });
    }

    const defaultRoot = rootDomain || (listToUpsert[0]?.rootDomain) || 'target.com';
    const updatedAssets = await upsertAssets(listToUpsert, defaultRoot);

    // Return the assets for this rootDomain
    const filtered = updatedAssets.filter(
      a => a.rootDomain.toLowerCase() === defaultRoot.toLowerCase() || a.subdomain.toLowerCase().endsWith(`.${defaultRoot.toLowerCase()}`)
    );

    return NextResponse.json({
      success: true,
      count: filtered.length,
      assets: filtered,
      totalDatabaseAssets: updatedAssets.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const rootDomain = searchParams.get('rootDomain');
    const clearAll = searchParams.get('all') === 'true';

    if (id) {
      const db = await readDb();
      db.assets = db.assets.filter(a => a.id !== id);
      await writeDb(db);
      return NextResponse.json({ success: true, message: `Ativo ${id} removido` });
    }

    if (rootDomain) {
      await clearAssets(rootDomain);
      return NextResponse.json({ success: true, message: `Ativos do domínio ${rootDomain} limpos` });
    }

    if (clearAll) {
      await clearAssets();
      return NextResponse.json({ success: true, message: 'Todos os ativos foram limpos do banco de dados' });
    }

    return NextResponse.json({ success: false, error: 'Parâmetro id, rootDomain ou all=true é obrigatório' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
