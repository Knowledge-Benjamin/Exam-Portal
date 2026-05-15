import { google } from 'googleapis';
import { Readable } from 'stream';
import { AppError } from '../middleware/errorHandler';

export interface DriveCredentials {
  email: string;
  privateKey: string;
  folderId: string;
}

function getDriveClient(creds: DriveCredentials) {
  if (!creds.email || !creds.privateKey || !creds.folderId) {
    throw new AppError(500, 'Google Drive credentials are not fully configured for this teacher.');
  }

  // Format the private key properly (replace literal \n with actual newlines if necessary)
  const formattedKey = creds.privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: creds.email,
    key: formattedKey,
    scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.readonly'],
  });

  return google.drive({ version: 'v3', auth });
}

export async function uploadPdfToDrive(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  creds: DriveCredentials
): Promise<string> {
  try {
    const drive = getDriveClient(creds);

    const fileMetadata = {
      name: originalName,
      parents: [creds.folderId],
    };

    const media = {
      mimeType,
      body: Readable.from(buffer),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
    });

    if (!response.data.id) {
      throw new Error('No file ID returned from Google Drive');
    }

    return response.data.id;
  } catch (err: any) {
    console.error('Google Drive Upload Error:', err);
    throw new AppError(500, 'Failed to upload PDF to Google Drive. Check configuration.');
  }
}

export async function deletePdfFromDrive(fileId: string, creds: DriveCredentials): Promise<void> {
  try {
    const drive = getDriveClient(creds);
    await drive.files.delete({ fileId });
  } catch (err: any) {
    console.error(`Google Drive Delete Error (File: ${fileId}):`, err.message);
    // We don't throw here to avoid blocking other operations if the file is already deleted or missing.
  }
}

export async function getPdfStreamFromDrive(fileId: string, creds: DriveCredentials): Promise<Readable> {
  try {
    const drive = getDriveClient(creds);
    
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    return response.data as Readable;
  } catch (err: any) {
    console.error('Google Drive Stream Error:', err);
    throw new AppError(404, 'Failed to fetch PDF from Google Drive.');
  }
}
