# Feature Specification: Sincronização Confiável e Status Online/Offline

**Feature Branch**: `004-fix-sync-and-status`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "o sincornismo nao esta funcionando corretamente uando deleto um registro ou altero a alteracao noa e realizada , tambem quero que volte a ter o status no app informando quando ele esta online e offline"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sincronização Confiável de Exclusões de Registros (Priority: P1)

Como trabalhador gerenciando meu banco de horas, quero que a exclusão de um registro de hora extra ou compensação seja removida imediatamente do meu histórico e permanentemente sincronizada com o armazenamento central, para que os itens excluídos não reapareçam no aplicativo ao reconectar ou atualizar os dados.

**Why this priority**: Exclusões não sincronizadas corrompem o saldo acumulado de horas do usuário e reintroduzem registros indesejados toda vez que o aplicativo atualiza dados do servidor, quebrando a confiança básica no produto.

**Independent Test**: Pode ser testado de forma independente excluindo um registro existente (tanto com conexão ativa quanto em modo offline), recarregando o aplicativo e verificando que o registro permanece excluído e não reaparece após nova sincronização com o servidor.

**Acceptance Scenarios**:

1. **Given** um usuário conectado à internet visualiza sua lista de registros de horas extras, **When** ele exclui um registro existente e confirma a ação, **Then** o registro é removido imediatamente da visualização e do saldo, e a exclusão é sincronizada com o armazenamento central sem que o item retorne em sincronizações subsequentes.
2. **Given** o dispositivo está desconectado da internet (modo offline), **When** o usuário exclui um registro ou compensação, **Then** o item é removido imediatamente da interface e registrado como exclusão pendente de sincronização.
3. **Given** existem exclusões pendentes salvas localmente, **When** a conectividade com a internet é restabelecida, **Then** as exclusões são propagadas para o servidor central e o registro nunca mais é restaurado no dispositivo do usuário.

---

### User Story 2 - Sincronização Confiável de Edições e Alterações (Priority: P1)

Como trabalhador ajustando meus horários de turnos, quero que alterações em registros existentes (ajuste de horário de entrada/saída, intervalo ou descrição) sejam salvas localmente e propagadas com sucesso para o armazenamento central, sem serem descartadas ou sobrescritas por versões antigas.

**Why this priority**: A capacidade de corrigir erros de digitação de horários ou intervalos é essencial para a exatidão dos cálculos trabalhistas. Falhas na sincronização de edições frustram o usuário e causam divergências no saldo de horas.

**Independent Test**: Pode ser testado de forma independente alterando os horários de um registro existente, sincronizando com o servidor e confirmando que os dados alterados persistem tanto após recarregar a página quanto após uma sincronização completa de dados.

**Acceptance Scenarios**:

1. **Given** um registro existente com horário cadastrado, **When** o usuário altera o horário de saída ou o intervalo e salva as alterações, **Then** o registro atualizado é refletido imediatamente na interface e no cálculo do saldo, e a atualização é sincronizada com o servidor central mantendo os dados novos.
2. **Given** o dispositivo está offline, **When** o usuário edita um ou mais campos de um registro existente, **Then** as alterações são gravadas localmente com status de sincronização pendente, mantendo o histórico de criação intacto.
3. **Given** existem alterações pendentes efetuadas offline, **When** o aplicativo retorna ao estado online, **Then** as alterações mais recentes do usuário são enviadas e confirmadas pelo servidor sem reverter para os valores anteriores.

---

### User Story 3 - Visibilidade Clara do Status de Conectividade e Sincronização (Priority: P2)

Como usuário do aplicativo em celular ou computador, quero visualizar claramente um indicador de status informando quando o aplicativo está Online ou Offline e se há sincronizações em andamento, para que eu tenha certeza se meus dados estão sincronizados na nuvem ou armazenados apenas localmente.

**Why this priority**: A transparência de conectividade cumpre o princípio constitucional de operação offline-first, dando ao usuário previsibilidade sobre o estado dos seus dados antes de fechar o aplicativo ou trocar de aparelho.

**Independent Test**: Pode ser testado de forma independente alternando o modo de rede do dispositivo (desconectando e reconectando Wi-Fi/dados móveis) e verificando que o indicador visual atualiza imediatamente para "Offline" e "Online" em todas as telas em dispositivos móveis e desktop, apresentando alertas informativos quando houver dados pendentes.

**Acceptance Scenarios**:

1. **Given** o aplicativo está conectado à internet, **When** o usuário navega por qualquer tela do aplicativo, **Then** o cabeçalho/barra de status exibe um indicador verde indicando "Online" e estado de dados sincronizados.
2. **Given** o dispositivo perde o acesso à rede (offline), **When** a desconexão ocorre, **Then** o indicador altera imediatamente seu estado visual para "Offline", informando que novas gravações e edições estão sendo salvas de forma segura no dispositivo.
3. **Given** existem operações pendentes salvas localmente e a conexão é recuperada, **When** o processo de sincronização é iniciado, **Then** o status exibe brevemente uma indicação de sincronização em progresso e transita para sincronizado assim que concluído.

---

### Edge Cases

- **Exclusão de registro recém-criado em modo offline**: Quando o usuário cria um registro offline e o exclui ainda em modo offline antes que qualquer sincronização ocorra, o sistema deve cancelar a criação e não enviar solicitações desnecessárias ao servidor central.
- **Edição consecutiva do mesmo registro offline**: Quando o usuário edita o mesmo registro múltiplas vezes antes de reconectar, apenas a versão final acumulada com suas alterações mais recentes deve ser enviada para sincronização com o servidor.
- **Flutuações rápidas de conectividade (quedas momentâneas)**: Quando a conexão cai e volta em intervalos de poucos segundos, o indicador de status deve responder sem congelamento da interface, e as tentativas de sincronização devem ser controladas para evitar requisições concorrentes ou duplicadas.
- **Exclusão simultânea ou conflito de horário no servidor**: Se o registro já foi removido no servidor por outro acesso e o usuário local tenta alterá-lo ou excluí-lo, o sistema deve tratar graciosamente a resposta sem quebrar a interface do usuário.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE garantir que a exclusão de qualquer registro de hora extra ou compensação seja removida imediatamente da visualização do usuário e computada na dedução de horas.
- **FR-002**: O sistema DEVE enfileirar e sincronizar as operações de exclusão com o armazenamento central de dados quando houver conexão com a internet.
- **FR-003**: O sistema DEVE impedir que registros excluídos pelo usuário reapareçam ou sejam reinseridos no dispositivo durante operações de atualização ou busca de dados do servidor central.
- **FR-004**: O sistema DEVE permitir a alteração e edição de qualquer registro existente (data, início, fim, intervalo, categoria, descrição), recalculando a duração líquida e atualizando o saldo imediatamente.
- **FR-005**: O sistema DEVE garantir que as alterações realizadas pelo usuário sobrescrevam com sucesso a versão anterior no armazenamento central durante a sincronização, sem perda de dados ou reversão para o estado pré-edição.
- **FR-006**: O sistema DEVE exibir de maneira persistente e visível o status de conectividade ("Online" ou "Offline") tanto em dispositivos móveis quanto em navegadores desktop.
- **FR-007**: O sistema DEVE informar visualmente quando houver dados pendentes de sincronização aguardando restabelecimento de conexão.
- **FR-008**: O sistema DEVE disparar a sincronização automática imediatamente quando a conectividade com a internet for restabelecida.
- **FR-009**: O sistema DEVE garantir a consistência das operações de sincronização isoladas por conta de usuário autenticado.

### Key Entities *(include if feature involves data)*

- **Registro de Hora Extra (Overtime Record)**: Representa um período trabalhado além da jornada regular. Atributos conceituais incluem identificador único, data de realização, horário de início, horário de término, tempo de intervalo, tempo líquido excedente calculado, descrição facultativa, categoria e carimbos de data/hora de criação e alteração.
- **Agendamento de Compensação (Compensation Schedule)**: Representa um dia ou turno planejado para abater saldo acumulado. Atributos conceituais incluem data planejada, minutos previstos, minutos efetivamente compensados, status do agendamento (planejado, realizado, cancelado) e carimbos de alteração.
- **Operação de Sincronização (Sync Operation)**: Representa uma ação de modificação de dados (criação, alteração ou exclusão) que necessita de reconciliação idempotente entre o armazenamento do dispositivo cliente e o servidor central.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos registros e agendamentos excluídos pelo usuário deixam de existir na base de dados e não retornam após recarregamento da aplicação ou sincronização com o servidor.
- **SC-002**: 100% das alterações realizadas em registros existentes são preservadas integralmente no servidor e refletidas no saldo de horas sem reversão a dados obsoletos.
- **SC-003**: O status de conectividade ("Online" / "Offline") atualiza na interface do usuário em menos de 1 segundo após mudança no estado de conexão do dispositivo.
- **SC-004**: Ao restabelecer a conectividade com a internet, todas as operações pendentes (criações, edições e exclusões) são sincronizadas automaticamente em menos de 3 segundos em condições normais de rede.
- **SC-005**: Zero perda de dados do usuário em transições entre estados online e offline durante operações de edição e exclusão.

## Assumptions

- O dispositivo do usuário suporta detecção padrão de conectividade em navegadores web e PWA (eventos de transição de rede).
- Cada registro possui um identificador único imutável preservado entre o cliente local e o servidor central.
- A regra de resolução de alterações prioriza as modificações intencionais mais recentes do usuário (última escrita intencional).
- O usuário possui permissão de leitura, alteração e exclusão sobre seus próprios registros pessoais.
