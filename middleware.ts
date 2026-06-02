import { next } from '@vercel/functions';

declare const process: {
  env: Record<string, string | undefined>;
};

const PUBLIC_FILE = /\.(.*)$/;
const ACCESS_TOKEN_VERSION = 'v2';
const COOKIE_NAME = 'site_access';
const ACCESS_TOKEN_TTL_MS = 60_000;
const CLEAR_ACCESS_COOKIE = `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure`;

function getCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
}

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

  const accessToken = getCookie(request, COOKIE_NAME);
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
    const response = Response.redirect(new URL('/', request.url), 302);
    response.headers.set('Set-Cookie', CLEAR_ACCESS_COOKIE);
    return response;
  }

  if (isExcludedPath(pathname)) {
    return next();
  }

  if (!authenticated) {
    return Response.redirect(new URL('/access', request.url), 302);
  }

  const response = next();
  response.headers.set('Set-Cookie', CLEAR_ACCESS_COOKIE);
  return response;
}

export const config = {
  matcher: ['/((?!api/access|_next|assets|images|favicon.ico|.*\\..*).*)']
};
