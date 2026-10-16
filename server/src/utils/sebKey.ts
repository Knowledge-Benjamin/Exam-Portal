import crypto from 'crypto';

/**
 * Official Safe Exam Browser (SEB) Config Key Specification Implementation
 * @see https://safeexambrowser.org/developer/seb-config-key.html
 */

export interface SEBConfigObject {
  [key: string]: unknown;
}

/**
 * Converts a SEB configuration object to SEB-JSON format
 * - Strips `originatorVersion`
 * - Sorts all dictionary keys alphabetically
 * - Compact formatting without whitespace or newlines
 * - Booleans formatted as lowercase 'true'/'false'
 * - Numbers formatted as decimal string
 */
export function convertToSEBJSON(config: SEBConfigObject): string {
  const configCopy = { ...config };
  delete configCopy.originatorVersion;
  return stringifySEBJSON(configCopy);
}

function stringifySEBJSON(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (Buffer.isBuffer(value)) {
    return JSON.stringify(value.toString('base64'));
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => stringifySEBJSON(item));
    return `[${items.join(',')}]`;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;

    // Filter out empty nested dictionaries per SEB specification
    const nonEmptyKeys = Object.keys(obj).filter((key) => {
      const val = obj[key];
      if (
        typeof val === 'object' &&
        val !== null &&
        !Array.isArray(val) &&
        !Buffer.isBuffer(val) &&
        !(val instanceof Date)
      ) {
        return Object.keys(val as Record<string, unknown>).length > 0;
      }
      return true;
    });

    if (nonEmptyKeys.length === 0) {
      return '{}';
    }

    // Sort keys alphabetically (case-insensitive ASCII per spec)
    const sortedKeys = nonEmptyKeys.sort((a, b) => {
      return a
        .toLowerCase()
        .localeCompare(b.toLowerCase(), 'en', { sensitivity: 'base' });
    });

    const pairs = sortedKeys.map((key) => {
      const keyStr = JSON.stringify(key);
      const valueStr = stringifySEBJSON(obj[key]);
      return `${keyStr}:${valueStr}`;
    });

    return `{${pairs.join(',')}}`;
  }

  return 'null';
}

/**
 * Generates the official 64-character lowercase hexadecimal SEB Config Key
 * from the configuration dictionary.
 */
export function generateConfigKey(config: SEBConfigObject): string {
  const sebJSON = convertToSEBJSON(config);
  return crypto.createHash('sha256').update(sebJSON, 'utf8').digest('hex').toLowerCase();
}

/**
 * Generates the expected X-SafeExamBrowser-ConfigKeyHash header value for a given URL and Config Key.
 * SEB spec: SHA256(URL_without_fragment + ConfigKey_hex)
 */
export function generateConfigKeyHash(url: string, configKey: string): string {
  const urlWithoutFragment = url.split('#')[0];
  const combined = urlWithoutFragment + configKey.trim().toLowerCase();
  return crypto.createHash('sha256').update(combined, 'utf8').digest('hex').toLowerCase();
}
