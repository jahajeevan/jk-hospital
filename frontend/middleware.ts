import { next } from '@vercel/functions';

const COOKIE_NAME = 'site_access';
const PUBLIC_FILE = /\.(.*)$/;

function getCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
}

async function createAccessToken(password: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`jk-hospital-site-access:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hasValidAccess(request: Request) {
  const sitePassword = process.env.SITE_ACCESS_PASSWORD;

  if (!sitePassword) return false;

  const cookieValue = getCookie(request, COOKIE_NAME);

  if (!cookieValue) return false;

  const expectedValue = await createAccessToken(sitePassword);

  return cookieValue === expectedValue;
}

function isExcludedPath(pathname: string) {
  return (
    pathname === '/access' ||
    pathname === '/admin/login' ||
    pathname === '/admin' ||
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
