# Agenda Iracambi

Sistema web responsivo para planejamento, acompanhamento, gestão e prestação de contas das atividades e programas da Iracambi.

O projeto centraliza agenda, eventos, evidências, pessoas, programas, veículos, despesas, relatórios, arquivos, avisos, notificações e auditoria em uma única aplicação instalável como PWA.

Nos relatórios mensais, as evidências fotográficas são preservadas pelo caminho estável do armazenamento privado. Ao criar ou reabrir um rascunho, o sistema renova o acesso das imagens; durante o PDF, baixa cada foto autenticada e a redimensiona para incorporação segura, inclusive em dispositivos móveis. O PDF não é concluído silenciosamente se alguma foto selecionada falhar.

O sino pulsa enquanto houver notificações novas para o usuário. Cada notificação desaparece somente após ser aberta, e essa leitura é registrada de forma imutável na rastreabilidade com usuário, origem, item e horário.

A auditoria geral permanece obrigatoriamente habilitada e não pode ser desligada pela interface ou pelo banco. Ela usa a identidade autenticada, registra as tabelas operacionais e preserva os históricos anteriores que já possuíam autoria e data confiáveis. A consulta abre somente os movimentos de hoje, busca o período diretamente no banco e apresenta módulos e campos técnicos com nomes em português.

## Últimas novidades

### Solicitações de compras com aprovação e rastreabilidade

**Finalidade:** organizar necessidades de materiais, serviços e obras desde a justificativa até o recebimento, vinculando cada solicitação aos projetos, editais e programas beneficiados diretamente.

**Como usar:** acesse **Operações → Solicitações de compras**, informe a necessidade, os itens e valores estimados, selecione o programa beneficiado diretamente e, quando aplicável, vincule um projeto ou edital. Confira a prévia antes do envio. Solicitações dos demais usuários exigem aprovação de Reinaldo e Thaís; quando um deles é o solicitante, somente o outro aprova, impedindo autoaprovação.

### Despesas mais rápidas e armazenamento seguro

**Finalidade:** acelerar o preenchimento das prestações de contas e impedir arquivos sem vínculo no armazenamento.

**Como usar:** ao criar um relatório, o sistema preenche usuário, programa e cargo conforme o perfil autenticado. Somente **Banco** e **Forma de crédito** são obrigatórios. As datas dos comprovantes não aceitam dias anteriores à data atual e exibem automaticamente o mês e o ano da competência. Os comprovantes permanecem locais até o salvamento; cancelar ou abandonar o formulário não envia arquivos ao Storage.

### Manutenção administrativa de dados

**Finalidade:** permitir a remoção controlada de cadastros de teste e aplicar políticas de retenção sem expor dados estruturais.

**Como usar:** administradores acessam **Administração → Manutenção de dados**, escolhem exclusão a partir ou até uma data, selecionam as categorias e geram uma prévia. A exclusão exige a confirmação digitada `EXCLUIR`. A mesma página oferece reconciliação de arquivos órfãos mediante confirmação independente.

### Calendário responsivo e identificação por programa

**Finalidade:** facilitar a leitura rápida do planejamento mensal sem perder detalhes em telas pequenas.

**Como usar:** no computador, alterne entre **Mês** e **Agenda**; no celular, consulte a lista cronológica otimizada. Os cartões e a legenda usam as mesmas cores dos programas. Clique ou toque em uma legenda para filtrar, selecione-a novamente para mostrar todos e abra um dia para consultar o painel de detalhes. O atalho **Nova atividade neste dia** abre o cadastro com a data preenchida.

### Mensagens integradas às atividades

**Finalidade:** substituir avisos nativos do navegador por confirmações e mensagens acessíveis, consistentes com o modo claro, escuro e a experiência mobile.

**Como usar:** validações e erros aparecem dentro da tela. Ao remover um comentário, confirme a ação no diálogo próprio; o comentário deixa de aparecer na conversa, mas a remoção permanece registrada para auditoria.

### Tradução híbrida de toda a aplicação

**Finalidade:** apresentar tanto a interface quanto os conteúdos cadastrados em português, inglês ou espanhol sem alterar os registros originais.

**Como usar:** selecione o idioma no cabeçalho. Textos dinâmicos visíveis são traduzidos em lotes e reutilizados pelo cache privado do Supabase. Em inglês ou espanhol, o botão `Ver texto original` permite alternar a visualização. Nomes próprios, códigos, URLs, e-mails, datas e valores são preservados.

Por padrão, a tradução automática fica **desabilitada**. Um administrador pode ativá-la em **Configurações > Tradução geral automática** somente depois de configurar o Azure Translator. Desabilitada, a aplicação mantém apenas as traduções convencionais e não observa a página, chama a Edge Function ou consome qualquer serviço externo.

### Eventos integrados às atividades

**Finalidade:** organizar seminários, workshops, mostras, encontros, feiras e outras iniciativas ambientais sem duplicar cadastros.

**Como usar:** no lançamento rápido, marque **Esta atividade é um evento**. Preencha tipo, situação, período, temática, formato, local, público, parceiros, contrapartidas e resultados. A página **Eventos** consolida os registros, oferece filtros e gera a programação em PDF.

### Horários obrigatórios e carga horária

**Finalidade:** permitir a contabilização confiável das horas dedicadas às atividades.

**Como usar:** toda nova atividade exige descrição, data e horários de início e finalização. A finalização deve ser posterior ao início. Relatórios mensais individuais e de programas mostram as horas por atividade e a carga horária total.

### Dashboard visual e interativo

**Finalidade:** facilitar a leitura do desempenho do período.

**Como usar:** o painel mostra percentual concluído, realizadas, restantes e distribuição por status. Os indicadores abrem o Histórico com os filtros correspondentes. Atividades canceladas aparecem na distribuição, mas não reduzem a taxa de conclusão.

### Navegador inteligente de período

**Finalidade:** reunir navegação semanal/mensal e contexto do período em um único componente.

**Como usar:** alterne entre **Semana** e **Mês**, utilize as setas, clique na data para escolher outro período, pressione `H` para Hoje ou deslize horizontalmente no celular.

### Central de ações rápidas

**Finalidade:** reduzir o caminho até as operações mais frequentes.

**Como usar:** abra o botão amarelo ou pressione `Alt + N`. É possível criar atividade, evento, reserva de veículo, relatório de despesas, aviso ou abrir o calendário. A recomendação acompanha a página atual; `Esc` fecha o painel.

### Interface institucional atualizada

- Footer compacto com logotipo, status da conexão, atalhos, redes sociais e Voltar ao topo.
- Seletor de idiomas personalizado com uma bandeira por idioma.
- Padrão cromático consistente entre menus, atalhos e módulos.
- Melhorias de responsividade, acessibilidade, modo escuro e redução de movimento.

### Colaboração e linha do tempo

**Finalidade:** melhorar a comunicação da equipe e tornar as mudanças da atividade mais fáceis de consultar.

**Como usar:** na aba **Conversa**, escreva, mencione, responda, edite ou remova seus comentários; `Ctrl + Enter` envia. Na aba **Histórico**, pesquise e filtre movimentos por status, alterações ou pessoas. Os dois painéis recebem atualizações em tempo real.

## Funcionalidades

### Acesso e segurança

- Autenticação por e-mail e senha via Supabase Auth.
- Troca obrigatória da senha temporária no primeiro acesso, com controles para visualizar ou ocultar a nova senha e sua confirmação durante a digitação.
- A finalização da primeira troca altera somente os campos de segurança do próprio perfil e registra o evento no histórico de acessos.
- A tela informa claramente o mínimo de 8 caracteres e exige uma dica pessoal que não contenha a senha; a dica fica isolada dos perfis e só aparece após a confirmação do link de recuperação enviado ao e-mail do usuário.
- Recuperação de senha por e-mail.
- Bloqueio após três tentativas incorretas e notificação de segurança.
- Desativação, reativação e redefinição administrativa de acesso.
- Histórico de acessos e auditoria imutável do sistema.

### Agenda e atividades

- Dashboard semanal e mensal, cards ou lista.
- Calendário com visualizações Mês e Agenda no computador e lista cronológica no celular.
- Cartões e legenda interativa com as cores dos programas, também utilizada como filtro rápido.
- Painel de detalhes do dia e criação rápida de atividade com data preenchida.
- Filtros por programa, responsável, período e pesquisa textual.
- Lançamento rápido ou importação de programação no formato WhatsApp.
- Descrição, início e finalização obrigatórios.
- Títulos e descrições são padronizados ao salvar, com primeira letra maiúscula e demais letras minúsculas, independentemente da digitação original.
- Prioridade, status, responsável, envolvidos e menções com `@nome`.
- Repetição de atividades, comentários e histórico de alterações.
- Conversas encadeadas, menções com nomes completos, edição e remoção lógica de comentários mediante diálogo de confirmação.
- Validações, erros e confirmações integrados à interface, sem caixas nativas do navegador nos detalhes da atividade.
- Linha do tempo pesquisável e filtrável, agrupada por data.
- Fotos e documentos como evidências.
- Compartilhamento pelo WhatsApp e exportação em PDF/CSV.
- Identificação visual de atividades atrasadas e eventos.

### Eventos

- Evento modelado como uma atividade especializada (`is_event` + `event_data`).
- Tipo, situação, período, formato, temática e local.
- Público previsto e alcançado.
- Parceiros, contrapartidas, resultados e observações.
- Evidências fotográficas e documentais.
- Visão consolidada, filtros e programação em PDF.

### Gestão de projetos

- Cadastro de projetos estratégicos, operacionais, emergenciais e compulsórios.
- Categorias, programas, objetivos, responsáveis, equipe, parceiros, financiadores e cronograma.
- Kanban com movimentação por arrastar e histórico de mudanças.
- Tarefas, etapas, entregas, pesos, horas, riscos e planos de resposta.
- Progresso manual, por tarefas ou ponderado.
- Orçamento previsto, comprometido e realizado.
- Atividades vinculadas, comentários, documentos e evidências.
- Painel com indicadores e gráficos por situação, tipo, prazo e execução financeira.
- Filtros, lista gerencial, relatório individual em PDF e portfólio em CSV.

### Relatórios mensais

- Relatórios individuais ou consolidados por programa.
- Geração de rascunho a partir da agenda.
- Seleção de atividades e fotografias para o PDF.
- Objetivos, resultados, categorias, indicadores e próximos passos.
- Carga horária por atividade e total do relatório.
- Fluxo de rascunho, finalização, consulta, substituição e regeneração.
- Evidências em páginas próprias e links internos para anexos.

### Relatórios de despesas

- Prestação de contas com adiantamento, despesas e saldo.
- Categorias, comprovantes e quilometragem.
- Preenchimento automático de usuário, programa e cargo conforme o usuário autenticado.
- Banco e forma de crédito como únicos campos obrigatórios do formulário.
- Competência mensal visível e bloqueio de datas de comprovantes anteriores ao dia atual.
- Upload transacional: comprovantes são enviados somente ao salvar, com compensação automática em caso de falha.
- Prévia obrigatória com identificação, despesas, anexos e totais antes da confirmação da finalização.
- Rascunhos podem ser excluídos por usuários autenticados; após a finalização, a exclusão é restrita ao administrador.
- Fluxo individual e rastreável de aprovação: Reinaldo e Thaís aprovam um ao outro; relatórios dos demais usuários exigem as duas aprovações.
- Aprovação parcial, solicitação de ajustes, reprovação justificada, notificações e histórico de cada decisão.
- Painel visual com responsáveis, progresso, datas e observações, também incorporado ao PDF.
- PDF, impressão e resumo consolidado por programa e descrição.

### Solicitações de compras

- Numeração incremental automática e rascunhos editáveis pelo solicitante.
- Consulta disponível para todos os usuários autenticados; cada solicitante edita seus próprios rascunhos ou solicitações devolvidas para ajustes, enquanto o administrador pode editar qualquer registro.
- Exclusão restrita exclusivamente ao perfil Administrador, inclusive para rascunhos.
- Itens com especificação, quantidade, unidade, valor unitário e total estimado automático.
- Textos narrativos são padronizados ao salvar com primeira letra maiúscula e demais letras minúsculas; códigos, números de documentos, datas e anexos são preservados.
- Justificativa, urgência, data necessária, local de entrega, fonte do recurso e fornecedor sugerido.
- Indicação obrigatória de ao menos um programa beneficiado diretamente, com vínculo opcional a projeto de gestão e edital.
- Prévia obrigatória antes do envio para análise.
- Aprovação individual e auditável de Reinaldo e Thaís, sem autoaprovação.
- Solicitação de ajustes e reprovação com parecer obrigatório.
- Acompanhamento operacional por cotação, pedido, recebimento parcial, recebimento e cancelamento.
- Notificações em tempo real e histórico de decisões e mudanças de situação.
- Linha do tempo operacional imutável com autoria e data para cotações solicitadas e recebidas, fornecedores, proposta escolhida, pedido, nota fiscal, pagamento e recebimentos.
- Comentários e documentos da equipe vinculados ao processo; anexos são enviados de forma compensável para impedir arquivos sem referência quando o registro falha.

### Veículos

- Cadastro e situação da frota.
- Reserva por pessoa, programa, período, finalidade e destino.
- Quando existe somente um veículo disponível, ele é selecionado automaticamente; o programa também é preenchido conforme o responsável autenticado.
- Saída e retorno não aceitam datas ou horários anteriores ao momento atual, com validação duplicada na interface e no Supabase.
- Controle de disponibilidade e conflitos.
- Finalização com quilometragem, ocorrências e avarias.

### Comunicação e conteúdo

- Notificações em tempo real.
- Mural de avisos por período e programa.
- Repositório de arquivos compartilhados.
- Alertas visuais para novidades.

### Administração

- Pessoas, programas e líderes.
- Remoção de líderes de programas restrita ao perfil Administrador, com validação na interface e RLS no Supabase.
- Perfis, permissões e fotos de usuário.
- Configurações avançadas dos modos de lançamento.
- Auditoria e rastreabilidade com filtros e comparação dos dados.
- Manutenção restrita a administradores, com prévia, filtro por data, categorias independentes, confirmação reforçada e registro da operação.
- Reconciliação entre banco e Storage para remoção segura de arquivos órfãos.
- Interface em português, inglês e espanhol.
- Tema claro/escuro e instalação como PWA.

## Tecnologias

- React 19
- React Router
- Vite
- Tailwind CSS
- Supabase PostgreSQL, Auth, Storage, Realtime e Edge Functions
- date-fns
- Framer Motion
- jsPDF e jspdf-autotable
- Vite PWA

## Executar localmente

Requisitos:

- Node.js 20 ou superior
- npm
- Projeto Supabase configurado

```bash
git clone <url-do-repositorio>
cd agendairacambi
npm install
```

Crie `.env.local` na raiz:

```env
VITE_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
```

Inicie o ambiente:

```bash
npm run dev
```

O endereço padrão é `http://localhost:5173`.

## Preparação do Supabase

Os scripts SQL estão em `supabase/`. Em uma instalação nova, execute no SQL Editor os scripts aplicáveis, respeitando as dependências:

1. Estrutura-base já utilizada pelo projeto.
2. `user_authentication.sql` — autenticação, perfis e tentativas de login.
3. `profile_photos.sql` — fotos de perfil e políticas de storage.
4. `activity_storage.sql` — buckets e políticas para fotos, documentos e evidências das atividades.
5. `notification_system.sql` — notificações e leituras.
6. `monthly_activity_reports.sql` — relatórios mensais.
7. `expense_reports.sql` — despesas e fluxo financeiro.
8. `expense_report_approvals.sql` — aprovações individuais, decisões, notificações e rastreabilidade financeira.
9. `vehicle_module.sql` — frota e reservas.
10. `activity_events.sql` — especialização de atividades como eventos.
11. `activity_hours.sql` — horário inicial e regras obrigatórias de descrição e período.
12. `activity_collaboration.sql` — permissão segura para edição dos próprios comentários.
13. `dynamic_translations.sql` — cache privado das traduções automáticas.
14. `project_management.sql` — projetos, Kanban, tarefas, riscos, histórico e notificações.
15. `migrations/20260811153000_purchase_requests.sql` — solicitações de compras, vínculos, aprovações, linha do tempo e notificações.
16. `migrations/20260811213000_audit_notification_reads.sql` — leitura individual de notificações com alerta visual e rastreabilidade imutável.
17. `migrations/20260811214500_normalize_kombi_purchase_request.sql` — correção do título legado da solicitação de manutenção da Kombi conforme o padrão textual.
18. `migrations/20260811223000_make_system_audit_permanent.sql` — auditoria permanente, identidade autenticada, cobertura operacional ampliada e recuperação de históricos confiáveis.
15. `system_audit.sql` — auditoria e rastreabilidade.
16. `person_deactivation.sql` e correções específicas ainda não aplicadas ao ambiente.
17. `access_session_tracking.sql` — acesso exclusivo de Reinaldo ao histórico e medição da duração das sessões; execute após `user_authentication.sql`.

Os scripts `activity_events.sql` e `activity_hours.sql` são idempotentes e não apagam atividades existentes. As validações de horários preservam o histórico anterior e passam a ser exigidas em novos cadastros e alterações.

### Scripts administrativos

Não execute como migrações recorrentes:

- `reset_monthly_report_number.sql` — reinicia numeração de ambiente de teste.
- `setup-authentication.ps1` — provisiona usuários e Edge Functions.
- `enable_legacy_temporary_access.sql` — acesso temporário durante a transição.
- `activate_authenticated_access.sql` — encerra o acesso legado na publicação definitiva.

Consulte `supabase/TRANSITION_TO_AUTH.md` e `supabase/AUTH_SETUP.md`. Não execute os dois scripts de transição simultaneamente e não publique credenciais reais.

### Provisionar autenticação

```powershell
powershell -ExecutionPolicy Bypass -File .\supabase\setup-authentication.ps1 -ProjectRef SEU_PROJECT_REF
```

As Edge Functions utilizadas incluem:

- `auth-login`
- `provision-users`
- `admin-reset-password`
- `admin-data-maintenance`
- `cleanup-old-files`
- `delete-expense-report`
- `send-expense-report-email`
- `translate-content`

Após alterações nos módulos de manutenção e armazenamento, publique as funções correspondentes:

```powershell
supabase functions deploy admin-data-maintenance --project-ref SEU_PROJECT_REF
supabase functions deploy cleanup-old-files --project-ref SEU_PROJECT_REF
```

Depois de executar `access_session_tracking.sql`, publique novamente a função de login:

```powershell
supabase functions deploy auth-login --project-ref SEU_PROJECT_REF
```

### Configurar a tradução automática

O texto original permanece no banco da Agenda. A chave do Azure Translator deve existir somente nos segredos das Edge Functions e nunca em arquivos `VITE_*` ou no navegador. Crie um recurso Translator no plano gratuito `F0` e copie chave, região e endpoint na página **Keys and Endpoint** do recurso.

```powershell
supabase secrets set AZURE_TRANSLATOR_KEY=SUA_CHAVE AZURE_TRANSLATOR_REGION=SUA_REGIAO AZURE_TRANSLATOR_ENDPOINT=SEU_ENDPOINT --project-ref SEU_PROJECT_REF
supabase functions deploy translate-content --project-ref SEU_PROJECT_REF
```

O plano `F0` do Azure Translator oferece uma franquia mensal gratuita e interrompe novas traduções ao atingir o limite. Depois da configuração, teste inglês e espanhol com uma atividade, um comentário, um evento e um relatório.

## Estrutura principal

```text
src/
├── components/    Componentes de interface e módulos
├── context/       Usuário, tema e configurações
├── hooks/         Notificações, conexão e alertas
├── i18n/          Traduções
├── lib/           Supabase, PDFs, eventos e integrações
└── pages/         Páginas e fluxos da aplicação

supabase/
├── functions/     Edge Functions
└── *.sql          Estrutura, migrações e políticas
```

## Validação antes do GitHub

```bash
npm run lint
npm run build
```

Antes do commit:

1. Confirme que as migrações necessárias foram aplicadas no ambiente correto.
2. Teste login, recuperação e primeiro acesso.
3. Teste criação e edição de atividade com horários.
4. Teste evento, veículos, despesas, avisos e uploads.
5. Teste relatórios mensais e PDFs.
6. Como administrador, gere uma prévia na Manutenção de dados sem executar a exclusão.
7. Teste cancelamento de formulários com anexos e confirme que nenhum arquivo órfão é criado.
8. Teste responsividade, idiomas, modo escuro e funcionamento offline.
9. Não versione `.env.local`, tokens, chaves privadas ou senhas. Neste repositório, o `.env` é uma exceção controlada e deve conter exclusivamente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, que são configurações públicas utilizadas pelo frontend.

## Publicação

O frontend pode ser hospedado em qualquer provedor compatível com Vite.

1. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
2. Atualize **Site URL** e **Redirect URLs** no Supabase Auth.
3. Inclua a rota pública `/reset-password` nos redirecionamentos.
4. Confirme RLS, Storage, Realtime e Edge Functions.
5. Execute o build e faça testes de fumaça no ambiente publicado.

## Segurança

- Nunca utilize a chave `service_role` no frontend.
- Não armazene senhas, segredos ou tokens no repositório.
- O `.env` versionado deve conter somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`; qualquer credencial administrativa, chave privada ou segredo de Edge Function deve permanecer fora do Git.
- Mantenha RLS habilitado e revise políticas antes da publicação.
- Restrinja permissões administrativas às responsabilidades reais.
- Preserve os registros de auditoria.

## Manual do usuário

O manual completo e atualizado está disponível dentro da aplicação em **Administração → Manual do usuário**. A primeira seção apresenta as últimas novidades, sua finalidade e a forma de uso.
