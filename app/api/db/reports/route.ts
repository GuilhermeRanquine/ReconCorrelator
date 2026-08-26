import { NextRequest, NextResponse } from 'next/server';
import { getAllReports, saveReportToDisk } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const reports = getAllReports();
    return NextResponse.json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (err: any) {
    console.error('Error fetching reports:', err);
    return NextResponse.json({ success: false, error: err.message, reports: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { protocol, title, content, classification, status } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Campos "title" e "content" são obrigatórios.' },
        { status: 400 }
      );
    }

    const generatedProtocol = protocol || `REL-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 8)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-001`;

    const saved = saveReportToDisk({
      protocol: generatedProtocol,
      title,
      content,
      classification,
      status,
    });

    return NextResponse.json({
      success: true,
      message: `Relatório ${saved.protocol} registrado com sucesso em disco e no banco de dados.`,
      report: saved,
    });
  } catch (err: any) {
    console.error('Error saving report:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
