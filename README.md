# 📖 README.md — Urna Eletrônica Grêmio Estudantil

```markdown
# 🗳️ Urna Eletrônica — Grêmio Estudantil

Sistema web completo de urna eletrônica para eleições de **Grêmio Estudantil**, com visual idêntico à urna oficial do TSE (modelo UE2009). Backend em **Python/Flask**, frontend em **HTML/CSS/JavaScript** e banco de dados **SQLite**.

Cada aluno vota **apenas uma vez**, com autenticação por matrícula, e pode escolher entre votar em um candidato, em branco ou anular o voto.

---

## 📑 Índice

1. [Funcionalidades](#-funcionalidades)
2. [Tecnologias](#-tecnologias)
3. [Estrutura do Projeto](#-estrutura-do-projeto)
4. [Instalação](#-instalação)
5. [Como Executar](#-como-executar)
6. [Como Usar](#-como-usar)
7. [Fluxo da Eleição](#-fluxo-da-eleição)
8. [Banco de Dados](#-banco-de-dados)
9. [API REST](#-api-rest)
10. [Painel Administrativo](#-painel-administrativo)
11. [Personalização](#-personalização)
12. [Segurança](#-segurança)
13. [Solução de Problemas](#-solução-de-problemas)
14. [Melhorias Futuras](#-melhorias-futuras)

---

## ✨ Funcionalidades

### 👤 Para o Aluno (Eleitor)
- ✅ Login por **matrícula** (identificação única)
- ✅ **Bloqueio de voto duplicado** — 1 voto por aluno, garantido no servidor
- ✅ Voto em **candidato** (digitando o número)
- ✅ Voto em **BRANCO**
- ✅ **Anulação** do próprio voto (número inexistente → voto nulo)
- ✅ Confirmação com tela **"FIM"** após votar
- ✅ Logout automático após 5 segundos (pronto para o próximo eleitor)
- ✅ Visual **idêntico à urna oficial UE2009**

### 🔐 Para o Administrador (Mesário)
- ✅ Login com senha
- ✅ Cadastro/remoção de **candidatos** (número, nome, chapa, vice)
- ✅ Cadastro/remoção de **alunos** autorizados (matrícula, nome, turma)
- ✅ **Encerrar / reabrir** a votação
- ✅ **Apuração em tempo real** com ranking
- ✅ Detecção automática do **candidato eleito**
- ✅ Contagem de **votos brancos e nulos**
- ✅ Estatísticas de **comparecimento** (votantes / aptos)
- ✅ **Reset completo** para nova eleição

### 🎨 Visuais
- ✅ Gabinete cinza metálico
- ✅ Tela com efeito **CRT / scanlines**
- ✅ Teclado numérico + botões coloridos (BRANCO, CORRIGE, CONFIRMA)
- ✅ Relógio em tempo real
- ✅ Mensagens dinâmicas (número errado, confirmação, etc.)
- ✅ Tela **FIM** em overlay

---

## 🛠 Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Backend | Python 3.8+ / Flask 3.0 |
| Banco de Dados | SQLite 3 |
| Frontend | HTML5, CSS3, JavaScript (Vanilla) |
| Sessão | Flask Session (cookies assinados) |
| Servidor | Werkzeug (embutido no Flask) |

---

## 📁 Estrutura do Projeto


urna_gremio/
├── app.py # Servidor Flask + rotas da API
├── database.py # Camada de acesso ao SQLite
├── requirements.txt # Dependências Python
├── README.md # Este arquivo
├── urna.db # Banco SQLite (criado automaticamente)
│
├── static/
│ ├── style.css # Visual completo da urna UE2009
│ └── script.js # Lógica do frontend (teclado, votação)
│
└── templates/
├── login.html # Tela de identificação do eleitor
├── urna.html # Interface da urna eletrônica
└── admin.html # Painel do administrador


---

## ⚙️ Instalação

### Pré-requisitos
- **Python 3.8 ou superior** → [python.org](https://www.python.org/downloads/)
- **pip** (gerenciador de pacotes, já vem com Python)

Verifique:
```bash
python --version
pip --version
```

### Passo a passo

**1. Clone ou crie a pasta do projeto:**
```bash
mkdir urna_gremio
cd urna_gremio
```

**2. Crie os arquivos** conforme a estrutura acima (`app.py`, `database.py`, etc.).

**3. (Recomendado) Crie um ambiente virtual:**
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux / macOS
python3 -m venv venv
source venv/bin/activate
```

**4. Instale as dependências:**
```bash
pip install -r requirements.txt
```

Ou manualmente:
```bash
pip install Flask==3.0.0
```

---

## ▶️ Como Executar

No terminal, dentro da pasta do projeto:

```bash
python app.py
```

Você verá algo como:
```
 * Running on http://0.0.0.0:5000
 * Debug mode: on
```

Abra no navegador:
```
http://localhost:5000
```

Para permitir acesso de **outros computadores na mesma rede** (ex.: várias urnas na escola), descubra o IP da máquina servidora:
```bash
# Windows
ipconfig

# Linux / macOS
ifconfig
```

E acesse de outros dispositivos via:
```
http://SEU_IP:5000
```

---

## 🎯 Como Usar

### 🔑 Credenciais Padrão (TROQUE EM PRODUÇÃO!)

| Tipo | Login | Senha |
|------|-------|-------|
| **Aluno** | `2024001`, `2024002`, `2024003`, `2024004`, `2024005` | — (só matrícula) |
| **Admin** | — | `admin123` |

### 👨‍🎓 Votando (aluno)

1. Abra `http://localhost:5000`
2. Digite a matrícula → **ENTRAR**
3. A urna aparece com a tela em branco
4. Digite o **número do candidato** (2 dígitos):
   - `10` → Ana Silva
   - `20` → Lucas Souza
   - `30` → Beatriz Alves
5. Escolha uma das opções:
   - 🟢 **CONFIRMA** → confirma o voto
   - ⚪ **BRANCO** → voto em branco
   - 🟠 **CORRIGE** → apaga e digita novamente
   - Digitar número inválido + CONFIRMA → **VOTO NULO**
6. Aparece a tela **"FIM"** → aguarde 5 segundos (volta ao login)

### 👨‍💼 Administrando (mesário)

Acesse: `http://localhost:5000/admin` → senha `admin123`

**Antes da eleição:**
- Cadastrar candidatos (nº, nome, chapa, vice)
- Cadastrar alunos (matrícula, nome, turma)

**Durante:**
- Acompanhar apuração em tempo real

**Depois:**
- Clicar em **ENCERRAR VOTAÇÃO**
- Conferir resultado final e candidato eleito
- Opcional: **RESETAR** para nova eleição

---

## 🔄 Fluxo da Eleição

```
┌──────────────────┐
│  ADMIN cadastra  │
│  alunos e cands. │
└────────┬─────────┘
         ▼
┌──────────────────┐
│  Aluno faz login │
│  (matrícula)     │
└────────┬─────────┘
         ▼
┌──────────────────┐      ┌──────────────┐
│  Vota (nº,       │──┬──▶│ Voto válido  │
│  branco ou nulo) │  │   └──────────────┘
└──────────────────┘  │   ┌──────────────┐
                      ├──▶│ Voto branco  │
                      │   └──────────────┘
                      │   ┌──────────────┐
                      └──▶│ Voto nulo    │
                          └──────────────┘
         ▼
┌──────────────────┐
│  Servidor marca  │
│  ja_votou = 1    │  ◀── impede voto duplicado
└────────┬─────────┘
         ▼
┌──────────────────┐
│  Tela "FIM" +    │
│  logout auto 5s  │
└────────┬─────────┘
         ▼
┌──────────────────┐
│  ADMIN encerra   │
│  e apura         │
└──────────────────┘
```

### 🔒 Como funciona o "1 voto por aluno"

1. Ao fazer login, o servidor verifica `ja_votou` na tabela `alunos`
2. Se `ja_votou = 1` → login recusado com mensagem "Esta matrícula já votou"
3. Ao registrar o voto, o servidor:
   - Grava na tabela `votos` (auditoria)
   - Marca `ja_votou = 1` no aluno
   - **Destrói a sessão** (impede reenvio)
4. Mesmo se o aluno tentar burlar o frontend, o **servidor revalida** tudo

---

## 🗄 Banco de Dados

O arquivo `urna.db` (SQLite) é criado automaticamente na primeira execução.

### Tabela `alunos`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `matricula` | TEXT (PK) | Matrícula única do aluno |
| `nome` | TEXT | Nome completo |
| `turma` | TEXT | Turma (ex.: 3ºA) |
| `ja_votou` | INTEGER | 0 = não votou, 1 = já votou |
| `data_voto` | TEXT | Data/hora ISO do voto |

### Tabela `candidatos`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `numero` | TEXT (PK) | Número de 2 dígitos |
| `nome` | TEXT | Nome do candidato |
| `chapa` | TEXT | Nome da chapa |
| `vice` | TEXT | Nome do vice |

### Tabela `votos`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INTEGER (PK) | Auto-incremento |
| `matricula` | TEXT | Quem votou |
| `numero` | TEXT | Nº do candidato (NULL = branco) |
| `tipo` | TEXT | `valido`, `branco` ou `nulo` |
| `data_hora` | TEXT | Timestamp ISO |

### Tabela `config`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `chave` | TEXT (PK) | Nome da configuração |
| `valor` | TEXT | Valor (ex.: `encerrada` = `0` ou `1`) |

---

## 🌐 API REST

Todas as rotas retornam JSON com o campo `ok: true|false`.

### Rotas do Eleitor

| Método | Rota | Corpo | Descrição |
|--------|------|-------|-----------|
| POST | `/api/login` | `{matricula}` | Autentica aluno |
| GET | `/api/candidatos` | — | Lista candidatos |
| POST | `/api/votar` | `{tipo, numero}` | Registra voto |
| POST | `/api/logout` | — | Encerra sessão |

**Exemplo — Login:**
```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"matricula": "2024001"}'
```
Resposta:
```json
{ "ok": true, "nome": "João Pereira", "turma": "3ºA" }
```

**Exemplo — Votar:**
```bash
curl -X POST http://localhost:5000/api/votar \
  -H "Content-Type: application/json" \
  -d '{"tipo": "valido", "numero": "10"}' \
  --cookie "session=..."
```
Resposta:
```json
{ "ok": true, "tipo": "valido", "nome": "Ana Silva" }
```

### Rotas do Administrador

| Método | Rota | Corpo | Descrição |
|--------|------|-------|-----------|
| POST | `/api/admin/login` | `{senha}` | Autentica admin |
| POST | `/api/admin/logout` | — | Sai do admin |
| GET | `/api/admin/apurar` | — | Resultado completo |
| GET | `/api/admin/status` | — | Status da eleição |
| POST | `/api/admin/encerrar` | — | Encerra votação |
| POST | `/api/admin/abrir` | — | Reabre votação |
| POST | `/api/admin/resetar` | — | Apaga votos |
| GET | `/api/admin/candidatos` | — | Lista candidatos |
| POST | `/api/admin/candidatos` | `{numero, nome, chapa, vice}` | Cadastra candidato |
| DELETE | `/api/admin/candidatos` | `{numero}` | Remove candidato |
| GET | `/api/admin/alunos` | — | Lista alunos |
| POST | `/api/admin/alunos` | `{matricula, nome, turma}` | Cadastra aluno |
| DELETE | `/api/admin/alunos` | `{matricula}` | Remove aluno |

**Exemplo — Apuração:**
```bash
curl http://localhost:5000/api/admin/apurar --cookie "session=..."
```
Resposta:
```json
{
  "ok": true,
  "resultado": [
    {"numero": "10", "nome": "Ana Silva", "chapa": "Juntos Somos Mais", "votos": 42},
    {"numero": "20", "nome": "Lucas Souza", "chapa": "Renova Grêmio", "votos": 31},
    {"numero": "30", "nome": "Beatriz Alves", "chapa": "Voz Estudantil", "votos": 18}
  ],
  "brancos": 5,
  "nulos": 3,
  "total_votos": 99,
  "votantes": 99,
  "aptos": 150,
  "eleito": {"numero": "10", "nome": "Ana Silva", "votos": 42}
}
```

---

## 🖥 Painel Administrativo

Acesse `http://localhost:5000/admin` e insira a senha (`admin123` por padrão).

**Seções disponíveis:**

1. **Status** — votação aberta/encerrada
2. **Candidatos** — cadastro com número, nome, chapa, vice
3. **Alunos** — cadastro de matrícula, nome, turma
4. **Apuração** — ranking com % e candidato eleito
5. **Ações** — encerrar, reabrir, resetar

> ⚠️ **Antes de encerrar**, faça backup de `urna.db`. Após o reset, os votos são apagados permanentemente.

---

## 🎨 Personalização

### Trocar candidatos manualmente

Edite `database.py` na função `init_db()`:
```python
cur.executemany("INSERT INTO candidatos VALUES (?,?,?,?)", [
    ("10", "Ana Silva", "Juntos Somos Mais", "Pedro Costa"),
    ("20", "Lucas Souza", "Renova Grêmio", "Marina Lima"),
])
```

### Trocar senha do admin

Em `app.py`:
```python
SENHA_ADMIN = "minhaSenhaSegura123"
```

### Trocar a chave secreta do Flask

Em `app.py` (importante para produção!):
```python
app.secret_key = "chave-aleatoria-longa-e-unica"
```

Para gerar uma chave forte:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Ajustar tempo de logout automático

Em `static/script.js`:
```javascript
setTimeout(() => { ... }, 5000);  // 5000 ms = 5 segundos
```

### Mudar cores/aparência

Edite `static/style.css` — todas as cores estão comentadas por seção. Os principais são:
- `.urna` — gabinete cinza
- `.tela` — cor de fundo da tela (creme)
- `.numero-display .dig` — dígitos
- `.confirma`, `.corrige`, `.branco` — botões coloridos

### Adicionar foto do candidato

1. Coloque a imagem em `static/fotos/10.jpg`
2. Em `static/script.js`, na função `atualizar()`:
```javascript
if (CANDIDATOS[numero]) {
  const c = CANDIDATOS[numero];
  document.querySelector(".foto-box").innerHTML =
    `<img src="/static/fotos/${numero}.jpg">`;
}
```

---

## 🔒 Segurança

### ✅ Já implementado
- Bloqueio de voto duplicado no **servidor** (não confia no cliente)
- Sessões assinadas por `secret_key`
- Encerramento de sessão após votar
- Validação de tipo de voto no servidor
- Revalidação de matrícula e status antes de gravar

### ⚠️ Recomendações para produção real

1. **Trocar a senha do admin** e usar **hash**:
   ```python
   from werkzeug.security import check_password_hash
   SENHA_HASH = generate_password_hash("senhaSegura")
   ```

2. **Trocar `secret_key`** por valor longo e aleatório.

3. **Usar HTTPS** — coloque atrás do **Nginx** ou **Gunicorn + Certbot**.

4. **Servidor WSGI dedicado** (não usar `flask run` em produção):
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:8000 app:app
   ```

5. **Backup automático** do `urna.db` a cada hora.

6. **Log de auditoria** — já existe via tabela `votos` (guarda matrícula + data_hora).

7. **Bloqueio por IP** ou **rate limit** no login para evitar força-bruta.

8. **Mesário presencial** — a urna real exige liberação manual. Aqui o mesário entrega o dispositivo já na tela de login.

---

## 🐛 Solução de Problemas

### "Port 5000 already in use"
Outro processo está usando a porta. Mude em `app.py`:
```python
app.run(host="0.0.0.0", port=5001, debug=True)
```

### "ModuleNotFoundError: No module named 'flask'"
Ambiente virtual não ativado ou Flask não instalado:
```bash
pip install -r requirements.txt
```

### "Esta matrícula já votou" mas o aluno não votou
O admin pode resetar o `ja_votou` do aluno específico abrindo `urna.db` no **DB Browser for SQLite** ou rodando:
```sql
UPDATE alunos SET ja_votou=0, data_voto=NULL WHERE matricula='2024001';
```

### Esqueci a senha do admin
Edite `app.py` e reinicie o servidor:
```python
SENHA_ADMIN = "novaSenha"
```

### Votos sumiram após reiniciar
Você rodou `resetar_eleicao()`. O banco é persistente — só apaga se você mandar.

### Página em branco / CSS não carrega
Verifique se a pasta `static/` está no lugar certo e se o `url_for('static', ...)` está funcionando. Recarregue com `Ctrl+F5` (cache).

### Preciso apagar tudo e começar do zero
```bash
# Pare o servidor e delete:
rm urna.db           # Linux/Mac
del urna.db          # Windows
python app.py        # recria com dados de exemplo
```

---

## 🚀 Melhorias Futuras

- [ ] **Foto do candidato** na tela da urna
- [ ] **Exportação de ata em PDF** (ReportLab)
- [ ] **Hash de senha** do admin (bcrypt)
- [ ] **Backend com PostgreSQL** para múltiplas urnas
- [ ] **Sincronização em tempo real** via WebSocket
- [ ] **Leitor de código de barras / QR** para login
- [ ] **Biometria simulada** (digital)
- [ ] **Relatório de comparecimento por turma**
- [ ] **Modo offline** (PWA)
- [ ] **Testes automatizados** (pytest)
- [ ] **Interface de acessibilidade** (leitor de tela, alto contraste)
- [ ] **Sons da urna** (bip do teclado, som de confirmação)

---

## 📄 Licença

Uso livre para fins educacionais. Sinta-se à vontade para adaptar para sua escola.

---

## 👥 Autores

Desenvolvido para eleições de **Grêmio Estudantil** — projeto educacional.

---

## 💬 Suporte

Encontrou um bug ou tem dúvida? Abra uma issue ou entre em contato com o desenvolvedor.

**Bom pleito! 🗳️✨**
```

---

## 📌 Como usar este README

1. Salve o conteúdo acima como **`README.md`** na raiz do projeto `urna_gremio/`.
2. No GitHub/GitLab, ele será renderizado automaticamente.
3. Para visualizar localmente: use **VS Code** com `Ctrl+Shift+V` sobre o arquivo.

Quer que eu complemente com algo específico? Posso adicionar:
- 📸 **Guia de prints/screenshots** (seções com imagens)
- 🔧 **Scripts de backup automático** (`backup.sh`)
- 📄 **Template de ata oficial** em PDF
- 🧪 **Testes automatizados** com pytest
- 🐳 **Dockerfile** para deploy

É só pedir!
