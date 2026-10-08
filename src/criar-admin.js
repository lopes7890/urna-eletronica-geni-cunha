// Uso: npm run criar-admin -- <usuario> <senha>
import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

(async () => {
  const [usuario, senha] = process.argv.slice(2);
  if (!usuario || !senha || senha.length < 8) {
    console.error('Uso: npm run criar-admin -- <usuario> <senha com 8+ caracteres>');
    process.exit(1);
  }
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'urna_eletronica'
  });
  await db.query(
    'INSERT INTO usuarios (usuario, senha_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE senha_hash = VALUES(senha_hash)',
    [usuario, await bcrypt.hash(senha, 10)]);
  console.log(`Administrador "${usuario}" salvo.`);
  await db.end();
})().catch(e => { console.error(e.message); process.exit(1); });
