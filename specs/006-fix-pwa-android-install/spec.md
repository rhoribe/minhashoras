# Feature Specification: Correção da Instalação do PWA em Dispositivos Android

**Feature Branch**: `006-fix-pwa-android-install`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "o PWA no android nao esta dando a opcao de instalar , aparace anoa e possivel instalar o app"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instalação Confiável do Aplicativo em Dispositivos Android (Priority: P1) 🎯 MVP

Como trabalhador em regime de turnos ou usuário móvel acessando o Minhas Horas pelo celular Android,  
Quero conseguir instalar o aplicativo na tela inicial do meu smartphone sem mensagens de erro de instalação,  
Para que eu tenha acesso rápido, em tela cheia e com funcionamento confiável no meu dia a dia.

**Why this priority**: A impossibilidade de instalar o app no Android quebra o propósito central de uma aplicação Mobile-First PWA (Princípio I da Constituição). O erro "não é possível instalar o app" impede que os usuários utilizem a aplicação como app independente. Resolver essa falha restaura a experiência nativa fundamental.

**Independent Test**: Acessar a aplicação em um dispositivo ou emulador Android com navegador compatível, acionar a instalação pelo menu do navegador ou botão da interface e confirmar que o pacote da aplicação é gerado e instalado na tela inicial com ícone válido e abertura em modo standalone.

**Acceptance Scenarios**:

1. **Given** um usuário navegando no Minhas Horas em um smartphone Android via navegador compatível, **When** o usuário solicita a instalação do aplicativo pelo menu do navegador ou banner da interface, **Then** o sistema operacional exibe o diálogo nativo de confirmação de instalação com nome e ícone corretos, sem apresentar a mensagem "não é possível instalar o app".
2. **Given** que a instalação foi confirmada pelo usuário, **When** o processo de instalação é concluído, **Then** o ícone do Minhas Horas é adicionado à tela inicial e gaveta de aplicativos com proporções visuais nítidas (sem distorções ou cortes indevidos).
3. **Given** o aplicativo instalado no Android, **When** o usuário toca no ícone para abri-lo, **Then** a aplicação é executada em modo standalone (janela própria sem barra de endereços ou controles do navegador web) e com tela de carregamento (splash screen) coerente com o tema visual.

---

### User Story 2 - Banner e Gatilho Contextual de Instalação no PWA (Priority: P2)

Como usuário móvel navegando na aplicação antes de instalá-la,  
Quero ver um aviso claro e um botão destacado para instalar o app,  
Para que eu saiba imediatamente que o Minhas Horas pode ser instalado diretamente no meu celular sem precisar acessar uma loja de aplicativos.

**Why this priority**: Usuários que não conhecem o fluxo manual dos menus de navegadores móveis precisam de um gatilho direto e intuitivo para adicionar o app à tela inicial.

**Independent Test**: Acessar o site em modo web pela primeira vez e verificar a presença do banner com botão "Instalar". Ao clicar, o diálogo de instalação é aberto; após instalar ou dispensar, o banner não atrapalha a navegação.

**Acceptance Scenarios**:

1. **Given** um usuário que ainda não instalou o aplicativo acessando a aplicação via navegador, **When** a página inicial carrega e a plataforma sinaliza capacidade de instalação, **Then** um banner de instalação discreto e acessível é exibido na interface contendo o botão "Instalar".
2. **Given** o banner de instalação visível, **When** o usuário clica no botão "Instalar", **Then** o diálogo nativo de instalação do sistema é acionado imediatamente.
3. **Given** que o usuário já instalou o aplicativo e o abriu em modo standalone, **When** ele navega pelas telas do sistema, **Then** o banner de instalação não é exibido.
4. **Given** que o usuário fechou ou dispensou o banner de instalação, **When** ele continua navegando na mesma sessão, **Then** o banner permanece oculto para não prejudicar a ergonomia de uso.

---

### User Story 3 - Conformidade de Ativos Visuais e Ícones Adaptativos (Priority: P3)

Como usuário do aplicativo instalado em diferentes versões de sistemas operacionais móveis,  
Quero que o ícone do aplicativo se adapte harmoniosamente ao formato de ícones do meu celular (círculo, quadrado com cantos arredondados ou gota),  
Para que o visual do aplicativo seja polido e não apresente bordas brancas indesejadas ou distorções gráficas.

**Why this priority**: Sistemas Android modernos utilizam ícones adaptativos (*maskable icons*). Ícones sem resolução adequada ou sem zona de segurança geram rejeição na validação do sistema operacional ou ficam visualmente desagradáveis.

**Independent Test**: Inspecionar os ativos de ícones em diferentes resoluções exigidas (192x192 e 512x512 pixels com camada maskable) e verificar que atendem aos padrões de especificação visual de PWA.

**Acceptance Scenarios**:

1. **Given** a especificação de manifesto da aplicação, **When** os validadores de plataforma analisam os ícones declarados, **Then** todos os ícones apontam para arquivos gráficos com resolução e formato exatos correspondentes aos metadados (mínimo de 192x192 e 512x512 pixels reais).
2. **Given** um dispositivo Android com tema de ícones arredondado ou recortado, **When** o aplicativo é instalado, **Then** o ícone respeita a área de segurança central (*safe zone*) sem cortar o símbolo do Minhas Horas.

---

### Edge Cases

- **O usuário cancela o diálogo de instalação nativo**: O sistema deve manter a aplicação funcionando normalmente na aba do navegador sem travar ou emitir mensagens de erro espúrias.
- **O dispositivo está offline no momento da instalação**: A instalação deve ser viável caso os recursos essenciais do service worker já tenham sido armazenados em cache na primeira visita.
- **Armazenamento do dispositivo insuficiente**: Se o sistema operacional Android recusar a instalação por falta de espaço em disco, a interface deve continuar operável como aplicação web comum sem quebrar.
- **Navegador sem suporte a instalação automática (ex: navegadores embutidos em apps de redes sociais)**: A aplicação não deve tentar forçar a chamada de instalação nativa, mantendo opção informativa de como abrir no navegador padrão do aparelho.
- **Acesso direto via endereço IP local ou HTTP em rede doméstica**: A aplicação deve sinalizar de forma clara a necessidade de contexto seguro (HTTPS ou localhost) caso o navegador bloqueie a instalação por restrição de segurança de rede.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE fornecer um manifesto de aplicação web (`manifest.json` / `manifest.webmanifest`) contendo metadados completos em conformidade com os padrões W3C e requisitos de instalação de navegadores modernos.
- **FR-002**: O manifesto DEVE declarar identificador único (`id`), nome completo ("Minhas Horas - Banco de Horas"), nome curto ("Minhas Horas"), idioma correspondente à interface do usuário (`pt-BR`), cor de tema (`theme_color`), cor de fundo (`background_color`), modo de exibição independente (`display: standalone`) e orientação preferencial.
- **FR-003**: O sistema DEVE disponibilizar ícones de aplicação em formato PNG com dimensões reais e válidas que correspondam exatamente às declarações de resolução do manifesto (no mínimo ícone padrão de 192x192 pixels, ícone de alta resolução de 512x512 pixels e variante adaptativa *maskable* de 512x512 pixels com margem de segurança visual).
- **FR-004**: O documento HTML principal DEVE conter referências explícitas ao manifesto da aplicação web, favicons em formatos adequados e metatags para suporte a plataformas complementares (como Apple touch icons para iOS).
- **FR-005**: O sistema DEVE manter um Service Worker ativo com manipulador de requisições de rede (*fetch handler*) e estratégia de cache para ativos estáticos essenciais, garantindo que os critérios de elegibilidade para PWA sejam atendidos pelo navegador.
- **FR-006**: A interface de usuário DEVE capturar o evento de pré-instalação da plataforma móvel e disponibilizar um botão de instalação claro e com alvo de toque ergonômico (mínimo de 44x44 pixels, conforme Princípio I da Constituição).
- **FR-007**: O sistema DEVE detectar se a aplicação já está sendo executada em modo instalado (*standalone*) e, nesse caso, ocultar quaisquer avisos ou botões convidando para nova instalação.
- **FR-008**: Em caso de recusa ou cancelamento do diálogo pelo usuário, o sistema DEVE registrar a dispensa sem bloquear o fluxo de navegação ou emitir mensagens de falha indevidas.

---

### Key Entities *(include if feature involves data)*

- **Metadados de Instalação (PWA Manifest)**: Conjunto de propriedades descritivas da aplicação (nome, escopo, URL inicial, modo de exibição, cores e conjunto de ícones) entregues ao navegador para registro do aplicativo no sistema operacional.
- **Ativo de Ícone do Aplicativo**: Arquivos de imagem gráfica em resolução e proporções adequadas, utilizados para renderizar o ícone de atalho, telas de abertura (*splash screen*) e lista de tarefas ativas do sistema operacional móvel.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das tentativas de acionar a instalação em navegadores compatíveis no Android exibem o diálogo nativo do sistema operacional sem apresentar a mensagem de erro "não é possível instalar o app".
- **SC-002**: O manifesto e os critérios de auditoria de PWA (como verificação de instalabilidade do Lighthouse/Chrome DevTools) atingem status de aprovação total com zero advertências bloqueantes de ícones ou manifesto.
- **SC-003**: O tempo decorrido entre o toque no botão "Instalar" e a abertura do diálogo nativo do sistema operacional é inferior a 1 segundo.
- **SC-004**: O aplicativo instalado abre diretamente em modo de tela cheia/standalone em 100% dos dispositivos Android compatíveis testados, apresentando o ícone nítido na tela inicial.

---

## Assumptions

- O usuário acessa a aplicação através de um navegador móvel moderno com suporte a PWA (ex: Google Chrome, Samsung Internet, Microsoft Edge ou Mozilla Firefox para Android).
- A aplicação é servida através de um contexto seguro (HTTPS com certificado válido ou `localhost`), condição técnica obrigatória dos navegadores móveis para permitir a instalação de Service Workers e PWAs.
- O logotipo visual do Minhas Horas já existente no projeto será a base gráfica para a geração dos arquivos de ícone nos tamanhos reais exigidos.
