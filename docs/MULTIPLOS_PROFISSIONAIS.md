# Múltiplos profissionais

## Decisão de produto

A barbearia continua sendo um único tenant, com base central de clientes, serviços, marca, assinatura, WhatsApp e configurações. Dentro dela, cada barbeiro é um recurso operacional. O responsável alterna entre:

- **Toda a equipe:** agenda, indicadores, clientes e caixa consolidados;
- **Profissional individual:** os mesmos módulos administrativos filtrados para aquele barbeiro.

A versão 2.2.0 acrescenta uma segunda superfície deliberadamente menor: a conta `PROFESSIONAL`. Ela não transforma o barbeiro em outro tenant nem replica o painel administrativo. O profissional autenticado acessa somente a própria agenda e o próprio perfil em `/profissional`.

## Modelo de acesso

- `ADMIN`: responsável pelo espaço; cria e edita profissionais, vê toda a equipe, clientes, caixa, configurações, integrações e cobrança;
- `PROFESSIONAL`: conta individual ligada a exatamente um registro de `professionals`; vê somente os próprios atendimentos e os campos editáveis do próprio perfil;
- `CLIENT`: permanece restrito ao portal do cliente;
- `DEV`: permanece no console exclusivo da plataforma.

A separação é aplicada no servidor. Rotas profissionais usam `/api/professional`, exigem `role = PROFESSIONAL` e filtram consultas/mutações também pelo `professional_id` ligado à sessão. A interface profissional não chama `/api/admin`.
O SQLite também possui triggers que impedem vincular `professionals.user_id` a usuário de outro tenant ou a role incompatível, e bloqueia convites cujo profissional ou emissor não pertençam ao mesmo espaço.

## Convites

O responsável pode cadastrar um profissional sem criar acesso. Quando quiser liberar a conta individual, gera um link de convite.

- cada convite tem token aleatório de 32 bytes e validade de sete dias;
- apenas o SHA-256 do token é persistido;
- um novo convite revoga convites pendentes anteriores do mesmo profissional;
- o convite só pode ser consumido no tenant/hostname que o emitiu;
- convite expirado, revogado, já usado ou de perfil já vinculado é recusado;
- o token é colocado no fragmento `#` da URL pela interface, evitando sua inclusão na requisição HTTP inicial;
- ao aceitar, a criação da conta `PROFESSIONAL`, o vínculo ao perfil e a marcação do convite como usado ocorrem na mesma transação.

## Regras operacionais

- cada profissional tem nome, apelido opcional, contato, cor, foto, situação e ordem;
- serviços elegíveis são vinculados por profissional;
- o profissional pode herdar os horários do salão ou usar uma grade própria;
- bloqueios com profissional afetam somente sua agenda; bloqueios sem profissional afetam toda a equipe;
- movimentações do caixa podem ser gerais ou atribuídas a um profissional;
- agendamentos sempre possuem um profissional;
- “Próximo disponível” procura apenas profissionais ativos, habilitados para o serviço, dentro do horário e sem conflito;
- a escolha explícita nunca é silenciosamente trocada por outro profissional;
- IDs de outro espaço são recusados na API e por gatilhos do banco.

## Migração de espaços existentes

A migration 39 criou o profissional principal para cada espaço legado e atribuiu serviços e agendamentos existentes. A migration 40 adiciona o vínculo opcional `professionals.user_id`, garante que uma conta não pertença a dois perfis, cria `professional_invites` e liga o `ADMIN` mais antigo ao profissional principal de cada tenant. A operação existente continua válida mesmo sem criar contas para os demais profissionais.

## Privacidade e contrato

A área profissional usa projeções próprias em vez do modelo administrativo completo. O perfil individual não recebe serviços, expedientes, estado de convite, IDs de conta ou timestamps administrativos. A agenda individual recebe nome e telefone do cliente necessários ao atendimento, serviço, valor, horário e status; e-mail do cliente e metadados internos de confirmação não fazem parte desse contrato.

A conta profissional pode confirmar ou cancelar os próprios atendimentos. Ela não pode mover um atendimento para `PENDING`, editar caixa, consultar clientes da equipe, receber estado/período de cobrança em `/api/auth/me` ou acessar configurações do espaço.

## Concorrência e integridade

A disponibilidade é validada no fluxo de aplicação e novamente pelo SQLite durante a gravação. Os intervalos usam a regra `início existente < fim novo` e `fim existente > início novo`; horários encostados podem coexistir, horários sobrepostos não. Os mesmos guardas impedem criar bloqueios sobre atendimentos ativos.

## Critérios de aceite

1. criar dois profissionais com serviços e horários diferentes;
2. conferir a visão consolidada e cada visão individual como responsável;
3. gerar convite para um profissional e concluir login individual;
4. confirmar que esse profissional enxerga somente a própria agenda e perfil;
5. tentar usar o mesmo convite novamente e obter recusa;
6. tentar consumir o convite em outro tenant/hostname e obter recusa;
7. reservar com escolha explícita e com “Próximo disponível”;
8. confirmar que bloqueio geral afeta ambos e bloqueio individual afeta apenas um;
9. tentar duas reservas simultâneas no mesmo intervalo e obter uma única gravação;
10. conferir atribuição do profissional nos próximos atendimentos e no caixa do responsável.
