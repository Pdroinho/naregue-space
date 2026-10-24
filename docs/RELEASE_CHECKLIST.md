# Checklist de liberação

## Código

- [ ] `npm ci` em ambiente limpo.
- [ ] `npm run check` aprovado.
- [ ] `npm run preflight` aprovado com `.env` real.
- [ ] pacote sem `.env`, banco, backup, logs, `node_modules` ou `dist` antigo.
- [ ] SHA-256 registrado.

## Infraestrutura

- [ ] `docker compose config` e build aprovados.
- [ ] `/api/ready` retorna 200 local e via HTTPS.
- [ ] proxy preserva `Host` e `X-Forwarded-*`.
- [ ] volumes de dados, mídia e backup verificados.
- [ ] backup externo criptografado (`.sqlite.gz.enc`), restore e rollback testados; chave armazenada separadamente.

## Produto

- [ ] DEV: bootstrap, espaços, integrações, usuários e backups.
- [ ] ADMIN: dashboard, agenda, clientes, serviços, caixa, WhatsApp, Mestre AI, cobrança, indicações, domínio, segurança e conta.
- [ ] EQUIPE: criar, editar, ativar e desativar profissionais; vincular serviços e horários individuais.
- [ ] EQUIPE: comparar “Toda a equipe” com cada profissional no dashboard, agenda, clientes e caixa.
- [ ] BOOKING: escolher profissional, usar “próximo disponível” e confirmar que conflitos são recusados.
- [ ] BLOQUEIOS: indisponibilidade geral afeta todos; indisponibilidade individual afeta somente o profissional correto.
- [ ] CLIENT: booking, OTP, horários e preferências de comunicação.
- [ ] estados vazios, erros de rede e ações destrutivas revisados.
- [ ] modo claro e petróleo testados.
- [ ] desktop, 320 px, 390 px, 430 px e tablet sem overflow.
- [ ] teclado, foco, leitor de tela e contraste revisados.

## Integrações

- [ ] InfinitePay: preço, retorno, confirmação, idempotência e divergência.
- [ ] Evolution: conexão, QR, webhook, envio, recebimento, receipt e mídia.
- [ ] OTP e MFA em aparelho real.
- [ ] DNS/TLS em pelo menos dois provedores.
- [ ] consentimento e opt-out promocional respeitados.
- [ ] campanhas em massa continuam bloqueadas.

## Legal e comercial

- [ ] responsável, documento fiscal, endereço e contatos preenchidos.
- [ ] termos e privacidade revisados.
- [ ] suporte e processo LGPD definidos.
- [ ] preço público corresponde ao servidor.
- [ ] nenhuma prova social ou métrica sem evidência.

## Aprovação

- Release/hash: ____________________
- Homologado por: __________________
- Data e fuso: _____________________
- Rollback testado: [ ]
- Todos os P0: [ ]
