import { google, drive_v3 } from 'googleapis';
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
    .replace(/&#x5C;n/g, '\n')
    .replace(/&#92;n/g, '\n')
    .replace(/&amp;#x5C;n/g, '\n')
    .replace(/&amp;#92;n/g, '\n')
    .trim();

  // Ensure BEGIN/END PEM markers are on separate lines.
  formattedKey = formattedKey.replace(/-----BEGIN PRIVATE KEY-----\s*/g, '-----BEGIN PRIVATE KEY-----\n');
  formattedKey = formattedKey.replace(/\s*-----END PRIVATE KEY-----$/g, '\n-----END PRIVATE KEY-----');
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

async function validateSharedDriveFolder(drive: drive_v3.Drive, folderId: string): Promise<void> {
  try {
    const response = await drive.files.get({
      fileId: folderId,
      fields: 'id,mimeType,driveId',
      supportsAllDrives: true,
    });

    const file = response.data;
    if (!file.driveId) {
      throw new AppError(
        400,
        'Google Drive Folder ID must reference a shared drive folder. Service accounts cannot upload files to My Drive.',
      );
    }

    if (file.mimeType !== 'application/vnd.google-apps.folder') {
      throw new AppError(400, 'The provided Google Drive Folder ID must refer to a folder, not a file.');
    }
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }

    console.error('Google Drive Folder Validation Error:', err);
    throw new AppError(
      400,
      'Unable to validate the Google Drive Folder ID. Ensure the service account has access to the shared drive folder and that the folder ID is correct.',
    );
  }
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

    await validateSharedDriveFolder(drive, creds.folderId);

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
      supportsAllDrives: true,
    });

    if (!response.data.id) {
      throw new Error('No file ID returned from Google Drive');
    }

    return response.data.id;
  } catch (err: any) {
    console.error('Google Drive Upload Error:', err);

    if (err?.cause?.message?.includes('storage quota')) {
      throw new AppError(
        500,
        'Google Drive upload failed because service accounts do not have storage quota. Use a shared drive folder that the service account is a member of, or configure OAuth delegation for a user account.',
      );
    }

    throw new AppError(500, 'Failed to upload PDF to Google Drive. Check configuration.');
  }
}

export async function deletePdfFromDrive(fileId: string, creds: DriveCredentials): Promise<void> {
  try {
    const drive = getDriveClient(creds);
    await drive.files.delete({ fileId, supportsAllDrives: true, supportsTeamDrives: true });
  } catch (err: any) {
    console.error(`Google Drive Delete Error (File: ${fileId}):`, err.message);
    // We don't throw here to avoid blocking other operations if the file is already deleted or missing.
  }
}

export async function getPdfStreamFromDrive(fileId: string, creds: DriveCredentials): Promise<Readable> {
  try {
    const drive = getDriveClient(creds);
    
    const response = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true, supportsTeamDrives: true },
      { responseType: 'stream' }
    );

    return response.data as Readable;
  } catch (err: any) {
    console.error('Google Drive Stream Error:', err);
    throw new AppError(404, 'Failed to fetch PDF from Google Drive.');
  }
}
