// Se a urna rodar em outro computador/endereço, aponte para o servidor. Ex.: 'http://192.168.0.10:3000'
// (e inclua a origem desta página em CORS_ORIGINS no .env do servidor)
const API_URL = "";
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
  u ? `style="background-image:url('${esc(API_URL + u)}')"` : "";

let chave = localStorage.getItem("urna_chave") || "";
let fase = "bloqueada"; // bloqueada | votando | branco | fim
let lib = null,
  aluno = "",
  segundos = 0,
  digitos = 2,
  chapas = [],
  digits = "",
  aviso = "";

$("#pad").innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]
  .map(
    (n) =>
      `<button class="key ${n === 0 ? "z" : ""}" data-k="${n}">${n}</button>`,
  )
  .join("");

async function api(path, body) {
  const r = await fetch(API_URL + "/api/urna/" + path, {
    method: body ? "POST" : "GET",
    headers: {
      "x-urna-key": chave,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) {
    localStorage.removeItem("urna_chave");
    chave = "";
  }
  if (!r.ok)
    throw Object.assign(new Error(d.erro || "Erro no servidor."), {
      status: r.status,
    });
  return d;
}

function beep(f = 880, d = 0.12) {
  try {
    const a = (beep.c ||= new (
        window.AudioContext || window.webkitAudioContext
      )()),
      o = a.createOscillator(),
      g = a.createGain();
    o.frequency.value = f;
    g.gain.value = 0.08;
    o.connect(g);
    g.connect(a.destination);
    o.start();
    o.stop(a.currentTime + d);
  } catch {}
}
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function bloquear(msg = "") {
  fase = "bloqueada";
  lib = null;
  digits = "";
  aviso = msg;
  render();
}

/* consulta o servidor: é ele que decide quando a urna está liberada */
async function tick() {
  if (!chave || fase === "fim") return;
  try {
    const d = await api("status");
    if (d.estado === "liberada") {
      if (d.liberacao_id !== lib) {
        // nova liberação
        lib = d.liberacao_id;
        chapas = d.chapas;
        digitos = d.digitos;
        digits = "";
        fase = "votando";
        aviso = "";
        beep(660, 0.25);
      }
      aluno = d.aluno;
      segundos = d.segundos;
      render();
    } else if (fase !== "bloqueada")
      bloquear("Liberação encerrada. Aguarde nova liberação.");
    else if (aviso.startsWith("Sem conexão")) {
      aviso = "";
      render();
    }
  } catch (e) {
    if (e.status === 401) render();
    else {
      aviso = "Sem conexão com o servidor.";
      render();
    }
  }
}
setInterval(tick, 2000);
setInterval(() => {
  if (fase === "votando" || fase === "branco") {
    segundos = Math.max(0, segundos - 1);
    const t = $("#timer");
    if (t) t.textContent = mmss(segundos);
  }
}, 1000);

function render() {
  const t = $("#tela"),
    travada = fase === "bloqueada" || fase === "fim";
  document
    .querySelectorAll(".key")
    .forEach((k) => (k.disabled = travada || !chave));
  if (!chave) {
    t.innerHTML = `<form class="setup" id="f-chave"><div class="big" style="font-size:26px">Configurar urna</div>
      <input type="password" id="i-chave" placeholder="Chave da urna" autocomplete="off" required><button>Conectar</button>
      <div class="aviso" style="margin-top:10px">${esc(aviso)}</div></form>`;
    $("#f-chave").onsubmit = (e) => {
      e.preventDefault();
      chave = $("#i-chave").value.trim();
      localStorage.setItem("urna_chave", chave);
      aviso = "";
      render();
      tick();
    };
    return;
  }
  if (fase === "fim") {
    t.innerHTML =
      '<div class="big fim">FIM</div><div class="foot" style="text-align:center">Seu voto foi registrado.</div>';
    return;
  }
  if (fase === "bloqueada") {
    t.innerHTML = `<div class="big">URNA BLOQUEADA<small>Aguardando liberação pelo mesário.</small></div><div class="aviso">${esc(aviso)}</div>`;
    return;
  }
  const boxes = Array.from(
    { length: digitos },
    (_, i) => `<div class="digit">${digits[i] ?? ""}</div>`,
  ).join("");
  let body = "",
    foot = "Digite o número da chapa.";
  if (fase === "branco") {
    body = '<div class="big">VOTO EM BRANCO</div>';
    foot = "CONFIRMA para votar ou CORRIGE para voltar.";
  } else if (digits.length === digitos) {
    const c = chapas.find((x) => x.numero === parseInt(digits, 10));
    foot = "CONFIRMA para votar ou CORRIGE para recomeçar.";
    body = c
      ? `<div class="cand"><div class="pic" ${bg(c.foto)}></div><div><h2>${esc(c.nome)}</h2>
      <ul class="mems">${c.integrantes.map((m) => `<li><strong>${esc(m.nome)}</strong>${m.cargo ? " · " + esc(m.cargo) : ""}</li>`).join("")}</ul></div></div>`
      : '<div><div class="alert">NÚMERO ERRADO</div><div class="alert">VOTO NULO</div></div>';
  }
  t.innerHTML = `<div class="head"><span>${fase === "branco" ? "" : "Seu voto para"}</span><span>${esc(aluno)} · <span id="timer">${mmss(segundos)}</span></span></div>
    ${fase === "branco" ? "" : `<div class="digits">${boxes}</div>`}${body || '<div style="flex:1"></div>'}
    <div class="aviso">${esc(aviso)}</div><div class="foot">${foot}</div>`;
}

async function confirmar() {
  let corpo;
  if (fase === "branco") corpo = { tipo: "branco" };
  else if (digits.length === digitos)
    corpo = { tipo: "numero", numero: parseInt(digits, 10) };
  else return beep(200, 0.2);
  try {
    await api("votar", { liberacao_id: lib, ...corpo });
    fase = "fim";
    render();
    beep(660, 0.6);
    setTimeout(() => bloquear(), 3500);
  } catch (e) {
    if (e.status === 409) bloquear(e.message);
    else {
      aviso = e.message;
      render();
    }
  }
}

function tecla(k) {
  if (fase !== "votando" && fase !== "branco") return;
  if (/^\d$/.test(k)) {
    if (fase === "votando" && digits.length < digitos) {
      digits += k;
      aviso = "";
      beep();
      render();
    }
  } else if (k === "branco") {
    if (!digits) {
      fase = "branco";
      beep();
      render();
    } else beep(200, 0.2);
  } else if (k === "corrige") {
    digits = "";
    fase = "votando";
    beep(500);
    render();
  } else if (k === "confirma") confirmar();
}
document.addEventListener("click", (e) => {
  const k = e.target.closest("[data-k]")?.dataset.k;
  if (k) tecla(k);
});
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  if (/^\d$/.test(e.key)) tecla(e.key);
  else if (e.key === "Enter") tecla("confirma");
  else if (e.key === "Backspace") tecla("corrige");
});

render();
tick();
