# Gemini configurado no PenseFit

O provedor padrão do backend é **Gemini**, com o modelo **gemini-3.5-flash-lite**, disponível na conta fornecida e validado em requisição real. A integração anterior com OpenAI foi preservada para instalações que configurem somente `OPENAI_API_KEY`.

## Credencial

A chave foi armazenada no **Supabase Vault**, no segredo `pensefit_gemini_api_key`. Ela é criptografada em repouso e lida apenas pelo backend com a credencial interna `service_role`. Usuários autenticados e visitantes não podem chamar a operação que retorna o segredo. A chave não está no HTML, bundle JavaScript, configuração pública, documentação ou migração SQL.

O conector disponível não possui operação para configurar segredos de ambiente das Edge Functions; por isso foi utilizado o Vault existente. O código também aceita `GEMINI_API_KEY` ou `GOOGLE_API_KEY` nos segredos de ambiente, que têm prioridade sobre o Vault. `GEMINI_MODEL` permite escolher outro modelo disponível. Para trocar a chave, atualize o segredo nomeado no Vault ou configure a variável de ambiente; não coloque o valor em `dist`.

Como a chave foi enviada no chat, recomenda-se substituí-la no [Google AI Studio](https://aistudio.google.com/api-keys) e atualizar o segredo do backend. O valor antigo não é repetido neste documento.

## Integração

- `supabase/functions/_shared/ai-provider.mjs`: chamadas REST, saídas JSON estruturadas, conversão de PDFs/imagens, validação do formato e mensagens de erro sem exposição da chave.
- `supabase/functions/pensefit-ai/index.ts`: seleção segura do provedor e conexão real; continua validando sessão, quota, consentimento e limites das propostas.
- `supabase/gemini-secret-access.sql`: acesso exclusivo do backend ao segredo. O valor da chave é configurado separadamente e nunca incluído na migração.
- `src/platform/assistant.mjs`: mostra o provedor e o modelo configurados, com botão **Testar conexão real**.

A API Interactions usa `store:false`. Histórico necessário é enviado explicitamente; não usamos armazenamento de conversas do provedor para reconstruir o histórico. O histórico do aplicativo continua privado no Supabase. A chave é enviada somente no header ao endpoint oficial Google, nunca em URL ou em resposta ao navegador.

## Verificação

Foi testada a conexão real pelo Supabase autenticado e o bloqueio de acesso à credencial para um usuário comum (`42501`). Conversa real, receita estruturada e extração de um PDF sintético são verificados pelo script separado `tests/live-gemini-modules.cjs`, com contas temporárias e sem informações pessoais reais.

Os testes reais de conversa, receita e PDF passaram, incluindo a preservação privada do documento durante a extração. Os documentos sintéticos e as contas temporárias foram excluídos ao concluir. Os seis testes específicos do adaptador também passaram; a suíte completa inclui 22 testes de domínio/provedor e 36 fluxos de navegador.

Testes automatizados em `tests/ai-provider.test.mjs` cobrem o formato atual de resposta, JSON Schema, PDF/imagem, chave somente no header, `store:false`, falhas de quota/autenticação, respostas incompletas e compatibilidade com OpenAI. O modelo ainda pode recusar uma solicitação ou gerar uma proposta fora dos limites do domínio; a revisão e os limites permanecem obrigatórios.

Limites e cobrança seguem a conta Google. Não foram alterados plano de cobrança, orçamento ou permissões do projeto Google. Falhas de quota são exibidas como indisponibilidade, sem simular resposta de IA.

Referências oficiais: [chaves Gemini](https://ai.google.dev/gemini-api/docs/api-key), [saídas estruturadas](https://ai.google.dev/gemini-api/docs/structured-output), [Interactions e retenção](https://ai.google.dev/gemini-api/docs/interactions-overview), [Supabase Vault](https://supabase.com/docs/guides/database/vault).
