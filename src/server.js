import "dotenv/config";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import express from "express";
import cors from "cors";
import multer from "multer";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  PORT = 3000,
  JWT_SECRET,
  LIBERACAO_SEGUNDOS = 180,
  DIGITOS = 2,
  CORS_ORIGINS,
} = process.env;
if (!JWT_SECRET) {
  console.error("Defina JWT_SECRET no arquivo .env");
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "urna_eletronica",
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
});

/* ---------- utilitários ---------- */
const httpErr = (status, msg) => Object.assign(new Error(msg), { status });

const h = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const normNome = (s) =>
  String(s || "").trim().toUpperCase();

const fotoSegura = (f) =>
  typeof f === "string" && f.startsWith("/uploads/") ? f : null;

async function tx(fn) {
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const r = await fn(c);
    await c.commit();
    return r;
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}
// Usa o relógio do MySQL (NOW()) em tudo, evitando divergência de fuso com o Node.
const expirarLiberacoes = (db = pool) =>
  db.query(
    "UPDATE liberacoes SET status='expirada', finalizada_em=NOW() WHERE status='liberada' AND expira_em < NOW()",
  );

async function listarChapas(db = pool) {
  const [cs] = await db.query(
    "SELECT id, nome, numero, foto FROM chapas ORDER BY numero",
  );
  const [is] = await db.query(
    "SELECT chapa_id, nome, cargo, foto FROM integrantes ORDER BY chapa_id, ordem",
  );
  return cs.map((c) => ({
    ...c,
    integrantes: is
      .filter((i) => i.chapa_id === c.id)
      .map(({ nome, cargo, foto }) => ({ nome, cargo, foto })),
  }));
}

/* ---------- upload de fotos ---------- */
const uploadsDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
const EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, f, cb) =>
      cb(null, crypto.randomBytes(12).toString("hex") + EXT[f.mimetype]),
  }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, f, cb) =>
    EXT[f.mimetype]
      ? cb(null, true)
      : cb(httpErr(400, "Envie imagens JPG, PNG ou WEBP.")),
});

/* ---------- app ---------- */
const app = express();
app.use(
  cors({
    origin: CORS_ORIGINS ? CORS_ORIGINS.split(",").map((s) => s.trim()) : false,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(uploadsDir));

const auth = (req, res, next) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(httpErr(401, "Sessão expirada. Entre novamente."));
  }
};

/* ---------- login ---------- */
app.post(
  "/api/auth/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erro: "Muitas tentativas. Aguarde alguns minutos." },
  }),
  h(async (req, res) => {
    const { usuario, senha } = req.body;
    const [[u]] = await pool.query("SELECT * FROM usuarios WHERE usuario = ?", [
      String(usuario || ""),
    ]);
    if (!u || !(await bcrypt.compare(String(senha || ""), u.senha_hash)))
      throw httpErr(401, "Usuário ou senha incorretos.");
    res.json({
      token: jwt.sign({ id: u.id, usuario: u.usuario }, JWT_SECRET, {
        expiresIn: "8h",
      }),
    });
  }),
);

/* ---------- chapas (admin) ---------- */
function lerChapa(req) {
  const nome = String(req.body.nome || "").trim();
  const numero = parseInt(req.body.numero, 10);
  const maximo = Math.pow(10, Number(DIGITOS)) - 1;
  if (!nome) throw httpErr(400, "Informe o nome da chapa.");
  if (!(numero >= 1 && numero <= maximo))
    throw httpErr(400, `O número deve ter até ${DIGITOS} dígitos.`);
  let ints;
  try {
    ints = JSON.parse(req.body.integrantes || "[]");
  } catch {
    throw httpErr(400, "Integrantes inválidos.");
  }
  if (!Array.isArray(ints) || !ints.length)
    throw httpErr(400, "Adicione pelo menos um integrante.");
  const files = Object.fromEntries(
    (req.files || []).map((f) => [f.fieldname, "/uploads/" + f.filename]),
  );
  return {
    nome,
    numero,
    foto: files.foto_chapa || fotoSegura(req.body.foto_atual),
    ints: ints.map((m, i) => {
      const n = String(m.nome || "").trim();
      if (!n) throw httpErr(400, "Todo integrante precisa de nome.");
      return {
        nome: n,
        cargo: String(m.cargo || "").trim() || null,
        foto: files["foto_integrante_" + i] || fotoSegura(m.foto),
      };
    }),
  };
}
const salvarIntegrantes = (c, chapaId, ints) =>
  c.query(
    "INSERT INTO integrantes (chapa_id, nome, cargo, foto, ordem) VALUES ?",
    [ints.map((m, i) => [chapaId, m.nome, m.cargo, m.foto, i])],
  );

app.get(
  "/api/chapas",
  auth,
  h(async (req, res) => res.json(await listarChapas())),
);

app.post(
  "/api/chapas",
  auth,
  upload.any(),
  h(async (req, res) => {
    const d = lerChapa(req);
    const id = await tx(async (c) => {
      const [r] = await c.query(
        "INSERT INTO chapas (nome, numero, foto) VALUES (?,?,?)",
        [d.nome, d.numero, d.foto],
      );
      await salvarIntegrantes(c, r.insertId, d.ints);
      return r.insertId;
    });
    res.status(201).json({ id });
  }),
);

app.put(
  "/api/chapas/:id",
  auth,
  upload.any(),
  h(async (req, res) => {
    const d = lerChapa(req),
      id = Number(req.params.id);
    await tx(async (c) => {
      const [r] = await c.query(
        "UPDATE chapas SET nome=?, numero=?, foto=? WHERE id=?",
        [d.nome, d.numero, d.foto, id],
      );
      if (!r.affectedRows) throw httpErr(404, "Chapa não encontrada.");
      await c.query("DELETE FROM integrantes WHERE chapa_id = ?", [id]);
      await salvarIntegrantes(c, id, d.ints);
    });
    res.json({ id });
  }),
);

app.delete(
  "/api/chapas/:id",
  auth,
  h(async (req, res) => {
    try {
      await pool.query("DELETE FROM chapas WHERE id = ?", [req.params.id]);
    } catch (e) {
      if (e.code === "ER_ROW_IS_REFERENCED_2")
        throw httpErr(
          409,
          "Esta chapa já recebeu votos e não pode ser excluída.",
        );
      throw e;
    }
    res.json({ ok: true });
  }),
);

/* ---------- alunos (admin) ---------- */
app.get(
  "/api/alunos",
  auth,
  h(async (req, res) => {
    const b = `%${String(req.query.busca || "").trim()}%`;
    const [rows] = await pool.query(
      "SELECT id, ra, nome, turma, votou FROM alunos WHERE ra LIKE ? OR nome LIKE ? ORDER BY nome LIMIT 500",
      [b, b],
    );
    res.json(rows);
  }),
);

// Aceita um aluno {nome, turma} ou vários {alunos: [...]}
app.post(
  "/api/alunos",
  auth,
  h(async (req, res) => {
    const lista = Array.isArray(req.body.alunos) ? req.body.alunos : [req.body];
    const rows = lista.map((a) => {
      const nome = normNome(a.nome);
      if (!nome)
        throw httpErr(400, `Dados inválidos para o nome "${a.nome || ""}".`);
      return [nome, String(a.turma || "").trim() || null];   // 2 valores
    });
    if (!rows.length) throw httpErr(400, "Nenhum aluno informado.");
    await pool.query(
      "INSERT INTO alunos (nome, turma) VALUES ? ON DUPLICATE KEY UPDATE nome = VALUES(nome), turma = VALUES(turma)",
      [rows],
    );
    res.status(201).json({ importados: rows.length });
  }),
);

app.delete(
  "/api/alunos/:id",
  auth,
  h(async (req, res) => {
    try {
      await pool.query("DELETE FROM alunos WHERE id = ? AND votou = 0", [
        req.params.id,
      ]);
    } catch (e) {
      if (e.code === "ER_ROW_IS_REFERENCED_2")
        throw httpErr(409, "Este aluno possui liberações registradas.");
      throw e;
    }
    res.json({ ok: true });
  }),
);

/* ---------- urnas e liberações (admin) ---------- */
app.get(
  "/api/urnas",
  auth,
  h(async (req, res) => {
    await expirarLiberacoes();
    const [rows] = await pool.query(`
    SELECT u.id, u.nome, l.id AS liberacao_id, a.nome AS aluno_nome,
           TIMESTAMPDIFF(SECOND, NOW(), l.expira_em) AS segundos
    FROM urnas u
    LEFT JOIN liberacoes l ON l.urna_id = u.id AND l.status = 'liberada'
    LEFT JOIN alunos a ON a.id = l.aluno_id
    WHERE u.ativa = 1 ORDER BY u.id`);
    res.json(rows);
  }),
);

// Buscar turmas cadastradas no sistema, para preencher o select de liberação
app.get(
  "/api/turmas",
  auth,
  h(async (req, res) => {
    const [rows] = await pool.query(
      "SELECT DISTINCT turma FROM alunos WHERE turma IS NOT NULL ORDER BY turma",
    );
    res.json(rows.map((r) => r.turma));
  }),
);

// Buscar lista de alunos por turma que ainda não votaram, para preencher o select de liberação
app.get(
  "/api/alunos/nao-votaram/:turma",
  auth,
  h(async (req, res) => {
    const turma = String(req.params.turma || "").trim();
    if (!turma) throw httpErr(400, "Informe a turma.");
    const [rows] = await pool.query(
      "SELECT id, ra, nome FROM alunos WHERE turma = ? AND votou = 0 ORDER BY nome",
      [turma],
    );
    res.json(rows);
  }),
);

// o mesário digita o Nome e a urna é desbloqueada
app.post(
  "/api/liberacoes",
  auth,
  h(async (req, res) => {
    const nome = String(req.body.nome || "").trim(),
      urnaId = Number(req.body.urna_id);
    if (!nome) throw httpErr(400, "Digite o nome do aluno.");
    const aluno = await tx(async (c) => {
      await expirarLiberacoes(c);
      const [[urna]] = await c.query(
        "SELECT id FROM urnas WHERE id = ? AND ativa = 1 FOR UPDATE",
        [urnaId],
      );
      if (!urna) throw httpErr(404, "Urna não encontrada.");
      const [[a]] = await c.query(
        "SELECT id, ra, nome, turma, votou FROM alunos WHERE nome = ? FOR UPDATE",
        [nome],
      );
      if (!a)
        throw httpErr(404, "Nome não encontrado. Confira o nome digitado.");
      if (a.votou) throw httpErr(409, `${a.nome} já votou.`);
      const [[ocupada]] = await c.query(
        "SELECT id FROM liberacoes WHERE urna_id = ? AND status = 'liberada'",
        [urnaId],
      );
      if (ocupada)
        throw httpErr(409, "Esta urna já está liberada para outro aluno.");
      const [[outra]] = await c.query(
        "SELECT id FROM liberacoes WHERE aluno_id = ? AND status = 'liberada'",
        [a.id],
      );
      if (outra)
        throw httpErr(409, "Este aluno já foi liberado em outra urna.");
      await c.query(
        "INSERT INTO liberacoes (urna_id, aluno_id, expira_em) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))",
        [urnaId, a.id, Number(LIBERACAO_SEGUNDOS)],
      );
      return a;
    });
    res
      .status(201)
      .json({ aluno: { ra: aluno.ra, nome: aluno.nome, turma: aluno.turma } });
  }),
);

app.delete(
  "/api/liberacoes/:id",
  auth,
  h(async (req, res) => {
    await pool.query(
      "UPDATE liberacoes SET status='cancelada', finalizada_em=NOW() WHERE id = ? AND status = 'liberada'",
      [req.params.id],
    );
    res.json({ ok: true });
  }),
);

app.get(
  "/api/resultados",
  auth,
  h(async (req, res) => {
    const [chapas] = await pool.query(`
    SELECT c.id, c.nome, c.numero, COUNT(v.id) AS votos
    FROM chapas c LEFT JOIN votos v ON v.chapa_id = c.id GROUP BY c.id ORDER BY votos DESC, c.numero`);
    const [tipos] = await pool.query(
      "SELECT tipo, COUNT(*) AS n FROM votos WHERE tipo <> 'chapa' GROUP BY tipo",
    );
    const [[tot]] = await pool.query("SELECT COUNT(*) AS total FROM votos");
    const [[al]] = await pool.query(
      "SELECT COUNT(*) AS total, COALESCE(SUM(votou), 0) AS votaram FROM alunos",
    );
    const n = (t) => Number(tipos.find((x) => x.tipo === t)?.n || 0);
    res.json({
      total: tot.total,
      chapas,
      brancos: n("branco"),
      nulos: n("nulo"),
      alunos: { total: al.total, votaram: Number(al.votaram) },
    });
  }),
);

/* ---------- API da urna ---------- */
const urnaAuth = h(async (req, res, next) => {
  const [[u]] = await pool.query(
    "SELECT id, nome FROM urnas WHERE chave = ? AND ativa = 1",
    [req.get("x-urna-key") || ""],
  );
  if (!u) throw httpErr(401, "Chave da urna inválida.");
  req.urna = u;
  next();
});

app.get(
  "/api/urna/status",
  urnaAuth,
  h(async (req, res) => {
    await expirarLiberacoes();
    const [[l]] = await pool.query(
      `
    SELECT l.id, a.nome, TIMESTAMPDIFF(SECOND, NOW(), l.expira_em) AS segundos
    FROM liberacoes l JOIN alunos a ON a.id = l.aluno_id
    WHERE l.urna_id = ? AND l.status = 'liberada' ORDER BY l.id DESC LIMIT 1`,
      [req.urna.id],
    );
    if (!l) return res.json({ estado: "bloqueada" });
    res.json({
      estado: "liberada",
      liberacao_id: l.id,
      aluno: l.nome.split(" ")[0],
      segundos: Math.max(0, l.segundos),
      digitos: Number(DIGITOS),
      chapas: await listarChapas(),
    });
  }),
);

app.post(
  "/api/urna/votar",
  urnaAuth,
  h(async (req, res) => {
    const { liberacao_id, tipo, numero } = req.body;
    await tx(async (c) => {
      const [[l]] = await c.query(
        "SELECT id, aluno_id FROM liberacoes WHERE id = ? AND urna_id = ? AND status = 'liberada' AND expira_em >= NOW() FOR UPDATE",
        [Number(liberacao_id), req.urna.id],
      );
      if (!l)
        throw httpErr(
          409,
          "A urna não está liberada. Peça ao mesário para liberar novamente.",
        );

      let tipoFinal,
        chapaId = null;
      if (tipo === "branco") tipoFinal = "branco";
      else {
        const n = parseInt(numero, 10);
        if (!(n >= 0)) throw httpErr(400, "Voto inválido.");
        const [[ch]] = await c.query("SELECT id FROM chapas WHERE numero = ?", [
          n,
        ]);
        if (ch) {
          tipoFinal = "chapa";
          chapaId = ch.id;
        } else tipoFinal = "nulo";
      }

      await c.query(
        "INSERT INTO votos (urna_id, chapa_id, tipo) VALUES (?,?,?)",
        [req.urna.id, chapaId, tipoFinal],
      );
      const [r] = await c.query(
        "UPDATE alunos SET votou = 1, votou_em = NOW() WHERE id = ? AND votou = 0",
        [l.aluno_id],
      );
      if (!r.affectedRows) throw httpErr(409, "Este aluno já votou.");
      await c.query(
        "UPDATE liberacoes SET status='concluida', finalizada_em=NOW() WHERE id = ?",
        [l.id],
      );
    });
    res.json({ ok: true });
  }),
);

/* ---------- páginas estáticas (cada uma em sua URL) ---------- */
const pub = path.join(__dirname, "..", "public");
if (process.env.SERVIR_PAINEL !== "false")
  app.use("/admin", express.static(path.join(pub, "admin")));
if (process.env.SERVIR_URNA !== "false")
  app.use("/urna", express.static(path.join(pub, "urna")));
app.get("/", (req, res) => res.redirect("/admin/"));

app.use("/api", (req, res) =>
  res.status(404).json({ erro: "Rota não encontrada." }),
);
app.use((err, req, res, next) => {
  if (err.code === "ER_DUP_ENTRY")
    return res
      .status(409)
      .json({ erro: "Já existe um registro com esse número ou RA." });
  if (err.code === "LIMIT_FILE_SIZE")
    return res
      .status(400)
      .json({ erro: "Cada imagem pode ter no máximo 3 MB." });
  const s = err.status || 500;
  if (s === 500) console.error(err);
  res
    .status(s)
    .json({ erro: s === 500 ? "Erro interno no servidor." : err.message });
});

app.listen(PORT, () => {
  console.log(`Servidor em http://localhost:${PORT}`);
  console.log(`  Painel: http://localhost:${PORT}/admin/`);
  console.log(`  Urna:   http://localhost:${PORT}/urna/`);
});
