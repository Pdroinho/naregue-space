# Exclusão permanente no painel dev

Abra Espaços, edite o espaço e escolha **Excluir definitivamente**. A ação está disponível para todos os status. Ela exige a confirmação exata `EXCLUIR slug-do-espaco`; desativar continua sendo uma ação separada e reversível.

O endpoint exige host e papel DEV, confirma o slug persistido e executa revogação de sessões, registro de auditoria e exclusão em uma única transação. As relações do banco seguem as exclusões em cascata existentes. A auditoria da exclusão é preservada. Isso não cancela pagamentos ou remove recursos já existentes em provedores externos.

Validação: confirmação incorreta não remove dados; exclusão de espaço ativo remove usuários e horários vinculados e preserva outro espaço. Nenhum espaço real foi apagado durante a implementação.
