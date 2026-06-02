const COOKIE_NAME = 'site_access';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export const config = {
  runtime: 'edge'
};

async function createAccessToken(password: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`jk-hospital-site-access:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function serializeAccessCookie(value: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`;
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405 });
  }

  const sitePassword = process.env.SITE_ACCESS_PASSWORD;

  if (!sitePassword) {
    return Response.json({ error: 'Site access password is not configured.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const password = typeof body?.password === 'string' ? body.password : '';

    if (password !== sitePassword) {
      return Response.json({ error: 'Invalid password.' }, { status: 401 });
    }

    const accessToken = await createAccessToken(sitePassword);

    return Response.json(
      { success: true },
      {
        headers: {
          'Set-Cookie': serializeAccessCookie(accessToken)
        }
      }
    );
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
}
