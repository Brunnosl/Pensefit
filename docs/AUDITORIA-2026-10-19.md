# Auditoria funcional — 19/10/2026

Site: https://pensefit-rose.vercel.app/

Os testes reais usaram quatro contas temporárias identificadas por um marcador exclusivo. Nenhum registro de uma conta real foi alterado. Os arquivos e as contas de teste são removidos ao concluir a auditoria.

## Correções

- **Treinos:** os atalhos Cargas e Pense WOD deixavam a aba atual presa no redirecionamento. A navegação agora preserva a aba de treino, permitindo voltar normalmente.
- **Importação manual:** datas e métricas ausentes eram substituídas por valores padrão. Todos os itens são agora validados antes da primeira gravação. GPX reutiliza o parser de coordenadas e horários do Pense Run; arquivos sem horários podem ser usados como percursos, mas não viram atividades com duração inventada. Uma falha de rede durante as gravações ainda pode interromper um lote; repetir a importação ignora os identificadores já carregados.
- **Funções no Vercel:** o domínio de produção não estava na lista de origens permitidas. As três funções agora aceitam o domínio exato do site. Origens desconhecidas continuam recebendo HTTP 403; as operações continuam exigindo autenticação.
- **WOD com IA:** o formato não explicitava que a duração era em segundos, nem os limites de contagem. O schema agora informa unidades, tipos inteiros e intervalos; o backend valida esses limites e restringe os movimentos ao nível e aos equipamentos disponíveis. Nenhuma proposta é aplicada automaticamente.
- **Verificações:** o comando `npm test` passou a incluir os quatro testes de Pense Active que antes precisavam ser executados separadamente. Os testes reais antigos passaram a aceitar o estado configurado da IA e verificar consentimento.

## Cobertura e resultados

- 27 testes de domínio e provedor, incluindo cálculos, cronômetros, GPS sintético, sincronização offline, limites e formato da IA.
- 42 testes de navegador com servidor simulado, incluindo autenticação, conflito de revisão, persistência, treinos, nutrição, WOD, corrida, consentimento, PWA e regressões das correções.
- 17 cenários de interface aprovados no Vercel com backend real, sem erros de JavaScript: login, personalização, navegação por módulos e abas, treino com série e retomada, despensa, receita/lista de compras, medidas, recuperação, calendário, PDF, corrida manual, tênis, importação, mobile, hidratação, plano alimentar, foto privada, WOD, chamadas das funções e logout. O hash SHA-256 do bundle servido pelo Vercel coincidiu com o arquivo compilado localmente.
- Backend real: 23 entidades da plataforma e 12 de corrida, isolamento entre contas, validações, estoque atômico, compras idempotentes, plano alimentar ativo único, fotos privadas, Box/Coach, consentimento e revogação.
- IA real: conexão, conversa, receita, extração de PDF sintético, WOD e proposta de corrida. Houve uma indisponibilidade por timeout do provedor durante um teste de WOD; uma nova chamada respondeu corretamente. A interface mantém o erro explícito quando o provedor não responde.
- Busca externa de alimentos por código de barras e exclusão completa de uma conta temporária, incluindo arquivo privado aninhado.
- CORS: origem Vercel aceita; origem desconhecida bloqueada. O teste de interface também verifica as três funções a partir do navegador.
- Limpeza confirmada: nenhuma das quatro contas temporárias permaneceu no Auth, e nenhum arquivo dessas contas permaneceu no Storage.

## Limites da verificação

- GPS e permissões foram exercitados com coordenadas sintéticas. Precisão em campo, sensores, voz em dispositivos reais e execução em segundo plano Android/iOS exigem teste físico.
- Strava, Health Connect e Apple Health mostram os requisitos externos existentes; não há sincronização oficial configurada no site.
- Entrega e recebimento de e-mails reais, links de confirmação e recuperação dependem do provedor de e-mail e da configuração Auth no Supabase. Não foram usados e-mails pessoais para testar envio. Confira Site URL e Redirect URLs para o domínio de produção no painel.
- O advisor do Supabase indicou proteção contra senhas vazadas desabilitada. As políticas de acesso entre contas e Storage testadas permaneceram funcionando.

## Repetir os testes

```powershell
npm.cmd run build
npm.cmd test
```

Os arquivos `tests/live-*.cjs` são testes manuais contra serviços reais. Precisam de contas descartáveis previamente criadas por `scripts/live-fixtures.cjs`; os scripts e SQL de fixtures são locais e ignorados pelo Git. Não execute os testes reais usando contas de usuários. `tests/live-browser.cjs` aceita `PENSEFIT_TEST_URL` para escolher o ambiente e `PENSEFIT_TEST_USER` para escolher o índice da conta descartável.

Referências: [saídas estruturadas Gemini](https://ai.google.dev/gemini-api/docs/structured-output), [SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp), [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
