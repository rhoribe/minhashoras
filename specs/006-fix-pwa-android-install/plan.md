# Implementation Plan: Correção da Instalação do PWA em Dispositivos Android

**Branch**: `006-fix-pwa-android-install` | **Date**: 2026-10-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-fix-pwa-android-install/spec.md`

## Summary

Correção integral dos requisitos de instalabilidade de Progressive Web App (PWA) no sistema operacional Android. A solução gera ícones PNG em alta resolução (192x192 e 512x512) e variante adaptativa maskable (512x512) a partir do SVG oficial, substituindo os arquivos de 1x1 pixel que causam a rejeição do WebAPK pelo navegador, aprimora o manifesto com `id`, `lang`, `scope` e declarações estritas de ícones, adiciona metatags complementares para mobile e refina a captura e acionamento do evento `beforeinstallprompt` no componente `InstallPromptModal.vue`.

## Technical Context

**Language/Version**: TypeScript 5.7+ / Node.js 22 LTS / HTML5  
**Primary Dependencies**: Vue 3.5, Vite 6.4, vite-plugin-pwa 0.21, lucide-vue-next  
**Storage**: N/A (Frontend PWA metadata and static assets)  
**Testing**: Vitest 3.0 (verificação de manifesto, metatags HTML e integridade de dimensões dos arquivos de ícones)  
**Target Platform**: Android (Google Chrome, Samsung Internet, Microsoft Edge) e iOS (Safari)  
**Performance Goals**:
- Tempo de carregamento dos ícones precacheados < 200ms
- Instalação via diálogo nativo acionada em < 1s após clique no botão
**Constraints**:
- Princípio Constitucional I: PWA Mobile-First obrigatório com conformidade estrita de Web App Manifest e Service Worker
- Tamanho total dos ativos de ícones otimizado (< 100KB combinados) para conexões móveis

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio Constitucional | Verificação de Conformidade | Status |
|---|---|---|
| **I. Mobile-First & Cross-Platform PWA** | Corrige diretamente a instalabilidade nativa em Android e suporte no iOS; alvos de toque >= 44x44px; metatags padronizadas. | ✅ Aprovado |
| **II. Offline-First Operation & Deterministic Sync** | Ícones incluídos no precache do Service Worker para permitir instalação e splash screen mesmo em conexões lentas ou offline. | ✅ Aprovado |
| **III. Minimalist Architecture & Resource Efficiency** | Sem inclusão de bibliotecas runtime pesadas adicionais; geração de assets estáticos otimizados. | ✅ Aprovado |
| **IV. Reliable & Lightweight Database Persistence** | Sem impacto no banco relacional SQLite. | ✅ Aprovado |
| **V. Containerized Single-Node Deployment** | Os ativos compilados são servidos estaticamente pelo Fastify no container sem alterar a topologia de deployment. | ✅ Aprovado |

## Project Structure

### Documentation (this feature)

```text
specs/006-fix-pwa-android-install/
├── spec.md              # Especificação de requisitos e cenários
├── plan.md              # Este plano de implementação
├── research.md          # Diagnóstico técnico do WebAPK e decisões
├── quickstart.md        # Guia de validação da instalação no Android/navegadores
└── checklists/
    └── requirements.md  # Checklist de qualidade da especificação
```

### Source Code (repository root)

```text
client/
├── index.html                           # Inclusão de links de manifesto, apple-touch-icon e meta tags
├── vite.config.ts                       # Configuração de manifesto, id, lang, ícones e precache PWA
├── public/
│   └── icons/
│       ├── icon.svg                     # Vetor original fonte
│       ├── icon-192x192.png             # Ícone rasterizado real 192x192
│       ├── icon-512x512.png             # Ícone rasterizado real 512x512
│       └── icon-maskable-512x512.png    # Ícone adaptativo maskable 512x512 com safe zone
└── src/
    └── components/
        └── layout/
            └── InstallPromptModal.vue   # Feedback de instalação e manipulação do beforeinstallprompt

tests/
└── client/
    └── pwa-manifest.test.ts             # Teste automatizado de validação de manifesto e ícones
```

## Complexity Tracking

> Nenhuma complexidade desnecessária introduzida. A solução remove um defeito em ativos estáticos e metadados de configuração.
