// Crea o aggiorna un utente. Uso: npm run user -- <email> <Enrico|Alessandro> <password> [--remote]
import { execSync } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { hashPassword } from '../worker/index.js'

const [email, owner, password, remote] = process.argv.slice(2)
if (!email || !['Enrico', 'Alessandro'].includes(owner) || !password || password.length < 8) {
  console.error('Uso: npm run user -- <email> <Enrico|Alessandro> <password di almeno 8 caratteri> [--remote]')
  process.exit(1)
}
const hash = await hashPassword(password)
const q = s => `'${s.replace(/'/g, "''")}'`
const sql = `INSERT INTO users (email, owner, password_hash) VALUES (${q(email.toLowerCase())}, ${q(owner)}, ${q(hash)})
  ON CONFLICT(email) DO UPDATE SET owner = excluded.owner, password_hash = excluded.password_hash`
const file = join(tmpdir(), `restpoke-user-${Date.now()}.sql`)
writeFileSync(file, sql)
try {
  execSync(`npx wrangler d1 execute restpoke ${remote === '--remote' ? '--remote' : '--local'} --file="${file}"`, { stdio: 'inherit' })
} finally { unlinkSync(file) }
