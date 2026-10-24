# WhatsApp e Evolution API

O backend mantém uma instância global para MFA profissional e instâncias por espaço para conversas, confirmações e automações.

## Operação

- credenciais ficam no servidor e criptografadas no banco;
- webhook é preparado antes de status, conexão e envio;
- inbound ignora grupos e normaliza JID/telefone;
- receipts e diagnósticos ficam disponíveis no painel;
- mídia é privada e servida com autorização;
- confirmação normal usa respostas simples e trata ambiguidades sem alterar o agendamento errado;
- comunicação promocional exige consentimento atual e opt-out;
- envio em massa permanece bloqueado.

No staging, teste QR, reconexão, envio, recebimento, receipt, imagem, áudio, webhook e OTP em aparelho real.
