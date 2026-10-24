# NaRégua 2.2.2 — booking mobile estabilizado

## Revisão 2.2.2

- O progresso do agendamento mobile mantém as cinco etapas em uma única linha, sem a última barra quebrar para a linha seguinte.
- A ação “Voltar ao espaço”/“Voltar” fica fixa no rodapé da viewport no mobile, com safe-area, superfície própria e espaço reservado no conteúdo.
- Na confirmação, o botão principal permanece acima do rodapé fixo para as duas ações nunca se sobreporem.

## Revisão 2.2.1

- dashboard recomposto como comando do dia mais limpo: removido o trilho decorativo de atendimentos, métricas separadas em cards com mais respiro e ícones sem caixas apertadas;
- bloco de confirmações do dia ganhou hierarquia de conteúdo e estados compactos, sem aparência de faixa provisória;
- Agenda recupera um seletor segmentado consistente com o padrão bem resolvido do WhatsApp, mantendo teclado, foco e semântica de tabs;
- `ProductSelect` passa a dimensionar opções detalhadas pela altura real aproximada, evitando scrollbar artificial com poucas opções; a rolagem continua funcional sem exibir o chrome nativo;
- tela de Equipe perde trilhos, barras e marcadores lineares puramente decorativos; estados operacionais usam superfície, ponto de cor e hierarquia textual;
- causa raiz do texto espremido no menu recolhido corrigida na cascata: em desktop o rail colapsado volta a ser somente ícones, enquanto o drawer mobile preserva identidade e textos;
- seletor de visão da equipe no mobile passa a ocupar sua própria faixa com rótulo e controle em largura total, sem competir com tabs e avisos;
- Agenda mobile remove a nota redundante de escopo no fluxo normal e a mantém apenas quando o contexto de bloqueios exige explicação;
- Clientes mobile foi recomposto com um único resumo de comunidade, destaque de cliente somente quando existe conteúdo, busca isolada, filtros segmentados e estado vazio alto/respirado;
- cards mobile de clientes deixam de depender de faixa lateral decorativa;
- auditoria de release passa a bloquear regressões específicas desta revisão: rails decorativos, scrollbar visível no dropdown, sidebar colapsado com copy, tabs da Agenda e densidade indevida em Agenda/Clientes mobile.

## Revisão 2.2.0

- profissionais agora podem receber uma conta individual ligada ao próprio perfil, sem acesso ao painel administrativo, caixa, configurações ou informações da equipe;
- o responsável continua sendo o único perfil com visão consolidada e pode criar profissionais manualmente, gerar/revogar convites e remover acessos individuais;
- convites de equipe expiram em sete dias, são vinculados ao tenant correto, persistem somente o SHA-256 do token e usam fragmento de URL para manter o segredo fora da requisição HTTP inicial;
- novo portal `/profissional` apresenta somente a agenda e o perfil do profissional autenticado; consultas e mutações de agenda filtram também por `professional_id` no servidor;
- contrato da área profissional foi reduzido ao mínimo necessário: perfil próprio sem metadados administrativos e agenda sem e-mail do cliente ou metadados internos de confirmação;
- alteração de nome, apelido, foto e cor do profissional principal passa a atualizar a identidade exibida no menu do responsável;
- tela de Equipe/Profissionais reconstruída com uma linguagem baseada em cadeiras e trilhos de agenda, sem indicador verde pulsante, círculo decorativo ou card genérico de SaaS;
- editor de profissional reorganizado por identidade, contato, serviços, expediente e acesso, com fluxo separado para gerar link de convite;
- expediente personalizado preserva múltiplos intervalos no mesmo dia, evitando colapsar pausas/almoço ao reabrir e salvar o profissional;
- perfil, serviços e expediente do editor de equipe agora são persistidos na mesma transação, evitando profissional criado pela metade quando a agenda falha;
- seletor compartilhado `ProductSelect` refinado em comportamento, teclado, posicionamento e estados; o glyph de check rejeitado foi removido do contrato de ícones da aplicação;
- dashboard ganhou um runway operacional dos próximos atendimentos para substituir a leitura baseada somente em KPIs genéricos;
- Agenda recebeu nova hierarquia temporal, trilho de cor por profissional, estado de hoje estrutural, foco/hover mais claros e preservação da agenda diária dedicada no mobile;
- migration 40 adiciona vínculo `user_id` em profissionais, unicidade de conta por perfil, guardas de tenant/role no próprio SQLite e a tabela de convites de equipe, ligando automaticamente o responsável existente ao profissional principal;
- testes de segurança cobrem sessão `PROFESSIONAL`, hash/expiração/escopo de convites e migrations de acesso de equipe;
- auditoria estável passou a bloquear regressões de privacidade, permissões, dropdown, glyph rejeitado e direção visual da equipe.

## Revisão 2.1.1

- espaçamento vertical restaurado entre o comando operacional e os indicadores do console DEV;
- cards de Indicações alinhados ao contrato compartilhado de métricas, sem sobreposição entre rótulos, valores e textos de apoio.

## Revisão 2.1.0

- múltiplos profissionais integrados ao produto sem fragmentar o espaço: cadastro, disponibilidade, serviços executados, horários e identidade visual por barbeiro;
- seletor “Toda a equipe” ou profissional individual no dashboard, agenda, clientes e caixa, incluindo desktop e mobile;
- booking público em cinco etapas, com escolha de profissional ou distribuição automática para quem estiver disponível;
- bloqueios gerais e individuais, validação de intervalos e proteção no banco contra dupla reserva, indisponibilidade e referências entre espaços;
- migração automática cria um profissional principal para cada espaço existente e preserva serviços, agendamentos, caixa e bloqueios legados;
- dashboard reconstruído como comando do dia, sem banner fotográfico genérico, mostrando próximo atendimento, exceções e contexto da equipe;
- caixa reconstruído com Chart.js real, leitura consolidada ou individual e identificação do profissional em serviços e movimentações;
- busca de clientes reduzida, com respiro e filtros úteis de recorrência, visita e consentimento;
- console DEV com busca única, filtros de situação e cobrança, métricas corrigidas e ação “Novo espaço” identificável;
- identidade do espaço refeita no menu, conta do usuário corrigida nos estados expandido e recolhido e lançador do Mestre AI preso ao viewport;
- campos de senha alinhados, tabela de usuários com contorno completo e ícone circular de verificação removido de toda a interface.

## Revisão 2.0.1

- shell corrigido sem marca duplicada, link de acessibilidade solto ou vazamento horizontal;
- contraste da cor de cada barbearia calculado separadamente para ações, superfícies claras e superfícies petróleo;
- DEV, dashboard e Agenda refinados com hierarquia operacional, continuidade fotográfica e tabelas sem containers aninhados;
- Mestre AI reconstruído como superfície completa, com composer no rodapé e lançador compacto de IA;
- mobile de Agenda, Clientes, WhatsApp e Indicações corrigido para caber na largura real do aparelho;
- aceite legal refeito como etapa de produto clara, responsiva e acessível.

## Produto e interface

- identidade petróleo, creme e cobre consolidada em tokens semânticos;
- Manrope adotada em toda a interface para consistência tipográfica;
- painel claro como padrão, com modo petróleo persistente;
- landing, autenticação, shell, dashboard, agenda, clientes, serviços, caixa, WhatsApp, Mestre AI, cobrança, indicações, configurações e portal da cliente revisados;
- mobile com topbar, navegação inferior, agenda diária, clientes e booking próprios;
- estados vazios, erros de rede, skeletons e diálogos padronizados;
- jornada pública de agendamento simplificada e sem progresso redundante.

## Estrutura

- sobreposições centralizadas em `ModalRoot` e `OverlayCoordinator`;
- CSS ativo organizado por domínio, sem arquivos de override versionados;
- nomenclatura anterior removida do frontend, assets e documentação;
- três identificadores históricos permanecem somente no backend para descriptografar dados, provar consentimentos e reconhecer DNS já emitido;
- gate de release consolidado em `npm run check`.

## Segurança e operação

- sessões opacas e revogáveis;
- MFA profissional e acesso de cliente por OTP WhatsApp;
- segredos criptografados;
- migrations e filas WhatsApp cobertas por testes;
- Docker non-root, health check, volumes, backup e restore verificado por integridade.
