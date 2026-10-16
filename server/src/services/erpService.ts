import crypto from 'crypto';
import { env } from '../config/env';
import { db } from '../db/db';
import { exams } from '../db/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler';
import { generateConfigKey } from '../utils/sebKey';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function signPayload(body: string): string {
  return crypto.createHmac('sha256', env.ERP_WEBHOOK_SECRET).update(body).digest('hex');
}

async function postToERP(path: string, payload: object): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  if (!env.ERP_WEBHOOK_URL) {
    console.warn('[erpService] ERP_WEBHOOK_URL not configured — skipping push');
    return { ok: false, error: 'ERP_WEBHOOK_URL not configured' };
  }

  const body = JSON.stringify(payload);
  const signature = signPayload(body);
  const url = `${env.ERP_WEBHOOK_URL}${path}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ERP-Signature': signature,
      },
      body,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error(`[erpService] POST ${url} failed: ${res.status}`, data);
      return { ok: false, error: `ERP returned ${res.status}` };
    }

    return { ok: true, data };
  } catch (err: any) {
    console.error(`[erpService] POST ${url} error:`, err.message);
    return { ok: false, error: err.message };
  }
}

// ─── PIN Verification ─────────────────────────────────────────────────────────

/**
 * Verify a student's one-time Exam PIN against the ERP.
 * Returns the student's registration number if valid.
 */
export async function verifyStudentPin(pin: string): Promise<{ studentRegNumber: string; studentName: string }> {
  if (!env.ERP_WEBHOOK_URL) {
    throw new AppError(503, 'ERP integration is not configured on this server.');
  }

  const body = JSON.stringify({ pin });
  const signature = signPayload(body);
  const url = `${env.ERP_WEBHOOK_URL}/verify-pin`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ERP-Signature': signature,
    },
    body,
  });

  if (res.status === 404 || res.status === 400) {
    throw new AppError(401, 'Invalid or expired Exam PIN. Please generate a new one from the student portal.');
  }

  if (!res.ok) {
    throw new AppError(502, 'Could not verify PIN with the ERP. Please try again.');
  }

  const raw = (await res.json()) as any;
  const studentRegNumber = raw.studentRegNumber || raw.data?.studentRegNumber;
  const studentName = raw.studentName || raw.data?.studentName;

  if (!studentRegNumber) {
    throw new AppError(500, 'ERP verified PIN but did not return student registration number.');
  }

  return { studentRegNumber, studentName: studentName || 'Student' };
}

// ─── Push Published Exam to ERP ───────────────────────────────────────────────

/**
 * Generate a binary .seb config file for an exam.
 * SEB config files are plist XML files compressed with zlib then base64-encoded
 * with the configFileEncryptionType=0 (unencrypted / password-free) approach.
 *
 * The sebConfigKey is the SHA256 hash of the plist XML content.
 * We store that hash in the DB so the sebGuard can verify SEB requests later.
 */
export async function generateAndPushSEBFile(examId: string): Promise<{ sebConfigKey: string; sebFileBase64: string }> {
  const [exam] = await db.select().from(exams).where(eq(exams.id, examId));
  if (!exam) throw new AppError(404, 'Exam not found');
  if (exam.status !== 'active') throw new AppError(400, 'Exam must be published (active) before generating a SEB file');
  if (!exam.sebExamToken) throw new AppError(400, 'Exam token missing — republish the exam first');

  const gateUrl = `${env.CORS_ORIGIN}/exam-join/${exam.sebExamToken}`;

  const sebConfig: Record<string, unknown> = {
    startURL: gateUrl,
    sendBrowserExamKey: true,
    browserExamKeyAllowedURLFilter: `${new URL(gateUrl).origin}/*`,
    allowQuit: true,
    quitURLConfirm: true,
    showTaskBar: true,
    taskBarHeight: 40,
    allowedDisplays: 1,
    internalDisplayOnly: true,
    enableBrowserWindowToolbar: false,
    allowPreferencesWindow: false,
    browserWindowAllowReload: true,
    newBrowserWindowAllowReload: true,
    newBrowserWindowByLinkPolicy: 2,
    openLinksInSameWindow: false,
    enableJava: false,
    enablePlugIns: true,
    allowSpellCheck: false,
    allowDictionaryLookup: false,
    showTime: true,
    showInputLanguage: true,
    allowSwitchToApplications: false,
    allowFlashFullscreen: false,
    examSessionClearCookiesOnEnd: true,
    URLFilterEnable: false,
    URLFilterEnableContentFilter: false,
    hashedQuitPassword: '',
    cryptoIdentity: '',
    configFileEncryptionType: 0,
  };

  // Generate the official SEB Config Key per Safe Exam Browser specification
  const sebConfigKey = generateConfigKey(sebConfig);

  // Build a SEB-compatible plist XML
  const plistXml = buildSEBPlist({
    startURL: gateUrl,
    title: exam.title,
  });

  // SEB unencrypted config files (.seb) MUST follow the official Safe Exam Browser binary spec:
  // 1. 4-byte ASCII prefix: "plnd" (Plain Data indicator)
  // 2. Gzip-compressed stream (mtime=0 for deterministic output) containing the UTF-8 XML plist
  const zlib = await import('zlib');
  const gzipped = zlib.gzipSync(Buffer.from(plistXml, 'utf8'), { level: 9 });
  // Strip the gzip mtime bytes (bytes 4-7) so the binary is deterministic across calls
  gzipped.writeUInt32LE(0, 4);
  const sebBinary = Buffer.concat([Buffer.from('plnd', 'ascii'), gzipped]);
  const sebFileBase64 = sebBinary.toString('base64');

  // Persist the official sebConfigKey into the exam row so sebGuard can validate future requests
  await db.update(exams)
    .set({ sebConfigKey, updatedAt: new Date() })
    .where(eq(exams.id, examId));

  // Push to ERP so students can download the file from the student dashboard
  const pushResult = await postToERP('/exam-published', {
    examId: exam.id,
    erpCourseCode: exam.erpCourseCode,
    examTitle: exam.title,
    startTime: exam.startTime,
    endTime: exam.endTime,
    durationMinutes: exam.durationMinutes,
    sebFileBase64,
    sebConfigKey,
    gateUrl,
  });

  if (!pushResult.ok) {
    console.warn('[erpService] SEB file generated but ERP push failed:', pushResult.error);
    // Don't throw — return the file anyway so the teacher still gets it
  }

  return { sebConfigKey, sebFileBase64 };
}

// ─── Teacher Provisioning Push ────────────────────────────────────────────────

/**
 * Called when the ERP creates a new teacher account. Provisions the teacher
 * in the Exam Portal so they can log in and create exams immediately.
 * The ERP sends the teacher data; this function is the RECEIVER side.
 * (The actual reception is in the ERP webhook route in the exam portal)
 */
export async function pushTeacherToExamPortal(teacher: {
  fullName: string;
  email: string;
  tempPassword: string;
}): Promise<{ ok: boolean }> {
  const result = await postToERP('/teacher-provisioned', teacher);
  return { ok: result.ok };
}

// ─── Grade Push ───────────────────────────────────────────────────────────────

/**
 * Push final graded marks from the Exam Portal to the ERP.
 * Called after a teacher marks a submission.
 */
export async function pushGradeToERP(payload: {
  studentRegNumber: string;
  erpCourseCode: string;
  examId: string;
  marksAwarded: number;
  totalMarks: number;
  examTitle: string;
}): Promise<void> {
  const result = await postToERP('/grade-submitted', payload);
  if (!result.ok) {
    console.warn('[erpService] Grade push to ERP failed:', result.error);
    // Non-fatal: grades can be re-synced manually
  }
}

// ─── Plist Builder ────────────────────────────────────────────────────────────

function buildSEBPlist(opts: { startURL: string; title: string }): string {
  // Standard SEB plist structure (compatible with SEB 3.x+ on Windows, Mac, and iOS)
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>originatorVersion</key>
  <string>SEB_Win_3.5.0</string>
  <key>startURL</key>
  <string>${escapeXml(opts.startURL)}</string>
  <key>sendBrowserExamKey</key>
  <true/>
  <key>browserExamKeyAllowedURLFilter</key>
  <string>${escapeXml(new URL(opts.startURL).origin + '/*')}</string>
  <key>allowQuit</key>
  <true/>
  <key>quitURLConfirm</key>
  <true/>
  <key>showTaskBar</key>
  <true/>
  <key>taskBarHeight</key>
  <integer>40</integer>
  <key>allowedDisplays</key>
  <integer>1</integer>
  <key>internalDisplayOnly</key>
  <true/>
  <key>enableBrowserWindowToolbar</key>
  <false/>
  <key>allowPreferencesWindow</key>
  <false/>
  <key>browserWindowAllowReload</key>
  <true/>
  <key>newBrowserWindowAllowReload</key>
  <true/>
  <key>newBrowserWindowByLinkPolicy</key>
  <integer>2</integer>
  <key>openLinksInSameWindow</key>
  <false/>
  <key>enableJava</key>
  <false/>
  <key>enablePlugIns</key>
  <true/>
  <key>allowSpellCheck</key>
  <false/>
  <key>allowDictionaryLookup</key>
  <false/>
  <key>showTime</key>
  <true/>
  <key>showInputLanguage</key>
  <true/>
  <key>allowSwitchToApplications</key>
  <false/>
  <key>allowFlashFullscreen</key>
  <false/>
  <key>examSessionClearCookiesOnEnd</key>
  <true/>
  <key>URLFilterEnable</key>
  <false/>
  <key>URLFilterEnableContentFilter</key>
  <false/>
  <key>hashedQuitPassword</key>
  <string></string>
  <key>cryptoIdentity</key>
  <string></string>
  <key>configFileEncryptionType</key>
  <integer>0</integer>
</dict>
</plist>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
