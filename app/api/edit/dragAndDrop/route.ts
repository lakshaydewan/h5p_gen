import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';
import { UTApi } from 'uploadthing/server';
import os from 'os';
import { NextRequest } from 'next/server';

const utapi = new UTApi({
  token: process.env.UPLOADTHING_TOKEN || '',
});

if (!process.env.UPLOADTHING_TOKEN) {
  throw new Error('UPLOADTHING_TOKEN is missing');
}

async function modifyAndZipContent(title: string, description: string, wordsData: string) {
  const contentPath = path.resolve('content', 'drag-the-words', 'content');
  const h5pJsonPath = path.resolve('content', 'drag-the-words', 'h5p.json');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'h5p-'));

  try {
    const tempContentPath = path.join(tempDir, 'content');
    fs.copySync(contentPath, tempContentPath);

    const contentJsonPath = path.join(tempContentPath, 'content.json');
    if (!fs.existsSync(contentJsonPath)) {
      throw new Error('content.json not found');
    }

    const contentData = JSON.parse(fs.readFileSync(contentJsonPath, 'utf-8'));
    const h5pJsonData = JSON.parse(fs.readFileSync(h5pJsonPath, 'utf-8'));

    h5pJsonData.title = title;
    contentData.taskDescription = `<p>${description}</p>`;
    contentData.textField = wordsData;

    fs.writeFileSync(contentJsonPath, JSON.stringify(contentData, null, 2));
    fs.writeFileSync(h5pJsonPath, JSON.stringify(h5pJsonData, null, 2));

    const h5pPath = path.join(tempDir, 'modified-content.h5p');
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(h5pPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);

      archive.directory(tempContentPath, 'content');
      archive.file(h5pJsonPath, { name: 'h5p.json' });
      archive.finalize();
    });

    const fileBuffer = fs.readFileSync(h5pPath);
    const file = new File([fileBuffer], 'modified-content.h5p', { type: 'application/h5p' });

    const response = await utapi.uploadFiles([file]);
    return response;
  } catch (error) {
    console.error('Error during modification and upload:', error);
    throw error;
  } finally {
    fs.removeSync(tempDir);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, description, textField } = await req.json();

    if (!title || !description || !textField) {
      return new Response(JSON.stringify({ error: 'Missing title or description' }), { status: 400 });
    }

    const uploadedFile = await modifyAndZipContent(title, description, textField);
    return new Response(JSON.stringify({ success: true, uploadedFile }), { status: 200 });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: 'Upload failed' }), { status: 500 });
  }
}
