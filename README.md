# Minhas Horas ⏱️

> Aplicativo Web Mobile-First e Progressive Web App (PWA) para registro de horas extras, cálculo inteligente de banco de horas (positivo/negativo), pré-agendamento de folgas/compensações, auditoria multi-usuário e exportação de relatórios em PDF, Excel (XLSX) e CSV.

O **Minhas Horas** foi projetado com foco em **arquitetura minimalista**, **baixo consumo de recursos** (< 60MB de memória RAM ociosa, limite de 150MB em contêiner), **operação offline-first** e **segurança por padrão**, sendo ideal para implantação em servidores domésticos ou edge (como **Raspberry Pi 3/4/5**) usando **Docker** e **Docker Compose**.

---

## 🔑 Primeiro Acesso (Administrador Padrão)

Ao inicializar o sistema pela primeira vez, uma conta de administrador padrão é provisionada automaticamente:

| Campo | Valor Padrão |
|---|---|
| **Usuário** | `admin` |
| **Senha Temporária** | `admin123` |
| **Perfil** | Administrador (`admin`) |

> [!IMPORTANT]
> **Troca Obrigatória de Senha no Primeiro Login**:
> Por motivos de segurança, ao realizar o primeiro login com a conta `admin`, o sistema direciona automaticamente para a tela de alteração de senha. O acesso ao painel de controle e a qualquer funcionalidade operacional fica bloqueado até que uma nova senha segura (mínimo de 8 caracteres contendo letras e números) seja cadastrada.

---

## 🌟 Principais Recursos

### 📱 Mobile-First & PWA
- **Interface Ergonômica**: Barra de navegação inferior (*bottom navigation*), botões e alvos de toque com dimensionamento mínimo confortável de $44 \times 44\text{ px}$.
- **Instalação Nativa**: Pode ser instalado como aplicativo independente no Android (Google Chrome/Samsung Internet) e iOS (Safari), operando em tela cheia (*standalone*).
- **Tema Claro / Escuro / Automático**: Alternância dinâmica de tema integrada às preferências do sistema operacional.

### ⚡ Offline-First & Sincronização Determinística
- **Operação Desconectada**: Crie, edite e consulte seus registros mesmo em locais sem internet; os dados são salvos localmente no navegador via **IndexedDB (Dexie.js)**.
- **Sincronização em Lote**: Ao restabelecer a conexão de rede, o aplicativo sincroniza automaticamente as alterações locais com o servidor de forma idempotente e silenciosa.

### 👥 Multi-Usuário & Gestão de Acessos (RBAC)
- **Isolamento Completo**: Cada usuário autenticado visualiza e gerencia exclusivamente os seus próprios registros, compensações e preferências.
- **Fronteira de Privilégios no Autocadastro**: O cadastro público (`Criar Conta`) atribui estritamente a permissão de usuário padrão (`role: 'user'`), blindando o sistema contra qualquer tentativa de escalada de privilégios.
- **Exclusão de Conta pelo Próprio Usuário (*Self-Service Delete*)**: Qualquer usuário comum pode, a partir da tela de Configurações, solicitar a exclusão definitiva de sua conta. O processo é atômico: limpa todos os apontamentos, compensações e limites do servidor, limpa o IndexedDB local deste dispositivo e encerra a sessão.
- **Proteção contra Lockout (*Sole Admin Protection*)**: O sistema impede que o único administrador ativo exclua a própria conta, garantindo que o servidor nunca fique sem gestão.

### 🛡️ Painel Administrativo & Governança
- **Gestão de Usuários**: Ativação/desativação de contas, redefinição de senhas e promoção de perfis.
- **Métricas Globais do Sistema**: Visualização consolidada de usuários ativos, total de horas extras registradas, total de minutos de compensação e saldo líquido.
- **Auditoria de Acessos**: Histórico de eventos de segurança (sucessos de login, falhas de autenticação, logouts, trocas de senha e exclusões) com registro de IP e User-Agent.
- **Restauração de Fábrica (*Reset do Sistema*)**: Ferramenta de reinicialização completa para zerar o banco de dados e recomeçar do início, exigindo confirmação com chave de segurança (`ZERAR-BASE-MINHASHORAS`) e opção de apagar ou manter arquivos de backup.

### ⏱️ Banco de Horas (+/-) & Compensações
- **Virada Noturna Automática**: Cálculo preciso de turnos que iniciam em um dia e terminam na madrugada do dia seguinte (cálculo de 24h contínuo).
- **Saldo Consolidado e Projetado**: Acompanhe o saldo atual e o impacto futuro de compensações e folgas pré-agendadas.
- **Alertas de Segurança**: Alertas preventivos (gatilho configurável, padrão 80%) e avisos críticos quando o teto de horas acumuladas é atingido.

### 📑 Relatórios Multi-Formato
- **Extratos em PDF**: Documento formatado pronto para impressão e assinatura com resumo mensal e tabela de apontamentos.
- **Planilhas Excel (.xlsx)**: Exportação com formatação profissional, cores temáticas e fórmulas automáticas de totalização.
- **Arquivo CSV**: Exportação universal compatível com o padrão RFC 4180.

### 💾 Backup Externo & Restauração Segura
- **Snapshots Consistentes Online**: Cópia pontual sem interrupção do banco SQLite, compactada via gzip (`.sqlite.gz`).
- **Integridade & Checksum SHA-256**: Validação estrutural com `PRAGMA integrity_check` e cálculo de hash para auditoria.
- **Rotinas Automáticas**: Agendamento de rotinas diárias, semanais ou mensais com política de rotação de retenção (ex: manter apenas os 7 backups mais recentes).
- **Restauração Segura**: Restauração com geração automática de snapshot de segurança antes da substituição da base ativa.

---

## 📲 Como Instalar o Aplicativo (PWA)

O Minhas Horas é um Progressive Web App (PWA) instalável diretamente pelo navegador do smartphone ou computador:

### No Android (Google Chrome, Edge, Samsung Internet)
1. Acesse o Minhas Horas pelo navegador no smartphone.
2. Toque no botão **"Instalar Aplicativo"** no banner exibido (ou acesse o menu `⋮ > Instalar aplicativo` / `Adicionar à tela inicial`).
3. Confirme a instalação. O ícone do app aparecerá na sua tela inicial e abrirá em modo nativo independente.

### No iPhone / iPad (iOS Safari)
1. Abra o Safari e navegue até o endereço da aplicação.
2. Toque no botão **Compartilhar** (ícone de quadrado com seta para cima na barra inferior).
3. Role as opções e selecione **Adicionar à Tela de Início**, confirmando em **Adicionar**.

---

## 🚀 Como Executar com Docker & Docker Compose (Raspberry Pi / Servidor)

### 1. Pré-requisitos
- Docker Engine 24+ e Docker Compose v2 instalados no host (compatível com arquiteturas `arm64`, `armv7` e `amd64`).

### 2. Implantação Rápida
Clone este repositório no seu servidor ou Raspberry Pi e inicie o serviço:

```bash
# Iniciar a aplicação em segundo plano com build do contêiner
docker compose up -d --build
```

A aplicação estará disponível em `http://<IP-DO-SERVIDOR>:3000`.

### 3. Persistência de Dados e Mapeamento de Volumes
O arquivo `docker-compose.yml` configura dois volumes principais:
- `minhashoras-data`: Onde fica armazenado o banco SQLite (`/data/minhashoras.db`) operando em modo WAL (`PRAGMA journal_mode = WAL;`) e `synchronous = NORMAL`, otimizando a performance e preservando a vida útil de cartões microSD.
- `minhashoras-backups`: Onde são gravados os arquivos `.sqlite.gz` gerados pelos backups manuais e rotinas agendadas.

#### Exemplo de Mapeamento para HD Externo ou Pendrive
Para direcionar os backups diretamente a uma mídia externa conectada ao Raspberry Pi (exemplo: `/mnt/meu-hd-externo/backups`):

```yaml
services:
  app:
    environment:
      - BACKUP_DIR=/backups
    volumes:
      - minhashoras-data:/data
      - /mnt/meu-hd-externo/backups:/backups
```

---

## 🛠️ Desenvolvimento Local

### Pré-requisitos
- Node.js 20 LTS ou superior
- npm 10+

### Instalação de Dependências
```bash
npm install
```

### Executar Migrações do Banco de Dados
```bash
npm run db:migrate
```

### Iniciar em Modo de Desenvolvimento (Hot Module Reload)
Inicia o servidor backend Fastify e o frontend Vite concorrentemente:
```bash
npm run dev
```
- **Frontend SPA**: `http://localhost:3000`
- **Backend API**: `http://localhost:3000/api/v1` (com proxy automático configurado no Vite)

### Executar a Suíte de Testes
Executa todos os testes unitários, de contrato, de isolamento entre usuários e de RBAC via Vitest:
```bash
npm test
```

### Compilação de Produção
Compila o frontend Vue com Vite e o backend TypeScript:
```bash
npm run build
npm start
```

---

## 📐 Estrutura do Projeto

```text
minhashoras/
├── client/                     # Frontend Vue 3 + Tailwind CSS + PWA
│   ├── public/manifest.webmanifest
│   ├── src/
│   │   ├── components/         # Componentes ergonômicos (records, balance, layout, etc.)
│   │   ├── views/              # Telas da SPA:
│   │   │   ├── DashboardView.vue        # Resumo de saldo, alertas e ações rápidas
│   │   │   ├── RecordsView.vue          # Histórico e inclusão/edição de apontamentos
│   │   │   ├── CompensationsView.vue    # Agendamento e status de folgas compensatórias
│   │   │   ├── ReportsView.vue          # Emissão de PDF, Excel e CSV
│   │   │   ├── SettingsView.vue         # Limites, temas, backups e exclusão de conta
│   │   │   ├── LoginView.vue            # Autenticação e autocadastro público
│   │   │   ├── AdminView.vue            # Gestão de usuários, métricas e reset
│   │   │   └── ChangePasswordView.vue   # Redefinição obrigatória de primeiro acesso
│   │   └── services/           # Camada de comunicação, IndexedDB (Dexie) e Auth
│   └── vite.config.ts          # Configuração Vite com plugin PWA
├── server/                     # Backend Fastify + TypeScript + SQLite
│   ├── src/
│   │   ├── db/                 # Conexão better-sqlite3 e migrações versionadas
│   │   ├── repositories/       # Acesso a dados (usuários, sessões, registros, backups)
│   │   ├── routes/             # Endpoints REST (auth, admin, records, balance, backup)
│   │   └── services/           # Regras de negócio, cálculos, criptografia e relatórios
│   └── tests/                  # Suíte de testes automatizados com Vitest
├── docker-compose.yml          # Definição pronta para deploy
└── Dockerfile                  # Build multi-stage para Linux ARM64/AMD64
```

---

## 📜 Licença

Distribuído sob a licença **MIT**. Consulte `LICENSE` para mais informações.
