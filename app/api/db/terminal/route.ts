import { NextRequest, NextResponse } from 'next/server';
import { getTerminalData, saveTerminalData } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || 'default-target';
    const data = getTerminalData(projectId);

    return NextResponse.json({
      success: true,
      projectId,
      sessions: data.sessions,
      folders: data.folders,
    });
  } catch (err: any) {
    console.error('Error fetching terminal data from DB:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, sessions, folders } = body;

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId é obrigatório' }, { status: 400 });
    }

    saveTerminalData(projectId, sessions || [], folders || []);

    return NextResponse.json({
      success: true,
      message: 'Sessões e pastas do terminal salvas com sucesso no banco de dados central.',
    });
  } catch (err: any) {
    console.error('Error saving terminal data to DB:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
