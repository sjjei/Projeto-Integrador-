import crypto from 'node:crypto';

const json = (body, status = 200) => ({ statusCode: status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

export default async function handler(event) {
  if (event.httpMethod !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  const input = JSON.parse(event.body || '{}');
  const password = String(input.password || '');
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || password !== expected) return json({ error: 'Credenciais inválidas.' }, 401);
  const secret = process.env.ADMIN_TOKEN_SECRET || expected;
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return json({ token: payload + '.' + signature });
}
