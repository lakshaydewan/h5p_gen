import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';
import { UTApi } from 'uploadthing/server';
import { NextRequest } from 'next/server';
import os from 'os';
import mime from 'mime-types';

const utapi = new UTApi({
  token: process.env.UPLOADTHING_TOKEN!,
});

interface Word {
  fixWord: false;
  orientation: 'across' | 'down';
  clue: string;
  answer: string;
}

async function modifyAndZipContent(title: string, description: string, wordsData: Word[]) {
  const contentPath = path.join(process.cwd(), 'content', 'words', 'content');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'h5p-'));

  // Copy the content to a temporary directory
  const tempContentPath = path.join(tempDir, 'content');
  fs.copySync(contentPath, tempContentPath);

  const contentJsonPath = path.join(tempContentPath, 'content.json');
  const h5pJsonPath = path.join(process.cwd(), 'content', 'words', 'h5p.json');


  if (!fs.existsSync(contentJsonPath)) {
    throw new Error('content.json not found');
  }

  const contentData = JSON.parse(fs.readFileSync(contentJsonPath, 'utf-8'));
  const h5pJsonData = JSON.parse(fs.readFileSync(h5pJsonPath, 'utf-8'));

  // Modify content
  h5pJsonData.title = title;
  contentData.taskDescription = `<p>${description}</p>`;
  contentData.words = wordsData;

  // Write the modified JSON back
  fs.writeFileSync(contentJsonPath, JSON.stringify(contentData, null, 2));
  fs.writeFileSync(h5pJsonPath, JSON.stringify(h5pJsonData, null, 2));

  const h5pPath = path.join(tempDir, 'modified-content.h5p');

  // Create ZIP archive
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(h5pPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);

    // Add the content folder and h5p.json to the root of the ZIP
    archive.directory(tempContentPath, 'content');
    archive.file(h5pJsonPath, { name: 'h5p.json' });

    archive.finalize();
  });

  // Read the file buffer
  const fileBuffer = await fs.promises.readFile(h5pPath);

  // Create a Blob from the buffer
  const blob = new Blob([fileBuffer], { type: mime.lookup('.h5p') || 'application/h5p' });

  // Create a File object
  const file = new File([blob], 'modified-content.h5p', { type: 'application/h5p' });

  // Upload to UploadThing
  const response = await utapi.uploadFiles([file]);

  // Cleanup
  fs.removeSync(tempDir);

  return response;
}

export async function POST(req: NextRequest) {
  const { title, description, wordsData } = await req.json();

  if (!title || !description || !Array.isArray(wordsData) || wordsData.length === 0) {
    return new Response(JSON.stringify({ error: 'Missing title, description, or words data' }), { status: 400 });
  }

  try {
    const uploadedFile = await modifyAndZipContent(title, description, wordsData);
    return new Response(JSON.stringify({ success: true, uploadedFile: uploadedFile }), { status: 200 });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: 'Upload failed' }), { status: 500 });
  }
}
