# Research & Architectural Decisions: Correção da Instalação do PWA em Dispositivos Android

**Feature**: `006-fix-pwa-android-install`  
**Date**: 2026-10-02  
**Status**: Completed  

---

## 1. Causa Raiz do Erro "Não é possível instalar o app" no Android

### Contexto
Usuários que tentam instalar o aplicativo no Google Chrome ou navegadores baseados em Chromium no Android recebem uma notificação de falha ("Não é possível instalar o app") ou não têm a opção de instalação habilitada.

### Diagnóstico Técnico
No Android, os navegadores modernos (Google Chrome, Samsung Internet, Edge) utilizam o serviço **WebAPK** do Google Play Services ou o instalador nativo do sistema para empacotar o PWA como um APK real instalado no sistema operacional.
Para que a geração do WebAPK seja bem-sucedida, o navegador exige:
1. Um manifesto Web App válido com `name` ou `short_name`, `start_url`, `display: standalone` e `icons`.
2. O manifesto declara ícones de tamanhos `192x192` e `512x512`.
3. **Falha Crítica Identificada**: Os arquivos físicos em `client/public/icons/icon-192x192.png` e `client/public/icons/icon-512x512.png` possuem apenas 1x1 pixel de dimensão real (70 bytes cada).
4. Quando o serviço WebAPK tenta decodificar as imagens declaradas para gerar o pacote do app e a splash screen nativa, a validação de resolução falha ou é rejeitada, abortando a instalação e disparando o erro "Não é possível instalar o app".

### Decisão
Gerar ícones PNG reais e válidos com as dimensões exatas de 192x192 pixels e 512x512 pixels a partir do SVG vetorial oficial do projeto (`client/public/icons/icon.svg`), incluindo uma variante maskable de 512x512 com margem de segurança (safe zone de 10-15%) para adaptação aos formatos de ícone do Android.

### Rationale
- Elimina o motivo principal de rejeição do WebAPK pelo Android.
- Assegura ícone nítido na tela inicial, gaveta de aplicativos e splash screen de carregamento.
- Totalmente compatível com as diretrizes do Lighthouse e W3C PWA.

---

## 2. Configuração do Manifesto PWA (`manifest.webmanifest`)

### Contexto
O manifesto gerado pelo `vite-plugin-pwa` em `client/vite.config.ts` precisa cumprir com rigor as especificações mais recentes do Chromium e Safari.

### Decisão
1. Definir explicitamente:
   - `id: "/"` (identificador único persistente do app).
   - `start_url: "/"` e `scope: "/"`.
   - `lang: "pt-BR"` (alinhado com o idioma da aplicação, corrigindo `"en"` padrão).
   - `display: "standalone"`.
   - `theme_color: "#16a34a"` e `background_color: "#0f172a"`.
   - Ícones:
     - `icon-192x192.png`: 192x192, `image/png`, `purpose: "any"`.
     - `icon-512x512.png`: 512x512, `image/png`, `purpose: "any"`.
     - `icon-maskable-512x512.png`: 512x512, `image/png`, `purpose: "maskable"`.
2. Adicionar links no `client/index.html`:
   - `<link rel="apple-touch-icon" href="/icons/icon-192x192.png" />`
   - `<link rel="manifest" href="/manifest.webmanifest" />`
   - `<meta name="mobile-web-app-capable" content="yes" />`

---

## 3. Comportamento do Banner de Instalação e Evento `beforeinstallprompt`

### Contexto
O componente `InstallPromptModal.vue` escuta o evento `beforeinstallprompt`. Caso o evento seja disparado, o banner exibe "Instalar".

### Decisão
Manter e refinar `InstallPromptModal.vue`:
1. Capturar e reter a referência de `beforeinstallprompt`.
2. Chamar `prompt()` ao clique do usuário em "Instalar".
3. Aguardar `userChoice` e ocultar o banner ao aceitar ou dispensar.
4. Detectar o modo `display-mode: standalone` para ocultar o banner quando o app já estiver instalado.
