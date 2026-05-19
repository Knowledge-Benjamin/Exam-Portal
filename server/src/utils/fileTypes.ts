/**
 * Blocked MIME types for student file submissions
 * These are dangerous file types that could pose security risks
 */
export const BLOCKED_FILE_TYPES = new Set([
  // Executables
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-elf',
  'application/x-sharedlib',
  'application/x-object',

  // Scripts
  'application/x-sh',
  'application/x-shellscript',
  'text/x-shellscript',
  'application/x-bat',
  'application/x-cmd',
  'application/x-cmdscript',
  // 'text/plain' intentionally allowed — specific plain text files are permitted

  // Archives that could contain executables
  'application/x-7z-compressed',
  'application/x-rar-compressed',

  // Active content
  'application/x-msaccess',
  'application/x-mspublisher',
  'application/x-mspowerpoint',
  'application/vnd.ms-powerpoint',
  'application/x-msproject',
  'application/x-visio',

  // Compiled code
  'application/x-java-applet',
  'application/x-java-jnlp-file',
  'application/x-java-vm',
  'application/x-msil',
  'application/octet-stream', // Catch ambiguous/unknown binary

  // Disk/System
  'application/x-iso9660-image',
  'application/x-vmdk',
  'application/x-qemu-disk',
]);

/**
 * Maximum file size for student submissions (10 MB)
 */
import path from 'path';

export const MAX_SUBMISSION_FILE_SIZE_MB = 10;

const BLOCKED_FILE_EXTENSIONS = new Set([
  '.exe', '.dll', '.bat', '.cmd', '.sh', '.ps1', '.vbs',
  '.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.pl', '.jar',
  '.apk', '.zip', '.rar', '.7z', '.gz', '.tar', '.bz2', '.cab',
  '.msi', '.com', '.scr', '.cpl', '.pif', '.wsf', '.psm1', '.psd1',
]);

/**
 * Check if a file extension is allowed for submission
 */
export function isFileExtensionAllowed(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  if (!ext) {
    return true;
  }
  return !BLOCKED_FILE_EXTENSIONS.has(ext);
}

/**
 * Check if a file type is allowed for submission
 */
export function isFileTypeAllowed(mimeType: string): boolean {
  return !BLOCKED_FILE_TYPES.has(mimeType);
}

/**
 * Get human-readable reason for blocked file
 */
export function getBlockReason(mimeType: string): string {
  if (BLOCKED_FILE_TYPES.has(mimeType)) {
    return 'This file type is blocked for security reasons.';
  }
  return '';
}
