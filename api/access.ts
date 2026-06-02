declare const process: {
  env: Record<string, string | undefined>;
};

const ACCESS_TOKEN_VERSION = 'v2';
const ACCESS_TOKEN_TTL_MS = 10_000;

export const config = {
  runtime: 'edge'
};

async function createAccessToken(password: string, timestamp: number) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`jk-hospital-site-access:${ACCESS_TOKEN_VERSION}:${timestamp}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const signature = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return `${timestamp}.${signature}`;
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

    const accessToken = await createAccessToken(sitePassword, Date.now());

    return Response.json(
      {
        success: true,
        redirectTo: `/?access=${encodeURIComponent(accessToken)}`,
        expiresInMs: ACCESS_TOKEN_TTL_MS
      }
    );
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
}
