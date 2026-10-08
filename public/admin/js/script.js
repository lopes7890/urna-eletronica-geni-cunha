const API = "/api"; // mesma origem. Se o painel for hospedado em outro host: 'http://servidor:3000/api'
const ORIGIN = API.replace(/\/api$/, "");
const $ = (s, e = document) => e.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const bg = (u) =>
  u ? `style="background-image:url('${esc(ORIGIN + u)}')"` : "";
const flash = (el, t, ok) => {
  el.textContent = t;
  el.classList.toggle("ok", !!ok);
};
let token = sessionStorage.getItem("token");

async function call(path, { method = "GET", json, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = "Bearer " + token;
  if (json) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }
  const r = await fetch(API + path, { method, headers, body });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && token) sair();
  if (!r.ok) throw new Error(d.erro || "Erro ao falar com o servidor.");
  return d;
}

/* login / abas */
function entrar() {
  $("#login").classList.add("hidden");
  $("#app").classList.remove("hidden");

  loadUrnas();
  loadTurmas();
}

function sair() {
  token = null;
  sessionStorage.removeItem("token");
  $("#app").classList.add("hidden");
  $("#login").classList.remove("hidden");
}
$("#sair").onclick = sair;
$("#f-login").onsubmit = async (e) => {
  e.preventDefault();
  flash($("#login-msg"), "");
  try {
    token = (
      await call("/auth/login", {
        method: "POST",
        json: { usuario: $("#usuario").value.trim(), senha: $("#senha").value },
      })
    ).token;
    sessionStorage.setItem("token", token);
    $("#senha").value = "";
    entrar();
  } catch (err) {
    flash($("#login-msg"), err.message);
  }
};
document.querySelectorAll("aside [data-tab]").forEach(
  (b) =>
    (b.onclick = () => {
      document
        .querySelectorAll("aside [data-tab]")
        .forEach((x) => x.classList.toggle("on", x === b));
      document
        .querySelectorAll(".tab")
        .forEach((t) =>
          t.classList.toggle("hidden", t.id !== "t-" + b.dataset.tab),
        );
      ({
        liberar: loadUrnas,
        chapas: loadChapas,
        alunos: loadAlunos,
        res: loadRes,
      })[b.dataset.tab]();
    }),
);

/* ===== liberar urna (validação por Nome) ===== */
async function loadUrnas() {
  try {
    const urnas = await call("/urnas");
    const sel = $("#sel-urna"),
      atual = sel.value;
    sel.innerHTML = urnas
      .map(
        (u) =>
          `<option value="${u.id}" ${u.liberacao_id ? "disabled" : ""}>${esc(u.nome)}${u.liberacao_id ? " (ocupada)" : ""}</option>`,
      )
      .join("");
    if (atual && !sel.querySelector(`[value="${atual}"]`)?.disabled)
      sel.value = atual;
    $("#urnas").innerHTML =
      urnas
        .map(
          (u) => `
      <div class="urna-card"><span class="dot ${u.liberacao_id ? "on" : ""}"></span>
        <div style="flex:1"><strong>${esc(u.nome)}</strong><br>
          <small>${u.liberacao_id ? `Liberada para ${esc(u.aluno_nome)} · expira em ${Math.max(0, u.segundos)}s` : "Bloqueada, aguardando liberação"}</small></div>
        ${u.liberacao_id ? `<button class="btn sec sm" data-cancel="${u.liberacao_id}">Cancelar liberação</button>` : ""}
      </div>`,
        )
        .join("") || '<div class="empty">Nenhuma urna ativa cadastrada.</div>';
  } catch (err) {
    flash($("#lib-msg"), err.message);
  }
}
$("#f-lib").onsubmit = async (e) => {
  e.preventDefault();
  flash($("#lib-msg"), "");
  try {
    const r = await call("/liberacoes", {
      method: "POST",
      json: { nome: $("#nome").value, urna_id: +$("#sel-urna").value },
    });
    flash(
      $("#lib-msg"),
      `Urna liberada para ${r.aluno.nome}${r.aluno.turma ? " (" + r.aluno.turma + ")" : ""}.`,
      true,
    );
    $("#nome").value = "";
    loadUrnas();
  } catch (err) {
    flash($("#lib-msg"), err.message);
  }
  $("#nome").focus();
};
$("#urnas").onclick = async (e) => {
  const id = e.target.dataset.cancel;
  if (!id) return;
  try {
    await call("/liberacoes/" + id, { method: "DELETE" });
    flash($("#lib-msg"), "Liberação cancelada.", true);
    loadUrnas();
  } catch (err) {
    flash($("#lib-msg"), err.message);
  }
};
setInterval(() => {
  if (token && !$("#t-liberar").classList.contains("hidden")) {
    loadUrnas();
    const turma = $("#turma").value;
    if (turma) loadNomes(turma, true);
  }
}, 3000);

/* ===== chapas ===== */
let editId = null,
  fotoFile = null,
  fotoAtual = "",
  membros = [];
const novoMembro = () => ({
  nome: "",
  cargo: "",
  file: null,
  url: "",
  prev: "",
});
function renderMembros() {
  $("#membros").innerHTML =
    membros
      .map(
        (m, i) => `
    <div class="mem" data-i="${i}">
      <label class="pick"><div class="thumb" ${m.prev ? `style="background-image:url('${m.prev}')"` : bg(m.url)}></div><input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Foto do integrante ${i + 1}"></label>
      <div><label>Nome</label><input type="text" class="m-nome" value="${esc(m.nome)}" required></div>
      <div><label>Cargo</label><input type="text" class="m-cargo" value="${esc(m.cargo)}" placeholder="Ex.: Presidente"></div>
      <button type="button" class="btn sec sm m-del">Remover</button>
    </div>`,
      )
      .join("") || '<div class="empty">Nenhum integrante adicionado.</div>';
}
$("#membros").oninput = (e) => {
  const i = e.target.closest(".mem")?.dataset.i;
  if (i == null) return;
  if (e.target.classList.contains("m-nome")) membros[i].nome = e.target.value;
  if (e.target.classList.contains("m-cargo")) membros[i].cargo = e.target.value;
};
$("#membros").onchange = (e) => {
  const i = e.target.closest(".mem")?.dataset.i,
    f = e.target.files?.[0];
  if (i != null && f) {
    membros[i].file = f;
    membros[i].prev = URL.createObjectURL(f);
    renderMembros();
  }
};
$("#membros").onclick = (e) => {
  if (e.target.classList.contains("m-del")) {
    membros.splice(e.target.closest(".mem").dataset.i, 1);
    renderMembros();
  }
};
$("#add-m").onclick = () => {
  membros.push(novoMembro());
  renderMembros();
};
$("#c-foto").onchange = (e) => {
  fotoFile = e.target.files[0] || null;
  if (fotoFile)
    $("#c-thumb").style.backgroundImage =
      `url('${URL.createObjectURL(fotoFile)}')`;
};

function resetChapa() {
  editId = null;
  fotoFile = null;
  fotoAtual = "";
  membros = [novoMembro()];
  $("#f-chapa").reset();
  $("#c-thumb").style.backgroundImage = "";
  $("#f-titulo").textContent = "Nova chapa";
  $("#cancelar").hidden = true;
  renderMembros();
}
$("#cancelar").onclick = resetChapa;
$("#f-chapa").onsubmit = async (e) => {
  e.preventDefault();
  flash($("#c-msg"), "");
  const fd = new FormData();
  fd.append("nome", $("#c-nome").value.trim());
  fd.append("numero", $("#c-num").value);
  fd.append("foto_atual", fotoAtual);
  fd.append(
    "integrantes",
    JSON.stringify(
      membros.map((m) => ({ nome: m.nome, cargo: m.cargo, foto: m.url })),
    ),
  );
  if (fotoFile) fd.append("foto_chapa", fotoFile);
  membros.forEach(
    (m, i) => m.file && fd.append("foto_integrante_" + i, m.file),
  );
  try {
    await call(editId ? "/chapas/" + editId : "/chapas", {
      method: editId ? "PUT" : "POST",
      body: fd,
    });
    resetChapa();
    loadChapas();
    flash($("#c-msg"), "Chapa salva.", true);
  } catch (err) {
    flash($("#c-msg"), err.message);
  }
};
let chapas = [];
async function loadChapas() {
  try {
    chapas = await call("/chapas");
    $("#l-chapas").innerHTML =
      chapas
        .map(
          (c) => `
      <div class="item" data-id="${c.id}"><div class="num">${c.numero}</div><div class="thumb" ${bg(c.foto)}></div>
        <div class="info"><h3>${esc(c.nome)}</h3><ul>${c.integrantes.map((m) => `<li>${esc(m.nome)}${m.cargo ? " · " + esc(m.cargo) : ""}</li>`).join("")}</ul></div>
        <button class="btn sec sm ed">Editar</button><button class="btn del sm rm">Excluir</button></div>`,
        )
        .join("") ||
      '<div class="empty">Nenhuma chapa cadastrada. Preencha o formulário acima.</div>';
  } catch (err) {
    flash($("#c-msg"), err.message);
  }
}
$("#l-chapas").onclick = async (e) => {
  const el = e.target.closest(".item");
  if (!el) return;
  const c = chapas.find((x) => String(x.id) === el.dataset.id);
  if (
    e.target.classList.contains("rm") &&
    confirm(`Excluir a chapa "${c.nome}"?`)
  ) {
    try {
      await call("/chapas/" + c.id, { method: "DELETE" });
      loadChapas();
    } catch (err) {
      alert(err.message);
    }
  }
  if (e.target.classList.contains("ed")) {
    editId = c.id;
    fotoFile = null;
    fotoAtual = c.foto || "";
    $("#c-nome").value = c.nome;
    $("#c-num").value = c.numero;
    $("#c-thumb").style.backgroundImage = c.foto
      ? `url('${ORIGIN + c.foto}')`
      : "";
    membros = c.integrantes.map((m) => ({
      ...novoMembro(),
      nome: m.nome,
      cargo: m.cargo || "",
      url: m.foto || "",
    }));
    $("#f-titulo").textContent = "Editar chapa";
    $("#cancelar").hidden = false;
    renderMembros();
    scrollTo({ top: 0, behavior: "smooth" });
  }
};

/* ===== alunos ===== */
async function loadAlunos() {
  try {
    const rows = await call(
      "/alunos?busca=" + encodeURIComponent($("#busca").value),
    );
    $("#l-alunos").innerHTML =
      rows
        .map(
          (a) => `
      <div class="item"><div class="info"><strong>${esc(a.nome)}</strong></div>
        <span class="tag ${a.votou ? "ok" : ""}">${a.votou ? "Já votou" : "Não votou"}</span>
        ${a.votou ? "" : `<button class="btn del sm" data-del="${a.id}">Excluir</button>`}</div>`,
        )
        .join("") || '<div class="empty">Nenhum aluno encontrado.</div>';
  } catch (err) {
    flash($("#a-msg"), err.message);
  }
}
$("#busca").oninput = loadAlunos;
$("#l-alunos").onclick = async (e) => {
  const id = e.target.dataset.del;
  if (id && confirm("Excluir este aluno?")) {
    try {
      await call("/alunos/" + id, { method: "DELETE" });
      loadAlunos();
    } catch (err) {
      alert(err.message);
    }
  }
};
$("#f-aluno").onsubmit = async (e) => {
  e.preventDefault();
  flash($("#a-msg"), "");
  try {
    await call("/alunos", {
      method: "POST",
      json: { nome: $("#a-nome").value, turma: $("#a-turma").value },
    });
    $("#a-nome").value = "";
    flash($("#a-msg"), "Aluno cadastrado.", true);
    loadAlunos();
  } catch (err) {
    flash($("#a-msg"), err.message);
  }
};
$("#importar").onclick = async () => {
  const alunos = $("#a-lote")
    .value.split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [ra, nome, turma] = l.split(/[;\t]/).map((s) => s.trim());
      return { ra, nome, turma };
    });
  try {
    const r = await call("/alunos", { method: "POST", json: { alunos } });
    $("#a-lote").value = "";
    flash($("#a-msg"), `${r.importados} aluno(s) importado(s).`, true);
    loadAlunos();
  } catch (err) {
    flash($("#a-msg"), err.message);
  }
};

export default async function loadTurmas() {
  try {
    const turmas = await call("/turmas");

    $("#turma").innerHTML = turmas
      .map((t) => `<option value="${esc(t)}">${esc(t)}</option>`)
      .join("");

    if (turmas.length > 0) {
      loadNomes($("#turma").value);
    } else {
      $("#nome").innerHTML =
        '<option value="">Nenhum aluno encontrado</option>';
    }
  } catch (err) {
    flash($("#lib-msg"), err.message);
  }
}

$("#turma").onchange = () => {
  loadNomes($("#turma").value);
};

async function loadNomes(turma, manterSelecao = false) {
  try {
    const nomes = await call(
      "/alunos/nao-votaram/" + encodeURIComponent(turma),
    );

    const sel = $("#nome");
    const atual = sel.value;
    const novos = nomes.map((n) => n.nome);
    const atuais = Array.from(sel.options)
      .map((o) => o.value)
      .filter(Boolean);

    // Nada mudou: não reconstrói o <select> (evita perder foco/seleção a cada 3s)
    if (
      novos.length === atuais.length &&
      novos.every((n, i) => n === atuais[i])
    )
      return;

    sel.innerHTML = novos.length
      ? novos
          .map((n) => `<option value="${esc(n)}">${esc(n)}</option>`)
          .join("")
      : '<option value="">Nenhum aluno pendente</option>';

    // Tenta manter a seleção do mesário se o nome ainda existir
    if (manterSelecao && atual && novos.includes(atual)) sel.value = atual;
  } catch (err) {
    flash($("#lib-msg"), err.message);
  }
}

/* ===== resultados ===== */
async function loadRes() {
  try {
    const r = await call("/resultados"),
      pct = (n) => (r.total ? Math.round((n / r.total) * 100) : 0);
    const bar = (l, n, g) =>
      `<div class="bar"><div class="top"><span>${esc(l)}</span><span>${n} (${pct(n)}%)</span></div><div class="track"><div class="fill ${g ? "gray" : ""}" style="width:${pct(n)}%"></div></div></div>`;
    $("#l-res").innerHTML =
      `<strong>Votos: ${r.total}</strong> · Comparecimento: ${r.alunos.votaram} de ${r.alunos.total} alunos` +
      r.chapas.map((c) => bar(`${c.numero} · ${c.nome}`, c.votos)).join("") +
      bar("Brancos", r.brancos, 1) +
      bar("Nulos", r.nulos, 1);
  } catch (err) {
    $("#l-res").innerHTML = `<div class="msg">${esc(err.message)}</div>`;
  }
}
$("#atualizar").onclick = loadRes;
resetChapa();
if (token) entrar();
