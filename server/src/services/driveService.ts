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

  if (/(\\n|&#x5C;n|&#92;n|&amp;#x5C;n|&amp;#92;n)/.test(creds.privateKey)) {
    throw new AppError(
      500,
      'Google Drive private key contains escaped newline sequences. Paste the service account key as a real multiline PEM block, not as literal \\n or HTML-escaped entities.',
    );
  }

  // Normalize private key formatting so PEM headers and newlines are valid.
  let formattedKey = creds.privateKey.trim();
  if ((formattedKey.startsWith('"') && formattedKey.endsWith('"')) || (formattedKey.startsWith("'") && formattedKey.endsWith("'"))) {
    formattedKey = formattedKey.slice(1, -1).trim();
  }
  formattedKey = formattedKey
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  // Ensure BEGIN/END PEM markers are on separate lines.
  formattedKey = formattedKey.replace(/-----BEGIN PRIVATE KEY-----\s*/g, '-----BEGIN PRIVATE KEY-----\n');
  formattedKey = formattedKey.replace(/\s*-----END PRIVATE KEY-----$/g, '\n-----END PRIVATE KEY-----');

  if (!formattedKey.includes('-----BEGIN PRIVATE KEY-----\n') || !formattedKey.includes('\n-----END PRIVATE KEY-----')) {
    throw new AppError(500, 'Google Drive private key is invalid. It must be the service account private key PEM block with BEGIN/END PRIVATE KEY headers.');
  }

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
