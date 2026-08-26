import { NextRequest, NextResponse } from 'next/server';
import { getTerminalState, saveTerminalState, readDb, writeDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get('targetId') || 'default';
    const state = await getTerminalState(targetId);
    return NextResponse.json({ success: true, ...state });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetId, folders, sessions } = body;

    if (!targetId) {
      return NextResponse.json({ success: false, error: 'targetId é obrigatório' }, { status: 400 });
    }

    const state = await saveTerminalState(targetId, folders || [], sessions || []);
    return NextResponse.json({ success: true, ...state });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const folderId = searchParams.get('folderId');

    const db = await readDb();
    if (sessionId) {
      db.terminalSessions = db.terminalSessions.filter(s => s.id !== sessionId);
      await writeDb(db);
      return NextResponse.json({ success: true, message: `Sessão ${sessionId} removida` });
    }

    if (folderId) {
      db.terminalFolders = db.terminalFolders.filter(f => f.id !== folderId);
      db.terminalSessions = db.terminalSessions.filter(s => s.folderId !== folderId);
      await writeDb(db);
      return NextResponse.json({ success: true, message: `Pasta ${folderId} e sessões vinculadas removidas` });
    }

    return NextResponse.json({ success: false, error: 'sessionId ou folderId obrigatório' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
