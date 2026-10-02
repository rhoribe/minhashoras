# Quickstart & Validation Guide: Correção da Instalação do PWA no Android

**Feature**: `006-fix-pwa-android-install`  
**Date**: 2026-10-02  
**Status**: Completed  

---

## 1. Pré-Requisitos

1. Node.js 20+ instalado.
2. Navegador móvel ou desktop moderno (Google Chrome, Microsoft Edge, Samsung Internet ou DevTools com emulação mobile).

---

## 2. Cenários de Validação

### Cenário 1: Auditoria de PWA no Chrome DevTools / Lighthouse
1. Iniciar o servidor de desenvolvimento ou produção (`npm run dev` ou `npm start`).
2. Abrir `http://localhost:3000` (ou IP da rede local via HTTPS) no Chrome.
3. Abrir **DevTools (F12) > Application > Manifest**:
   - Verificar se `name`, `short_name`, `start_url`, `id`, `display: standalone` estão presentes e válidos.
   - Verificar se os ícones `192x192` e `512x512` são carregados sem erros e se a prévia dos ícones normais e maskable é renderizada perfeitamente.
   - Na seção **Installability**, verificar se a mensagem indica: *"Page is installable"* sem erros de resolução de ícones.

### Cenário 2: Disparo de Instalação no Android
1. Acessar a aplicação através de um dispositivo Android via Chrome (em HTTPS ou localhost via port forwarding do `adb`).
2. Tocar no botão **"Instalar"** no banner exibido ou no menu do Chrome (`⋮ > Instalar aplicativo`).
3. **Resultado Esperado**: O sistema operacional Android exibe o diálogo nativo com o nome "Minhas Horas" e o ícone nítido. Ao confirmar, o aplicativo é instalado na tela inicial sem o erro *"Não é possível instalar o app"*.

### Cenário 3: Execução em Modo Standalone
1. Tocar no ícone do Minhas Horas na tela inicial do smartphone.
2. **Resultado Esperado**: A aplicação inicia com splash screen e abre em tela cheia (sem barra de URL do navegador). O banner de convite para instalação não é mais exibido.
