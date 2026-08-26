import { NextRequest, NextResponse } from 'next/server';
import { getProjects, upsertProject, deleteProject } from '@/lib/db';
import { TargetProject } from '@/types/recon';

export async function GET(req: NextRequest) {
  try {
    const projects = getProjects();
    return NextResponse.json({ success: true, count: projects.length, projects });
  } catch (err: any) {
    console.error('Error fetching projects from DB:', err);
    return NextResponse.json({ success: false, error: err.message, projects: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.name || !body.domain) {
      return NextResponse.json({ success: false, error: 'Campos "name" e "domain" são obrigatórios.' }, { status: 400 });
    }

    const saved = upsertProject(body as TargetProject);
    return NextResponse.json({ success: true, project: saved });
  } catch (err: any) {
    console.error('Error saving project to DB:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('id');
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Parâmetro "id" é obrigatório.' }, { status: 400 });
    }

    const success = deleteProject(projectId);
    return NextResponse.json({ success, message: success ? 'Projeto excluído com sucesso' : 'Projeto não encontrado' });
  } catch (err: any) {
    console.error('Error deleting project from DB:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
