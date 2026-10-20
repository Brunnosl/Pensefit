# Pense Run — implementação

O módulo foi acrescentado ao PenseFit existente. Login, musculação, CrossFit, Nutri e dados anteriores permanecem disponíveis. O item **Pense Run** aparece na barra lateral e no perfil. Ao escolher **Corrida** na personalização, Início e Treinos apresentam a área do corredor; musculação complementar continua acessível em Força e Nutri.

## Etapas entregues

| Etapa | Arquivos | Persistência | Validação |
| --- | --- | --- | --- |
| Auditoria e design | run.mjs, run.css, run-map.mjs, app.mjs, index.html | Mesmo perfil e sessão | Navegação desktop, cinco abas móveis, tela sem transbordamento |
| Recursos essenciais | run-domain.mjs, run.mjs | Perfil do corredor, calendário, atividades | Pace, velocidade, unidades, filtros por período, histórico e comparação |
| GPS | RunTracker em run-domain.mjs | Atividade atômica com pontos e splits em data; revisões e RLS | Permissão concedida/negada, timestamps, precisão, salto irreal, pausa, retomada, splits e salvamento |
| Planos | run.mjs, pensefit-ai/index.ts | run_plans e calendário existente | Revisão antes de salvar, agendamento repetível sem duplicação, sessões leves; IA retorna indisponível sem chave |
| Evolução | run.mjs | Corridas, provas, rotas, perfil | Recordes exigem confirmação de distância oficial; GPX privado, exportações e comparação |
| Complementos | run.mjs, wellness.mjs, training.mjs | Tênis, desafios, recuperação, relatórios | Quilometragem real por tênis, metas por período, rotina de força revisada, acesso ao Nutri |
| Segurança | supabase/run.sql, tests/live-run.cjs | 12 novas tabelas privadas | Teste real entre contas, tentativa de gravação cruzada bloqueada, corrida ativa única, logout e validação |

## Banco aplicado

Migração aditiva `pense_run_private_entities` aplicada no projeto **Pense fit 2.0**, ID `dulligfgabrmxghfgmjl`. As tabelas são `pensefit_run_profiles`, `run_goals`, `run_plans`, `run_sessions`, `run_activities`, `run_races`, `run_routes`, `run_shoes`, `run_challenges`, `run_achievements`, `run_sync` e `run_records`, todas com prefixo `pensefit_`, proprietário autenticado, RLS, índice por usuário/data e revisão otimista.

Atividades guardam percurso e splits no mesmo registro para salvar ambos juntos. Sessões programadas usam o calendário compartilhado. Metas principais ficam no perfil do corredor; recordes e medalhas são calculados a partir das atividades, sem criar resultados fictícios. As tabelas específicas adicionais permitem futuras projeções e integrações sem misturar atividades pessoais com catálogo. Exclusão de conta usa a função existente e cascata; fotos de tênis usam o bucket privado existente. Exportação JSON geral inclui os dados de corrida.

## Rastreamento e tempo

- Permissão solicitada somente após consentimento explícito. GPS web exige HTTPS ou localhost, conforme a [API de Geolocalização](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition).
- Aceita precisão de até 35 m, timestamps recentes e crescentes. Rejeita velocidade de deslocamento superior a 10 m/s, ruído pequeno e saltos. Intervalos superiores a 30 s iniciam novo segmento, sem somar a linha perdida. São barreiras de qualidade configuradas no código, não garantias de precisão de todo dispositivo.
- Cronômetro usa referência de tempo, com tempo ativo separado do decorrido. Pausas e retomadas não conectam posições por uma distância artificial.
- Sincronização da corrida ativa a cada 15 s e nas ações de pausa/finalização. Se a aba for encerrada antes de sincronizar, o trecho ainda em memória pode ser perdido. Não há gravação offline de coordenadas em localStorage ou no cache do PWA.
- Ao ocultar a aba, a corrida pausa. Após recarregar, a atividade pode ser retomada, inicialmente pausada. Não se promete execução com tela bloqueada. Rastreamento contínuo nesses cenários precisa de adapter nativo com eventos de localização/timestamps e testes físicos.
- Limite de 20.000 pontos por atividade; ao atingir, o registro pausa para ser finalizado.
- Frequência cardíaca não é inventada: sem dispositivo conectado, permanece indisponível. RPE é registro informado pelo usuário, separado de sensor.

## Mapas e rotas

Leaflet 1.9.4 é empacotado localmente. O traçado funciona sem mapa base. Blocos OpenStreetMap são ativados pelo usuário, com atribuição e aviso de que IP e área consultada são transmitidos ao provedor. Não fazemos pré-download, cache de blocos offline ou envio da lista de pontos ao serviço de mapas. Consulte a [política de blocos OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/). Em escala de produção, escolher provedor e limites apropriados.

GPX aceita até 5 MB e 20.000 pontos, valida coordenadas e timestamps quando presentes, distingue segmentos e usa hash do arquivo para evitar importação repetida. GPX sem duração/data pode ser rota, mas não é promovido a corrida concluída automaticamente. Exportação GPX preserva segmentos. Rotas não são publicadas nem descritas como seguras; usar uma rota como referência não equivale a navegação curva a curva.

## Planos, provas e recordes

O modelo local inicial alterna caminhada e corrida ou sessões leves. A progressão de duração é opcional, requer capacidade informada e baixa fadiga, é limitada pelo tempo disponível e precisa de revisão. O usuário pode repetir ou reduzir semanas. Quando vinculado a prova, a última semana pode reduzir duração. Esse modelo não promete preparar uma maratona com capacidade insuficiente e não substitui um planejamento profissional.

Pense Run AI foi adicionado ao backend existente, com autenticação real, quota, schema estruturado, consentimento e consulta do perfil, histórico e recuperação. Coordenadas GPS não são enviadas ao modelo. Validação impede frequência excessiva, dias consecutivos e saltos de volume na proposta. Resposta positiva do modelo não foi testada: **OPENAI_API_KEY ainda não foi configurada**. Nenhuma proposta é aplicada automaticamente.

Recordes de 1/3/5/10 km, meia e maratona exigem distância oficial e confirmação explícita do resultado. Corridas GPS aproximadas podem contribuir para volume e conquistas, mas não se tornam recordes oficiais por tolerância arbitrária de distância. O aplicativo não verifica resultados com organizadores de provas.

Tênis acumulam distância apenas de corridas concluídas vinculadas; quilometragem anterior pode ser informada separadamente. Alertas usam a referência de inspeção escolhida pelo usuário, sem regra universal de substituição.

## Testes e pendências

Suíte de domínio cobre GPS impreciso, timestamps antigos/repetidos, salto irreal, interrupção de sinal, interpolação de splits, pausa, tempo decorrido, pace, recordes e tênis. Testes de navegador usam geolocalização controlada do Chrome; não representam uma corrida física real. Foram testados consentimento, negação, criação/revisão de plano, calendário, histórico, persistência, modo móvel, GPX e retomada.

O teste no Supabase real criou contas temporárias e verificou leitura/gravação privadas das 12 tabelas, calendário Corrida, validação de distância, uma única corrida ativa por conta, logout e indisponibilidade verdadeira da IA. As contas e seus registros foram removidos ao concluir.

Resultado da verificação: os 28 testes de navegador anteriores e os oito novos fluxos de corrida passaram; os 16 testes de domínio também passaram. A compilação foi concluída e a auditoria das dependências de produção não encontrou vulnerabilidades conhecidas. Os novos testes estão em `tests/run.spec.cjs` e `tests/run-domain.test.mjs`; o teste real, separado da suíte normal, está em `tests/live-run.cjs` e requer fixtures temporárias privadas.

Permanecem dependentes de configuração externa: chave de IA, SMTP, hospedagem HTTPS/domínio autorizado, OAuth Strava e app nativo para Health Connect/Apple Health e GPS em segundo plano. Não há sincronização direta de Garmin/COROS/Polar declarada. A auditoria Supabase manteve somente o aviso já existente de [proteção contra senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Fotografia de abertura

Imagem ilustrativa criada com **imagegen integrado**, sem utilizar a chave de IA do aplicativo. Original: `media-source/run-hero.png`; versão otimizada consumida pela interface: `dist/assets/run-hero.webp`. Não representa um usuário ou uma atividade real.

Prompt final: “Use case: photorealistic-natural. Asset type: wide running dashboard hero photograph for PENSE RUN. Primary request: editorial sports photograph of an adult female runner jogging outdoors, athletic black clothing with a subtle lime accent, realistic natural anatomy and motion. Composition: panoramic landscape, runner occupies right third, large very dark negative space on the left for interface text. Scene: dark park path at dawn, unobtrusive trees, no identifiable landmark. Lighting: cinematic rim light in lime green, premium charcoal and black palette #0B0F0E, restrained #C7FF3D highlights. Constraints: photograph only, no text, no logo, no UI, no maps, no numbers, no watermark. Runner must look naturally dressed and energetic, not exhausted.”

## Atualização da IA

Gemini foi configurado e validado com resposta real no backend. A chave está no Vault com acesso exclusivo do servidor. As observações anteriores sobre ausência de chave representam a etapa anterior; consulte [a configuração e os testes atuais](IA-GEMINI.md).
