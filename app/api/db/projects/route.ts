import { NextRequest, NextResponse } from 'next/server';
import { getProjects, saveProject, deleteProject, getProjectById } from '@/lib/db';
import { TargetProject } from '@/types/recon';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const project = await getProjectById(id);
      if (!project) {
        return NextResponse.json({ success: false, error: 'Projeto não encontrado' }, { status: 404 });
      }
      return NextResponse.json({ success: true, project });
    }

    const projects = await getProjects();
    return NextResponse.json({ success: true, projects });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const project = (await req.json()) as TargetProject;
    if (!project || !project.name || !project.domain) {
      return NextResponse.json({ success: false, error: 'Campos name e domain são obrigatórios' }, { status: 400 });
    }

    if (!project.id) {
      project.id = `proj-${Date.now()}`;
    }
    if (!project.createdAt) {
      project.createdAt = new Date().toISOString();
    }

    const updatedProjects = await saveProject(project);
    return NextResponse.json({ success: true, project, projects: updatedProjects });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID é obrigatório' }, { status: 400 });
    }

    const result = await deleteProject(id);
    return NextResponse.json({ success: true, remaining: result.remaining });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
