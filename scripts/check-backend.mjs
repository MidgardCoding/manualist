// Backend probe: checks whether the Supabase migrations in
// supabase/migrations/ (001-005) have been applied to the live project.
// Uses only the anon/publishable key from .env — no auth needed.
// Run: node scripts/check-backend.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = {};
for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
const URL = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
if (!URL || !KEY) {
  console.error('Missing VITE_SUPABASE_URL / key in .env');
  process.exit(2);
}
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const results = [];
const row = (area, name, status, detail) => results.push({ area, name, status, detail });

async function probeTable(table, column = 'id') {
  try {
    const res = await fetch(`${URL}/rest/v1/${table}?select=${column}&limit=0`, { headers });
    const body = await res.text();
    if (res.ok) return row('table', table, 'OK', 'exists (200)');
    if (res.status === 404 || body.includes('PGRST205') || body.toLowerCase().includes('could not find the table'))
      return row('table', table, 'MISSING', `${res.status} — migration not applied?`);
    return row('table', table, 'WARN', `${res.status} ${body.slice(0, 120)}`);
  } catch (e) {
    return row('table', table, 'ERROR', String(e).slice(0, 120));
  }
}

async function probeBucket(bucket) {
  try {
    const res = await fetch(`${URL}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prefix: '', limit: 1 }),
    });
    const body = await res.text();
    if (res.ok) return row('bucket', bucket, 'OK', 'exists (200)');
    if (body.includes('Bucket not found')) return row('bucket', bucket, 'MISSING', 'migration 001/004 not applied?');
    if (res.status === 403) return row('bucket', bucket, 'OK', 'exists (403 = no anon access, expected for private bucket)');
    return row('bucket', bucket, 'WARN', `${res.status} ${body.slice(0, 120)}`);
  } catch (e) {
    return row('bucket', bucket, 'ERROR', String(e).slice(0, 120));
  }
}

async function probeRpc(fn, body = '{}') {
  try {
    const res = await fetch(`${URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body });
    const text = await res.text();
    if (res.status === 404 && text.includes('Could not find the function'))
      return row('rpc', fn, 'MISSING', 'function not found — migration not fully applied?');
    if (res.ok) return row('rpc', fn, 'OK', 'exists (200)');
    return row('rpc', fn, 'OK', `exists (${res.status} as anon — needs real user; ${text.slice(0, 80)})`);
  } catch (e) {
    return row('rpc', fn, 'ERROR', String(e).slice(0, 120));
  }
}

for (const [t, c] of [['user_files', 'id'], ['manuals', 'id'], ['user_credits', 'credits']]) await probeTable(t, c);
for (const b of ['user-manuals', 'avatars']) await probeBucket(b);
await probeRpc('get_my_credits');
await probeRpc('deduct_credits', '{"p_amount": 1}');
await probeRpc('delete_current_user');

console.log('\nSupabase backend probe @ ' + URL);
console.log('area   name                 status   detail');
console.log('------ -------------------- -------  --------------------------------');
for (const r of results) {
  console.log(`${r.area.padEnd(6)} ${r.name.padEnd(20)} ${r.status.padEnd(7)}  ${r.detail}`);
}
const missing = results.filter((r) => r.status === 'MISSING');
console.log(
  missing.length === 0
    ? '\nVerdict: all probed objects exist. Remaining 400/406 noise is first-run misses (no chat.json / no rows yet), now silenced in the app.'
    : `\nVerdict: ${missing.length} object(s) MISSING — apply supabase/migrations in order via Dashboard > SQL Editor, then re-run this script.`
);
process.exit(missing.length === 0 ? 0 : 1);
