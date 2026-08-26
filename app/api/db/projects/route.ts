import { NextRequest, NextResponse } from 'next/server';
import { getProjects, saveProject, deleteProject, getProjectById, getProjectByAccessCode } from '@/lib/db';
import { TargetProject, generateAccessCode } from '@/types/recon';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const accessCode = searchParams.get('accessCode');

    if (accessCode) {
      const project = await getProjectByAccessCode(accessCode);
      if (!project) {
        return NextResponse.json({ success: false, error: 'Código de Acesso inválido ou não encontrado' }, { status: 404 });
      }
      return NextResponse.json({ success: true, project });
    }

    if (id) {
      const project = await getProjectById(id);
      if (!project) {
        return NextResponse.json({ success: false, error: 'Projeto não encontrado' }, { status: 404 });
      }
      return NextResponse.json({ success: true, project });
    }

    const projects = await getProjects();
    return NextResponse.json({ success: true, count: projects.length, projects });
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
    if (!project.accessCode) {
      project.accessCode = generateAccessCode();
    } else {
      project.accessCode = project.accessCode.trim().toUpperCase();
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
