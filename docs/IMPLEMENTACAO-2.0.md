# PenseFit 2.0 — implementação e verificação

O projeto original foi preservado e ampliado. A autenticação e o snapshot anterior continuam em dist/auth.js e dist/app.js. As entidades novas são independentes, com revisões, RLS e vínculos por usuário. Alterações de banco foram aditivas; as contas temporárias de verificação foram removidas sem atingir contas reais.

## Entregas por etapa

| Etapa | Código principal | Banco e recursos | Verificação |
| --- | --- | --- | --- |
| Fundação | app.mjs, ui.mjs, store.mjs, platform.css, auth.js | 23 tabelas privadas, preferências, catálogo público autenticado, Storage privado | Login, cadastro, recuperação, sessão, conflito e logout; RLS entre contas |
| Treinos | training.mjs, catalog.mjs, domain.mjs | Planos, sessões, séries, calendário | Criar plano, registrar somente séries executadas, retomar, finalizar; volume e temporizadores |
| Evolução | wellness.mjs, integrations.mjs | Medidas, fotos, recuperação, hidratação, registros importados | Fotos privadas, comparação, escalas explícitas, onboarding, PDF e calendário |
| Pense Nutri | nutri.mjs, foods-usda.json | Alimentos, despensa, receitas, planejamento, compras, planos profissionais, diário | Estoque transacional, faltantes sem duplicação, transferência idempotente, documento privado, revisão e adesão |
| Pense WOD | wod.mjs, catalog.mjs | WODs, resultados, PRs, habilidades | Gerador local identificado, revisão, sete modos de tempo, pausa, versões de benchmark, estimativa de 1RM separada de PR |
| IA | assistant.mjs, functions/pensefit-ai | Histórico privado, quota e validação de identidade | Sem chave: status indisponível real; nenhuma resposta simulada; requisição anônima rejeitada |
| Boxes e Coach | community.mjs, sharing.sql, private-rpcs.sql | Boxes, membros, WODs publicados, resultados e notas | Atleta não muda o próprio papel; consentimento obrigatório; ranking sem notas ou dados alimentares; revogação esconde compartilhamento |
| PWA e mídia | sw.js, manifest.webmanifest, assets, scripts/build.cjs | Cache somente da interface pública, fontes locais | Layout móvel sem transbordamento; teste de cache e tela offline |

Os módulos .mjs estão em src/platform. SQL em supabase/platform.sql, sharing.sql, platform-rpcs.sql, catalog.sql, private-rpcs.sql, domain-validation.sql, least-privilege.sql e validation-null-fix.sql documenta as migrações aplicadas. O schema original está em supabase/schema.sql. Não repetir o bootstrap no projeto já conectado.

## Segurança e banco real

Testes com quatro contas descartáveis verificaram isolamento das 23 entidades, vínculos entre proprietário e sessão, validação de recuperação, estoque insuficiente com rollback, transferência repetida sem duplicação, plano nutricional ativo único, arquivos privados, permissões de grupos, publicação com consentimento e ausência de acesso do Coach à alimentação. Uma tentativa de falsificar pontuação foi substituída pelo resultado real na função do banco. A exclusão de conta removeu seus arquivos, inclusive pastas aninhadas, e não afetou a outra conta indicada no corpo da requisição.

Foram corrigidos dois problemas encontrados nesses testes: uma variável que ocultava FOUND na transferência de compras e privilégios padrão excessivos que permitiam alterar o papel de membro. As operações elevadas usam funções privadas com identidade validada e search_path restrito.

O lookup autenticado de código de barras foi testado no Open Food Facts. O catálogo nutricional usa oito alimentos realmente consultados na USDA, com fonte e quantidades por 100 g. As receitas calculam estimativas proporcionais; unidades caseiras não recebem conversões inventadas. Fotografias de receitas são ilustrativas geradas por IA, não representam porções medidas. Veja MIDIAS.md para fontes e prompts.

## Testes reproduzíveis

Execute npm.cmd run build e npm.cmd test na pasta PENSEFIT. A suíte contém o verificador original, dez testes de domínio, 27 fluxos de navegador e um teste de PWA. O navegador usa respostas controladas; os testes reais de Supabase foram executados separadamente. Não confundir testes de integração com envio real de e-mail ou resposta positiva da IA.

## Configurações pendentes e limites

- **IA:** usuário sem chave. Configure OPENAI_API_KEY nos segredos das Edge Functions. A resposta positiva do modelo e a extração real de documentos ainda não foram verificadas; recursos locais e registro manual funcionam.
- **E-mail:** sem provedor SMTP. Configure remetente, SMTP, URLs de confirmação/recuperação e teste a entrega antes de abrir cadastro público.
- **Publicação:** dist deve ser hospedado em HTTPS; configurar ALLOWED_ORIGINS e URLs do Auth com o domínio final. O projeto continua disponível localmente em http://localhost:3000.
- **Proteção de senhas vazadas:** a auditoria Supabase deixou somente este aviso de configuração. [Instruções oficiais para habilitar](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Não foi alterado o plano de cobrança do projeto.
- **Integrações:** Apple Health e Health Connect precisam de app nativo e permissões; Strava precisa de OAuth e credenciais. A tela informa essa situação e permite importação manual de JSON/GPX.
- **Notificações:** dependem de autorização do navegador e da aba aberta; não há serviço push em segundo plano.
- **Offline:** somente interface pública em cache. Fotos, documentos, registros e operações novas requerem conexão. Pendências do snapshot original continuam vinculadas à conta no navegador.
- **Mídia:** imagens originais do treino foram preservadas; a licença delas não foi confirmada. Referências externas de exercícios podem mudar. As novas imagens ilustrativas e suas fontes estão documentadas.
- **Nutrição:** cálculos são estimativas; documentos originais são privados e preservados. Adesão e substituições registradas não reescrevem a prescrição profissional.

Não foram criadas assinaturas, bloqueios PRO, atividades fictícias ou sincronizações externas simuladas.

## Expansão Pense Run

O módulo de corrida foi integrado preservando a plataforma. Consulte [as etapas, tabelas, testes e limites técnicos](PENSE-RUN.md). Os relatórios e o calendário agora consideram corridas concluídas.

## Atualização da IA

Gemini foi configurado e validado com resposta real no backend. A chave está no Vault com acesso exclusivo do servidor. As observações anteriores sobre ausência de chave representam a etapa anterior; consulte [a configuração e os testes atuais](IA-GEMINI.md).
