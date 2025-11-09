import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'reviews.json');

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No reviews scraped yet'
      });
    }

    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error: any) {
    console.error('Error reading reviews:', error);
    return NextResponse.json(
      {
        error: 'Failed to read reviews',
        details: error.message
      },
      { status: 500 }
    );
  }
}
