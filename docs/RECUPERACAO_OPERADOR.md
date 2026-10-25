# Recuperar o operador quando o WhatsApp global estiver desconectado

O login continua exigindo a senha e um código. Se a Evolution não conseguir entregar o código, a tela de verificação permanece disponível e oferece a recuperação pelo acesso administrativo à VPS. Não há liberação automática de acesso por falha no provedor.

1. Acesse `https://dev.naregua.space/login` e entre com a senha do operador. A tela avisará que o envio falhou, mas continuará aceitando o código.
2. Em outro terminal, execute:

   ```powershell
   ssh oracle_tunado "docker exec naregua-app node dist/server/operatorRecoveryCli.js --dev"
   ```

   Se houver mais de uma conta DEV, identifique a conta:

   ```powershell
   ssh oracle_tunado "docker exec naregua-app node dist/server/operatorRecoveryCli.js --email operador@exemplo.com"
   ```

3. Digite o código de seis dígitos no mesmo navegador em que validou a senha. Ele expira em cinco minutos, é de uso único e não funciona sem o cookie do desafio. Não clique em Reenviar depois de gerar a recuperação: isso substitui o código.
4. No painel DEV, abra a Evolution global e reconecte o WhatsApp pelo QR. Repita o login normal para confirmar o recebimento no aparelho.

O comando exige acesso ao host/container e não tem equivalente HTTP público. Ele só recupera um operador DEV existente, sem alterar senha, telefone, papéis, permissões ou o MFA das outras contas. É necessário um desafio ainda válido, criado por uma senha correta nos últimos dez minutos. Telefone alterado, desafio consumido ou expirado, contas de clientes/equipe e seleção ambígua são recusados. A emissão registra `OPERATOR_RECOVERY_CODE_ISSUED` na trilha de segurança, sem gravar o código em texto aberto.

Diagnóstico de 25/10/2026: a API global `https://evo.naregua.space` autenticava corretamente, mas `lashdesigner-global` estava desconectada. A instância é preservada; outras conexões de clientes não são usadas como remetente de códigos da plataforma.
