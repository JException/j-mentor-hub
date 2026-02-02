// ...existing code...
import { headers } from 'next/headers';

export async function getClientIp() {
  const headerStore = await headers();
  const candidates = [
    'x-client-ip',
    'x-forwarded-for',
    'cf-connecting-ip',
    'true-client-ip',
    'x-real-ip',
    'forwarded',
  ];

  for (const name of candidates) {
    const val = headerStore.get(name);
    if (!val) continue;

    if (name === 'forwarded') {
      // forwarded: for=198.51.100.1; proto=https; by=203.0.113.43
      const m = val.match(/for=(?:"?)(\[?[:.\w]+\]?)(?:"?)(;|,|$)/i);
      if (m && m[1]) return m[1].trim();
      continue;
    }

    const ip = name === 'x-forwarded-for' ? val.split(',')[0].trim() : val.trim();
    if (ip) return ip;
  }

  return 'unknown';
}
// ...existing code...