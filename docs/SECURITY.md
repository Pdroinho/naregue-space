# Segurança

- sessões opacas armazenadas no servidor e revogáveis;
- cookies `Secure`, `HttpOnly` e `SameSite=Lax` em produção;
- MFA profissional por WhatsApp e dispositivo confiável revogável;
- cliente acessa por telefone e OTP, sem senha profissional;
- segredos criptografados com derivação por finalidade;
- rate limits persistidos para fluxos sensíveis;
- isolamento por tenant e hostname;
- URLs externas validadas contra SSRF;
- migrations preservam a fila WhatsApp anterior;
- campanhas promocionais dependem de consentimento ativo e continuam sem broadcast público.

O salt criptográfico e identificadores históricos de consentimento/DNS não devem ser renomeados: são compatibilidade de dados, não identidade visível.

Rode `npm run check` e homologue cookies, MFA, revogação, tenant crossing, backup e restore no staging.
