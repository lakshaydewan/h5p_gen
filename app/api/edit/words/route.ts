import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { UTApi } from 'uploadthing/server';
import { promisify } from 'util';
import { NextRequest } from 'next/server';
import os from 'os';
import mime from 'mime-types';

const utapi = new UTApi({
  token: process.env.UPLOADTHING_TOKEN!,
});

const renameAsync = promisify(fs.rename);
const unlinkAsync = promisify(fs.unlink);

interface Word {
  fixWord: false;
  orientation: 'across' | 'down';
  clue: string;
  answer: string;
}

async function modifyAndZipContent(title: string, description: string, wordsData: Word[]) {
  const contentPath = path.join(process.cwd(), 'content', 'words');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'h5p-'));

  const zipPath = path.join(tempDir, 'modified-content.zip');
  const h5pPath = path.join(tempDir, 'modified-content.h5p');
  const contentJsonPath = path.join(contentPath, 'content', 'content.json');
  const h5pJsonPath = path.join(contentPath, 'h5p.json');

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

  // Create ZIP archive
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);

    fs.readdirSync(contentPath).forEach((file) => {
      const filePath = path.join(contentPath, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        archive.directory(filePath, file);
      } else {
        archive.file(filePath, { name: file });
      }
    });

    archive.finalize();
  });

  // Rename .zip to .h5p
  await renameAsync(zipPath, h5pPath);

  // Read the file buffer
  const fileBuffer = await fs.promises.readFile(h5pPath);

  // Convert Buffer to Uint8Array for Blob compatibility
  const uint8Array = new Uint8Array(fileBuffer);

  // Create a Blob from Uint8Array
  const blob = new Blob([uint8Array], { type: mime.lookup('.h5p') || 'application/h5p' });

  // Create a File object
  const file = new File([blob], 'modified-content.h5p', { type: 'application/h5p' });

  // Upload to UploadThing
  const response = await utapi.uploadFiles([file]);

  // Cleanup
  await unlinkAsync(h5pPath);

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
