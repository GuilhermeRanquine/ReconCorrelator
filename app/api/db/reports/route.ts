import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getReports, saveReport, ReportEntry } from '@/lib/db';

const REPORTS_DIR = path.join(process.cwd(), 'reports');

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');
    const targetDomain = searchParams.get('targetDomain');

    // If a specific filename is requested, read from filesystem or DB
    if (filename) {
      const safeFilename = path.basename(filename);
      const filePath = path.join(REPORTS_DIR, safeFilename);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return NextResponse.json({
          success: true,
          report: {
            filename: safeFilename,
            content,
            path: filePath,
          },
        });
      }

      // Check in DB
      const dbReports = await getReports();
      const match = dbReports.find(r => r.filename === safeFilename || r.id === filename);
      if (match) {
        return NextResponse.json({ success: true, report: match });
      }

      return NextResponse.json({ success: false, error: 'Relatório não encontrado' }, { status: 404 });
    }

    // List all filesystem reports
    const fileReports: { filename: string; title: string; createdAt: string; protocol: string }[] = [];
    if (fs.existsSync(REPORTS_DIR)) {
      const files = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.md'));
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(REPORTS_DIR, file), 'utf-8');
          const lines = content.split('\n');
          const titleLine = lines.find(l => l.startsWith('# '))?.replace('# ', '').trim() || file;
          const protoLine = lines.find(l => l.includes('Protocolo:'))?.split('`')[1] || file.replace('.md', '');
          const stat = fs.statSync(path.join(REPORTS_DIR, file));
          fileReports.push({
            filename: file,
            title: titleLine,
            protocol: protoLine,
            createdAt: stat.mtime.toISOString(),
          });
        } catch (e) {
          console.warn('Error reading report file:', file, e);
        }
      }
    }

    const dbReports = await getReports(targetDomain || undefined);

    return NextResponse.json({
      success: true,
      filesystemReports: fileReports,
      databaseReports: dbReports,
      totalCount: fileReports.length + dbReports.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { protocol, title, content, targetDomain, author, saveToFile = true } = body;

    if (!title || !content) {
      return NextResponse.json({ success: false, error: 'Título e conteúdo são obrigatórios' }, { status: 400 });
    }

    const proto = protocol || `REL-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-AUTO-${Math.floor(100 + Math.random() * 900)}`;
    const filename = `${proto}.md`;

    // Save to filesystem if requested
    if (saveToFile) {
      if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
      }
      fs.writeFileSync(path.join(REPORTS_DIR, filename), content, 'utf-8');
    }

    // Save to DB
    const saved = await saveReport({
      protocol: proto,
      title,
      filename,
      content,
      targetDomain,
      author: author || 'NexusPrime Autonomous Board',
    });

    return NextResponse.json({ success: true, report: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
