# Pense Fit 2.0

Aplicativo de treino com login, cadastro, recuperação de senha e registros privados sincronizados no Supabase.

## Abrir no computador

Na pasta `PENSEFIT`, execute:

```powershell
python -m http.server 3000 --directory dist
```

Abra **http://localhost:3000/**. Você também pode abrir `INICIAR-PENSEFIT.bat` no Windows.

A autenticação precisa de um servidor HTTP. Abrir `dist/index.html` diretamente pelo explorador de arquivos não permite concluir os fluxos de conta.

## Supabase conectado

- Projeto: **Pense fit 2.0**.
- Região: São Paulo (`sa-east-1`).
- ID: `dulligfgabrmxghfgmjl`.
- Painel: https://supabase.com/dashboard/project/dulligfgabrmxghfgmjl
- Configuração pública do cliente: `dist/config.js`.
- Schema aplicado: `supabase/schema.sql`.

A chave em `config.js` é uma chave publicável, apropriada para o navegador. Nunca coloque chaves secretas ou `service_role` nos arquivos da pasta `dist`.

O Supabase Auth gerencia as senhas. A tabela `pensefit_accounts` guarda o perfil, exercícios e refeições marcados, cargas e evolução de cada conta. As regras RLS permitem consultar, criar e atualizar somente o registro cujo `user_id` corresponde ao usuário autenticado. A revisão do registro impede que um dispositivo substitua silenciosamente as alterações de outro.

## E-mails: configuração que ainda precisa ser concluída

O projeto está com cadastro por e-mail habilitado e confirmação de e-mail ativa. Você informou que ainda não tem provedor SMTP. **O envio de confirmações e recuperação para usuários em geral depende dessa configuração.** O serviço padrão do Supabase envia apenas para endereços dos membros da organização e tem limites baixos. A entrega de e-mails reais não foi testada.

1. Crie uma conta em um provedor que ofereça SMTP e configure um domínio/remetente autorizado.
2. No [painel de SMTP do projeto](https://supabase.com/dashboard/project/dulligfgabrmxghfgmjl/auth/smtp), habilite SMTP personalizado.
3. Preencha servidor, porta, usuário e senha SMTP fornecidos pelo provedor. Defina o nome do remetente como `Pense Fit` e um e-mail autorizado pelo provedor.
4. Mantenha a confirmação de e-mail habilitada. Cadastre uma conta real e confira o recebimento do link; depois teste “Esqueci minha senha”.

Essas credenciais são configuradas no Supabase, nunca no HTML ou JavaScript público. Consulte a [documentação oficial de SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## URLs de confirmação e recuperação

Em [Authentication → URL Configuration](https://supabase.com/dashboard/project/dulligfgabrmxghfgmjl/auth/url-configuration), configure:

- Site URL durante o desenvolvimento: `http://localhost:3000`.
- Redirect URLs locais: `http://localhost:3000/**` e, se usar o arquivo explicitamente, `http://localhost:3000/index.html`.

O endereço local usa a porta 3000 para acompanhar o padrão de projetos Supabase. O conector disponível não oferece alteração de configuração de URLs; confira estes valores no painel antes de testar links de e-mail.

Quando publicar, troque Site URL pelo endereço HTTPS final e adicione os endereços exatos de retorno, inclusive a versão com `?flow=recovery`. O app usa o endereço atual como destino após confirmação e recuperação. Consulte [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## Registros da versão anterior

Depois de entrar, acesse **Perfil → Importar registros antigos deste navegador**. A importação pede confirmação e substitui os registros da conta pelos dados locais antigos, preservando nome, contato e nascimento da conta atual. O registro antigo permanece no navegador.

Abra o novo app no mesmo endereço e navegador usados anteriormente para acessar aquele armazenamento local. Dados de uma página aberta via `file://` ou de outra porta não aparecem automaticamente em `http://localhost:3000`. Os registros pessoais não fazem parte deste código.

Alterações ainda não sincronizadas são guardadas por conta neste navegador. O aviso no topo informa quando o salvamento na nuvem foi concluído, falhou ou precisa resolver um conflito. Em um conflito, você escolhe entre os registros da nuvem e os do navegador.

## Código e verificações

- `dist/index.html`: telas e estrutura do app.
- `dist/app.js`: treinos, alimentação, cargas, evolução e perfil.
- `dist/auth.js`: cadastro, login, senha, sessão e sincronização.
- `dist/auth.css`: estilos de autenticação e conta.
- `dist/vendor/supabase.js`: SDK empacotado para funcionar sem CDN.
- `src/supabase-client.js`: entrada para gerar o SDK.

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd test
```

O build compila o SDK e `src/platform/app.mjs`, copia as fontes e gera os ícones PWA. Edite os módulos em `src/platform`; `dist/platform.js` é gerado. Os arquivos originais `dist/app.js`, `dist/auth.js`, HTML e CSS continuam editáveis. A suíte usa o Chrome instalado e um servidor local na porta 3000. Os testes de navegador simulam respostas de autenticação para não enviar e-mails. Login e regras de acesso também foram verificados no Supabase real com duas contas descartáveis, removidas depois da verificação. O verificador manual `tests/live-check.cjs` exige fixtures privadas e não é executado na suíte normal.

Para publicar, envie a pasta `dist` inteira para uma hospedagem estática com HTTPS e conclua SMTP e URLs de retorno no Supabase.

## Plataforma ampliada

O **Pense Run** também foi integrado: GPS com consentimento, calculadora de pace, planos revisados, corridas, provas, rotas GPX, tênis e metas. A referência visual usa preto e verde-lima. Consulte [as etapas, testes e limites do módulo](docs/PENSE-RUN.md). O GPS web pausa ao ocultar a aba; teste a precisão no seu próprio celular antes de depender dele em uma corrida. Rotas permanecem privadas.

Treinos com sessões e séries, Pense Nutri, Pense WOD, evolução com fotos privadas, recuperação, relatórios PDF, calendário híbrido, boxes e permissões de Coach estão integrados ao projeto. Consulte [o relatório de implementação](docs/IMPLEMENTACAO-2.0.md) e [a origem das mídias](docs/MIDIAS.md). O catálogo é referência; os indicadores pessoais usam registros da conta.

As tabelas adicionais e políticas já foram aplicadas no projeto conectado. Os arquivos `supabase/*.sql` registram essas alterações; não execute novamente todo o bootstrap sobre esse banco. As três Edge Functions estão em `supabase/functions/`. Elas validam o usuário com Supabase Auth dentro da função, mesmo com verificação JWT do gateway desativada para compatibilidade com as chaves publicáveis.

## IA configurada e publicação

O Gemini já está configurado no backend, com a chave criptografada no Supabase Vault. Modelo padrão: `gemini-3.5-flash-lite`, validado em chamadas reais. Veja [configuração segura, testes e troca da chave](docs/IA-GEMINI.md). Também é possível configurar `GEMINI_API_KEY` nos segredos de ambiente e escolher `GEMINI_MODEL`. Nunca coloque chaves em `dist/config.js`. A extração de documentos exige consentimento e revisão; rotinas locais continuam identificadas como locais. A integração com OpenAI é preservada para outras instalações.

Ao publicar em HTTPS, configure `ALLOWED_ORIGINS` nas funções com as origens autorizadas separadas por vírgula. O padrão permite apenas `http://localhost:3000` e `http://127.0.0.1:3000`. Configure também SMTP e URLs de retorno de Auth. A sincronização precisa de conexão; o PWA guarda somente arquivos públicos da interface. Apple Health, Health Connect e Strava aguardam as integrações oficiais; a importação manual não representa sincronização.
