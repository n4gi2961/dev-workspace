/**
 * Cloudflare Worker for R2 image storage API
 *
 * Endpoints:
 *   POST /upload/presign  - Get presigned URL for direct R2 upload
 *   PUT  /upload/:key     - Direct upload to R2
 *   GET  /images/:key     - Serve image from R2 (public, no auth)
 *   DELETE /images/:key   - Delete an image from R2
 *
 * JWT verification supports both ES256 (JWKS) and HS256 (legacy secret).
 */

interface Env {
  BOARD_IMAGES: R2Bucket;
  SUPABASE_JWT_SECRET: string;
  SUPABASE_URL: string;
}

interface JWTPayload {
  sub: string; // user ID
  exp: number;
  iss: string;
  role: string;
}

interface JWTHeader {
  alg: string;
  typ: string;
  kid?: string;
}

interface JWK {
  kty: string;
  crv?: string;
  x?: string;
  y?: string;
  kid?: string;
  alg?: string;
}

interface PresignRequest {
  boardId: string;
  fileName: string;
  contentType: string;
}

// --- JWKS Cache ---

let jwksCache: { keys: CryptoKey[]; kids: string[]; fetchedAt: number } | null = null;
const JWKS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function getJwksKeys(supabaseUrl: string): Promise<{ keys: CryptoKey[]; kids: string[] }> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_CACHE_TTL) {
    return { keys: jwksCache.keys, kids: jwksCache.kids };
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
  if (!res.ok) {
    throw new Error(`Failed to fetch JWKS: ${res.status}`);
  }

  const { keys: jwks } = (await res.json()) as { keys: JWK[] };
  const imported: CryptoKey[] = [];
  const kids: string[] = [];

  for (const jwk of jwks) {
    if (jwk.kty === 'EC' && jwk.crv === 'P-256') {
      const key = await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify'],
      );
      imported.push(key);
      kids.push(jwk.kid ?? '');
    }
  }

  jwksCache = { keys: imported, kids, fetchedAt: Date.now() };
  return { keys: imported, kids };
}

// --- JWT Verification ---

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function verifyES256(
  data: Uint8Array,
  signature: Uint8Array,
  header: JWTHeader,
  supabaseUrl: string,
): Promise<boolean> {
  const { keys, kids } = await getJwksKeys(supabaseUrl);

  for (let i = 0; i < keys.length; i++) {
    // If JWT has kid, match it; otherwise try all keys
    if (header.kid && kids[i] && header.kid !== kids[i]) continue;

    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      keys[i],
      signature,
      data,
    );
    if (valid) return true;
  }
  return false;
}

async function verifyHS256(
  data: Uint8Array,
  signature: Uint8Array,
  secret: string,
): Promise<boolean> {
  // Method 1: secret as UTF-8 string
  const keyUtf8 = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  if (await crypto.subtle.verify('HMAC', keyUtf8, signature, data)) {
    return true;
  }

  // Method 2: secret as Base64-decoded bytes
  try {
    const decoded = base64UrlDecode(
      secret.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    );
    const keyB64 = await crypto.subtle.importKey(
      'raw',
      decoded,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    if (await crypto.subtle.verify('HMAC', keyB64, signature, data)) {
      return true;
    }
  } catch {
    // base64 decode failed, ignore
  }

  return false;
}

async function verifyJWT(token: string, env: Env): Promise<JWTPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');

  const [headerB64, payloadB64, signatureB64] = parts;

  const header: JWTHeader = JSON.parse(
    new TextDecoder().decode(base64UrlDecode(headerB64)),
  );
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecode(signatureB64);

  let valid = false;

  if (header.alg === 'ES256') {
    valid = await verifyES256(data, signature, header, env.SUPABASE_URL);
  } else if (header.alg === 'HS256') {
    valid = await verifyHS256(data, signature, env.SUPABASE_JWT_SECRET);
  } else {
    throw new Error(`Unsupported JWT algorithm: ${header.alg}`);
  }

  if (!valid) {
    throw new Error(`Invalid JWT signature (alg=${header.alg})`);
  }

  const payload: JWTPayload = JSON.parse(
    new TextDecoder().decode(base64UrlDecode(payloadB64)),
  );

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('JWT expired');
  }

  return payload;
}

// --- Auth Middleware ---

async function authenticateRequest(
  request: Request,
  env: Env,
): Promise<JWTPayload> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);
  return verifyJWT(token, env);
}

// --- CORS ---

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function corsResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(data: unknown, status = 200): Response {
  return corsResponse(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

// --- File path generation ---

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function generateKey(userId: string, boardId: string, fileName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = fileName.split('.').pop() || 'jpg';
  return `${userId}/${boardId}/${timestamp}-${random}.${ext}`;
}

// --- Route Handlers ---

async function handlePresign(
  request: Request,
  _env: Env,
  user: JWTPayload,
): Promise<Response> {
  const body = (await request.json()) as PresignRequest;
  const { boardId, fileName, contentType } = body;

  if (!boardId || !fileName || !contentType) {
    return errorResponse('boardId, fileName, contentType are required');
  }

  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return errorResponse(
      `Unsupported content type. Allowed: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
    );
  }

  const key = generateKey(user.sub, boardId, fileName);

  const uploadUrl = new URL(request.url);
  uploadUrl.pathname = `/upload/${encodeURIComponent(key)}`;

  const publicUrl = `${uploadUrl.origin}/images/${encodeURIComponent(key)}`;

  return jsonResponse({
    uploadUrl: uploadUrl.toString(),
    publicUrl,
    key,
    contentType,
  } satisfies Record<string, string>);
}

async function handleUpload(
  request: Request,
  env: Env,
  user: JWTPayload,
  key: string,
): Promise<Response> {
  if (!key.startsWith(user.sub + '/')) {
    return errorResponse('Unauthorized: key does not match user', 403);
  }

  const contentType = request.headers.get('Content-Type') || 'image/jpeg';
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return errorResponse('Unsupported content type');
  }

  const contentLength = request.headers.get('Content-Length');
  if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
    return errorResponse('File too large. Maximum size is 10MB', 413);
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_FILE_SIZE) {
    return errorResponse('File too large. Maximum size is 10MB', 413);
  }

  await env.BOARD_IMAGES.put(key, body, {
    httpMetadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });

  const publicUrl = new URL(request.url);
  publicUrl.pathname = `/images/${encodeURIComponent(key)}`;

  return jsonResponse({ publicUrl: publicUrl.toString(), key }, 201);
}

async function handleGetImage(
  env: Env,
  key: string,
): Promise<Response> {
  const object = await env.BOARD_IMAGES.get(key);
  if (!object) {
    return errorResponse('Image not found', 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return corsResponse(new Response(object.body, { headers }));
}

async function handleDelete(
  env: Env,
  user: JWTPayload,
  key: string,
): Promise<Response> {
  if (!key.startsWith(user.sub + '/')) {
    return errorResponse('Unauthorized: cannot delete another user\'s image', 403);
  }

  await env.BOARD_IMAGES.delete(key);
  return jsonResponse({ deleted: true });
}

// --- Main Handler ---

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return corsResponse(new Response(null, { status: 204 }));
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Public endpoint: serve images (no auth required)
      if (request.method === 'GET' && path.startsWith('/images/')) {
        const key = decodeURIComponent(path.slice('/images/'.length));
        return handleGetImage(env, key);
      }

      // All other endpoints require authentication
      const user = await authenticateRequest(request, env);

      if (request.method === 'POST' && path === '/upload/presign') {
        return handlePresign(request, env, user);
      }

      if (request.method === 'PUT' && path.startsWith('/upload/')) {
        const key = decodeURIComponent(path.slice('/upload/'.length));
        return handleUpload(request, env, user, key);
      }

      if (request.method === 'DELETE' && path.startsWith('/images/')) {
        const key = decodeURIComponent(path.slice('/images/'.length));
        return handleDelete(env, user, key);
      }

      return errorResponse('Not found', 404);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      console.error(`[vb-r2-api] ${request.method} ${path} — ${message}`);

      if (
        message.includes('JWT') ||
        message.includes('Authorization') ||
        message.includes('expired')
      ) {
        return errorResponse(message, 401);
      }

      return errorResponse(message, 500);
    }
  },
} satisfies ExportedHandler<Env>;
