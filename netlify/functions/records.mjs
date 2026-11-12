import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

const json = (body, status = 200) => ({ statusCode: status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const store = () => getStore('nova-londrina-records');

function authorized(event) {
  const token = String(event.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  try {
    const secret = process.env.ADMIN_TOKEN_SECRET || process.env.ADMIN_PASSWORD || '';
    const expected = crypto.createHmac('sha256', secret).update(parts[0]).digest('base64url');
    const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts[1])) && data.exp > Date.now();
  } catch { return false; }
}

async function readRecords() { return (await store().get('records.json', { type: 'json' })) || []; }
async function writeRecords(records) { await store().setJSON('records.json', records); return records; }

export default async function handler(event) {
  try {
    if (event.httpMethod === 'POST') {
      const record = JSON.parse(event.body || '{}');
      if (!record.nome || !record.descricao || !record.tipo) return json({ error: 'Dados obrigatórios ausentes.' }, 400);
      const records = await readRecords();
      record.id = record.id || Date.now(); record.status = record.status || 'em_acompanhamento'; record.data = record.data || new Date().toISOString();
      await writeRecords([...records, record]);
      return json({ record }, 201);
    }
    if (!authorized(event)) return json({ error: 'Não autorizado.' }, 401);
    const records = await readRecords();
    if (event.httpMethod === 'GET') return json({ records });
    const input = JSON.parse(event.body || '{}');
    if (event.httpMethod === 'PATCH') {
      const updated = records.map((record) => record.id === Number(input.id) ? { ...record, ...input, id: record.id, atualizadoEm: new Date().toISOString() } : record);
      await writeRecords(updated); return json({ records: updated });
    }
    if (event.httpMethod === 'DELETE') {
      await writeRecords(records.filter((record) => record.id !== Number(input.id))); return json({ ok: true });
    }
    return json({ error: 'Método não permitido.' }, 405);
  } catch (error) { return json({ error: 'Não foi possível acessar os registros.' }, 500); }
}
