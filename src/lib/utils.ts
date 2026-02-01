import { headers } from 'next/headers';

export async function getClientIp() {
  const headerStore = await headers();
  // 'x-forwarded-for' is common for apps behind proxies
  const forwarded = headerStore.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : headerStore.get('x-real-ip');
  
  return ip || 'unknown';
}