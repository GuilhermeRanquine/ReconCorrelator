import { NextResponse } from 'next/server';
import { DeltaTestRunner } from '@/lib/tests/deltaTestSuite';

export async function GET() {
  try {
    const suites = DeltaTestRunner.runAllSuites();
    return NextResponse.json({ success: true, suites });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao executar suites de teste.' },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
