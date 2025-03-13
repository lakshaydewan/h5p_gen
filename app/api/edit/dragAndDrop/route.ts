import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { UTApi } from 'uploadthing/server';
import { promisify } from 'util';
import { NextRequest } from 'next/server';

const utapi = new UTApi({
  token: process.env.UPLOADTHING_TOKEN!,
});

const renameAsync = promisify(fs.rename);
const unlinkAsync = promisify(fs.unlink);

async function modifyAndZipContent(title: string, description: string, wordsData: string) {
  const contentPath = path.join(process.cwd(), 'content', 'drag-the-words');
  const tempDir = process.env.NODE_ENV === 'production' ? '/tmp' : path.join(process.cwd(), 'temp');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const zipPath = path.join(tempDir, 'modified-content.zip');
  const h5pPath = path.join(tempDir, 'modified-content.h5p');
  const contentJsonPath = path.join(contentPath, 'content' , 'content.json');
  const h5pJsonPath = path.join(contentPath, 'h5p.json');

  if (!fs.existsSync(contentJsonPath)) {
    throw new Error('content.json not found');
  }

  const contentData = JSON.parse(fs.readFileSync(contentJsonPath, 'utf-8'));
  const h5pJsonData = JSON.parse(fs.readFileSync(h5pJsonPath, 'utf-8'));
  h5pJsonData.title = title;
  contentData.taskDescription = `<p>${description}<\/p>\n`;
  contentData.textField = wordsData;

  fs.writeFileSync(contentJsonPath, JSON.stringify(contentData, null, 2));
  fs.writeFileSync(contentJsonPath, JSON.stringify(contentData, null, 2));

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(undefined));
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

  await renameAsync(zipPath, h5pPath);

  const fileBuffer = await fs.promises.readFile(h5pPath);
  const blob = new Blob([fileBuffer], { type: 'application/h5p' });
  const file = new File([blob], 'modified-content.h5p', { type: 'application/h5p' });

  const response = await utapi.uploadFiles([file]);

  await unlinkAsync(h5pPath);

  return response;
}

export async function POST(req: NextRequest) {
  const { title, description, textField } = await req.json();

  if (!title || !description || !textField) {
    return new Response(JSON.stringify({ error: 'Missing title or description' }), { status: 400 });
  }

  try {
    const uploadedFile = await modifyAndZipContent(title, description, textField);
    return new Response(JSON.stringify({ success: true, uploadedFile: uploadedFile }), { status: 200 });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: 'Upload failed' }), { status: 500 });
  }
}
