import { NextRequest, NextResponse } from 'next/server';
import { getReconCache, setReconCache, readDb, writeDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tool = searchParams.get('tool');
    const target = searchParams.get('target');
    const paramsHash = searchParams.get('paramsHash') || 'default';

    if (!tool || !target) {
      const db = await readDb();
      return NextResponse.json({
        success: true,
        count: db.reconCache.length,
        cacheEntries: db.reconCache.map(c => ({
          tool: c.tool,
          target: c.target,
          cachedAt: c.cachedAt,
          expiresAt: c.expiresAt,
        })),
      });
    }

    const cachedData = await getReconCache(tool, target, paramsHash);
    if (cachedData) {
      return NextResponse.json({
        success: true,
        fromCache: true,
        tool,
        target,
        data: cachedData,
      });
    }

    return NextResponse.json({
      success: true,
      fromCache: false,
      message: 'Item não encontrado ou expirado no cache',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tool, target, data, ttlSeconds, paramsHash } = body;

    if (!tool || !target || data === undefined) {
      return NextResponse.json({ success: false, error: 'tool, target e data são obrigatórios' }, { status: 400 });
    }

    await setReconCache(tool, target, data, ttlSeconds || 86400, paramsHash || 'default');
    return NextResponse.json({ success: true, message: 'Dados salvos no cache do banco de dados' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const target = searchParams.get('target');
    const tool = searchParams.get('tool');
    const clearAll = searchParams.get('all') === 'true';

    const db = await readDb();
    if (clearAll) {
      db.reconCache = [];
      await writeDb(db);
      return NextResponse.json({ success: true, message: 'Todo o cache de recon foi limpo' });
    }

    if (target || tool) {
      db.reconCache = db.reconCache.filter(c => {
        if (target && c.target.toLowerCase() === target.toLowerCase()) return false;
        if (tool && c.tool.toLowerCase() === tool.toLowerCase()) return false;
        return true;
      });
      await writeDb(db);
      return NextResponse.json({ success: true, message: 'Itens do cache removidos com sucesso' });
    }

    return NextResponse.json({ success: false, error: 'Especifique target, tool ou all=true' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
