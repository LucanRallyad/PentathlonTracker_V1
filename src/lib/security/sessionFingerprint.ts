import { createHash } from 'crypto';
import { NextRequest } from 'next/server';

/**
 * Session fingerprinting — binds sessions to a hash of User-Agent + IP subnet.
 * Detects session hijacking by comparing fingerprints on each request.
 */
export function generateFingerprint(req: NextRequest): string {
  const userAgent = req.headers.get('user-agent') || '';
  const ip = getClientIp(req);
  const ipSubnet = getIpSubnet(ip);

  return createHash('sha256')
    .update(`${userAgent}:${ipSubnet}`)
    .digest('hex');
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

/**
 * Extract subnet from IP address (first 3 octets for IPv4).
 */
function getIpSubnet(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  // IPv6 or other: use first half
  return ip.substring(0, ip.length / 2);
}
