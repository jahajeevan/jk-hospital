import { next } from '@vercel/functions';

declare const process: {
  env: Record<string, string | undefined>;
};

const PUBLIC_FILE = /\.(.*)$/;
const ACCESS_TOKEN_VERSION = 'v2';
const ACCESS_TOKEN_TTL_MS = 10_000;

async function createAccessToken(password: string, timestamp: number) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`jk-hospital-site-access:${ACCESS_TOKEN_VERSION}:${timestamp}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hasValidAccess(request: Request) {
  const sitePassword = process.env.SITE_ACCESS_PASSWORD;

  if (!sitePassword) return false;

  const url = new URL(request.url);
  const accessToken = url.searchParams.get('access') || '';
  const [timestampValue, signature] = accessToken.split('.');
  const timestamp = Number(timestampValue);

  if (!timestamp || !signature || Date.now() - timestamp > ACCESS_TOKEN_TTL_MS) return false;

  const expectedValue = await createAccessToken(sitePassword, timestamp);

  return accessToken === expectedValue;
}

function isExcludedPath(pathname: string) {
  return (
    pathname === '/access' ||
    pathname === '/api/access' ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/images') ||
    PUBLIC_FILE.test(pathname)
  );
}

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const { pathname } = url;
  const authenticated = await hasValidAccess(request);

  if (pathname === '/access' && authenticated) {
    return Response.redirect(new URL('/', request.url), 302);
  }

  if (isExcludedPath(pathname)) {
    return next();
  }

  if (!authenticated) {
    return Response.redirect(new URL('/access', request.url), 302);
  }

  return next();
}

export const config = {
  matcher: ['/((?!api/access|_next|assets|images|favicon.ico|.*\\..*).*)']
};
