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

export async function GET(req: NextRequest) {
  try {
    const wordsPath = path.join(process.cwd(), 'content', 'words'); // Your words folder
    const tempDir = process.env.NODE_ENV === 'production' ? '/tmp' : path.join(process.cwd(), 'temp');

    // Ensure the temp directory exists (for local dev)
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const zipPath = path.join(tempDir, 'words.zip');
    const h5pPath = path.join(tempDir, 'words.h5p');

    if (!fs.existsSync(wordsPath)) {
      return new Response(JSON.stringify({ error: 'Words folder not found' }), { status: 404 });
    }

    // Create ZIP file
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve(undefined));
      archive.on('error', reject);
      archive.pipe(output);

      // Add files without extra directory nesting
      fs.readdirSync(wordsPath).forEach((file) => {
        const filePath = path.join(wordsPath, file);
        if (fs.lstatSync(filePath).isDirectory()) {
          archive.directory(filePath, file);
        } else {
          archive.file(filePath, { name: file });
        }
      });

      archive.finalize();
    });

    // Rename ZIP to .h5p
    await renameAsync(zipPath, h5pPath);

    // Read the H5P file
    const fileBuffer = await fs.promises.readFile(h5pPath);

    // Upload using UploadThing
    const blob = new Blob([fileBuffer], { type: 'application/h5p' });
    const file = new File([blob], 'words.h5p', { type: 'application/h5p' });

    const response = await utapi.uploadFiles([file]);

    // Cleanup
    await unlinkAsync(h5pPath);

    return new Response(JSON.stringify({ success: true, uploadedFile: response }), { status: 200 });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: 'Upload failed' }), { status: 500 });
  }
}
