import { useState } from "react";
import { Link } from "react-router-dom";

const sections = [
  {
    id: "latest-news",
    icon: "new_releases",
    title: "Últimas novidades",
    purpose: "Apresentar as melhorias mais recentes e explicar como elas tornam o planejamento, o acompanhamento e a prestação de contas mais rápidos e confiáveis.",
    usage: "Explore os recursos abaixo no Dashboard e nos menus. As funções respeitam o perfil do usuário e funcionam em computadores, tablets e celulares.",
    items: [
      "Calendário responsivo: no computador, alterne entre Mês e Agenda; no celular, consulte a lista cronológica otimizada. Os cartões e a legenda usam as cores dos programas para identificação rápida.",
      "Legenda interativa: toque ou clique na cor de um programa para filtrar o calendário; selecione novamente ou use Mostrar todos para remover o filtro.",
      "Detalhes e criação rápida: selecione um dia para abrir o painel lateral no computador ou o painel inferior no celular. Use Nova atividade neste dia para abrir o cadastro com a data preenchida.",
      "Mensagens integradas: confirmações, validações e erros da atividade seguem o visual da aplicação. A remoção de comentário exige confirmação e preserva o registro para auditoria.",
      "Eventos integrados: marque uma atividade como evento para registrar temática, período, público, parceiros, contrapartidas, resultados e evidências; consulte a programação na página Eventos e gere o PDF do período.",
      "Carga horária: descrição, início e finalização são obrigatórios nas novas atividades. Os relatórios mensais calculam as horas por atividade e o total individual ou do programa.",
      "Painel de progresso: o Dashboard apresenta percentual, realizadas, restantes e distribuição por status. Clique em um status para abrir o Histórico já filtrado.",
      "Navegador de período: alterne entre Semana e Mês, use as setas, escolha uma data, pressione H para Hoje ou deslize horizontalmente no celular.",
      "Central inteligente: use o botão amarelo para criar atividade, evento, reserva de veículo, relatório de despesas ou aviso. Abra também com Alt + N e feche com Esc.",
      "Tradução híbrida: selecione Brasil, Estados Unidos ou Espanha. Além dos menus, o sistema traduz automaticamente atividades, comentários, eventos, avisos e relatórios cadastrados, preservando nomes, códigos, datas e valores.",
      "Ao usar inglês ou espanhol, escolha Ver texto original na parte inferior da tela para comparar com o conteúdo armazenado em português; nenhuma tradução substitui o cadastro original.",
      "A tradução automática começa desabilitada. Administradores podem ativá-la nas Configurações Gerais somente após configurar o serviço; desligada, permanecem apenas as traduções convencionais e nenhuma chamada externa é realizada.",
      "Footer institucional: consulte Manual, Configurações, site, redes sociais, situação da conexão e o botão Voltar ao topo.",
    ],
  },
  {
    id: "access",
    icon: "login",
    title: "Acesso, senha e segurança",
    items: [
      "Entre com o e-mail cadastrado e sua senha. No primeiro acesso, substitua obrigatoriamente a senha temporária por uma senha pessoal de pelo menos oito caracteres.",
      "Em caso de esquecimento, use “Esqueceu a senha?” para receber as instruções de recuperação no e-mail cadastrado.",
      "Após três tentativas incorretas, o acesso é bloqueado e o administrador recebe uma notificação de segurança.",
      "Nunca compartilhe sua senha. O administrador pode redefini-la, desativar ou reativar o acesso, mas não consegue visualizar sua senha.",
    ],
  },
  {
    id: "navigation",
    icon: "dashboard",
    title: "Dashboard e navegação",
    items: [
      "O Dashboard reúne as atividades do período. Alterne entre Semana e Mês, navegue pelas setas e use Hoje para retornar ao período atual.",
      "Selecione Todos os programas ou pesquise um programa específico. A busca por título ou descrição funciona em conjunto com o programa e o período escolhidos.",
      "Alterne entre Cards e Lista. A visualização se adapta automaticamente a computador, tablet e celular.",
      "Cada atividade mostra programa, prioridade, status, data, responsável e envolvidos. Abra o card para consultar todos os detalhes.",
      "O pequeno relógio vermelho identifica uma atividade ainda não finalizada cuja data é anterior à semana atual. Passe o cursor ou mantenha o toque para ler a explicação.",
      "No celular, use a barra inferior, o menu e o botão flutuante para acessar rapidamente os principais módulos.",
      "O painel de progresso exclui atividades canceladas do cálculo de conclusão, mas mantém sua quantidade visível na distribuição por status.",
      "Clique nos indicadores Planejadas, Em andamento, Realizadas, Pendentes ou Canceladas para abrir o Histórico com período e contexto preservados.",
      "No navegador de período, clique na data para escolher outro dia; use as setas, o botão Hoje, as teclas direcionais ou o gesto horizontal no celular.",
    ],
  },
  {
    id: "activities",
    icon: "add_task",
    title: "Criação de atividades",
    items: [
      "No modo WhatsApp, cole uma programação com cabeçalhos como “Segunda:” e “Terça-feira:”; o sistema separa o texto e atribui as datas correspondentes.",
      "Se o texto não tiver cabeçalhos reconhecidos, use a opção de transferi-lo para o modo Rápido.",
      "No modo Rápido, informe programa, data, título, descrição, prioridade, início, finalização, responsável e pessoas envolvidas. Descrição e horários são obrigatórios.",
      "Você pode adicionar várias atividades, repetir uma atividade em diversas datas e usar @nome na descrição para mencionar e envolver uma pessoa.",
      "Fotos e documentos podem ser anexados como evidência. No modo WhatsApp, os anexos informados são aplicados às atividades geradas.",
      "Depois de publicar, compartilhe uma atividade ou a programação pelo WhatsApp usando o texto formatado pelo sistema.",
      "No modo WhatsApp, defina os horários de início e finalização que serão aplicados às atividades importadas.",
      "A finalização deve ser posterior ao início. Essas informações alimentam automaticamente a carga horária dos relatórios.",
    ],
  },
  {
    id: "activity-management",
    icon: "edit_calendar",
    title: "Acompanhamento, edição e comentários",
    items: [
      "Nos detalhes, consulte descrição, responsável, envolvidos, anexos e todo o Histórico de Atualizações.",
      "Altere o status entre Planejado, Em andamento, Realizado, Pendente e Cancelado, conforme as permissões do seu perfil.",
      "O cancelamento exige uma justificativa, que permanece registrada. Ao concluir, registre o progresso real e inclua evidências quando necessário.",
      "Edite título, descrição, datas, prioridade, programa e envolvidos. A finalização prevista pode ser prorrogada por dia, semana ou mês.",
      "Use comentários para registrar conversas e @nome para mencionar alguém. A pessoa mencionada será envolvida e notificada.",
      "Na aba Conversa, responda mensagens, edite ou remova seus próprios comentários e use Ctrl + Enter para enviar. A remoção pede confirmação em um diálogo próprio, deixa o comentário invisível na conversa e preserva o registro na auditoria.",
      "Na aba Histórico, filtre por status, alterações ou pessoas, pesquise movimentos e expanda registros antigos na linha do tempo.",
      "Comentários e histórico são atualizados em tempo real quando outra pessoa movimenta a atividade.",
      "Ao editar uma atividade antiga, complete descrição, início e finalização antes de salvar novas alterações.",
      "A exclusão é permanente e também remove os anexos armazenados; confira o item e confirme com cuidado.",
    ],
  },
  {
    id: "calendar-programs-stats",
    icon: "calendar_month",
    title: "Calendário, programas e estatísticas",
    items: [
      "No Calendário, use Hoje e as setas para navegar pelos meses. No computador, alterne entre Mês e Agenda; no celular, a agenda é apresentada como uma lista cronológica otimizada.",
      "Os cartões e a legenda identificam cada programa pela mesma cor. Toque ou clique em uma legenda para filtrar; selecione-a novamente ou use Mostrar todos para limpar o filtro.",
      "Selecione um dia para abrir os detalhes em um painel lateral no computador ou inferior no celular. O atalho Nova atividade neste dia abre o cadastro com a data preenchida.",
      "Quando houver mais atividades do que a célula mensal comporta, o calendário exibe duas e informa a quantidade adicional; abra o dia para consultar a lista completa.",
      "A página Programas apresenta cada área em um card e permite abrir suas atividades.",
      "Em Estatísticas, consulte as quantidades por status e a distribuição por programa, navegando entre períodos.",
      "Clique em um indicador de status para abrir o Histórico já filtrado e investigar os registros correspondentes.",
    ],
  },
  {
    id: "events",
    icon: "festival",
    title: "Eventos institucionais",
    items: [
      "O evento é cadastrado como uma atividade: no modo Rápido, marque “Esta atividade é um evento” para abrir os campos complementares.",
      "Informe tipo, situação, período, formato, temática, local, público previsto, parceiros, contrapartidas, resultados esperados e observações.",
      "Responsável e pessoas envolvidas são os mesmos da atividade, evitando cadastros duplicados e mantendo notificações, comentários e histórico.",
      "Após a realização, altere a situação para Realizado e registre público alcançado, contrapartidas cumpridas, resultados obtidos, fotos e documentos.",
      "Na página Eventos, filtre por período, programa, situação ou texto e abra qualquer registro para consultar ou editar seus detalhes.",
      "Use Gerar programação para emitir um PDF com os eventos do período e dos filtros selecionados.",
    ],
  },
  {
    id: "history",
    icon: "history",
    title: "Histórico e exportações",
    items: [
      "No Histórico, filtre as atividades por período, programa, responsável e status, inclusive Cancelado.",
      "A tabela completa permite conferir os dados e abrir uma atividade específica.",
      "Exporte os resultados em CSV para análise em planilhas ou em PDF para salvar, imprimir e compartilhar.",
      "No Dashboard também é possível gerar o relatório em PDF do período exibido.",
    ],
  },
  {
    id: "monthly-reports",
    icon: "picture_as_pdf",
    title: "Relatórios mensais de atividades",
    items: [
      "Escolha mês, programa e responsável e gere um rascunho com as atividades encontradas na agenda. Se não houver atividades, o conteúdo pode ser preenchido manualmente.",
      "Revise o resumo executivo e a equipe; inclua ou retire atividades e complete categoria, objetivo, resultado e observações.",
      "Selecione as fotos que entrarão no PDF, consulte os documentos anexos e preencha indicadores, destaques, dificuldades, pendências e planejamento do próximo mês.",
      "A carga horária é calculada automaticamente entre o início e a finalização de cada atividade e totalizada no relatório mensal individual ou do programa.",
      "Salve o rascunho durante a revisão e finalize somente quando o conteúdo estiver pronto. Relatórios finalizados ficam disponíveis para consulta e PDF.",
      "Se já existir relatório para o mesmo mês, programa e responsável, o sistema solicitará confirmação antes de substituir o anterior. Regerar um rascunho apaga seus complementos manuais.",
      "Durante a geração do PDF, aguarde o aviso de processamento. As Evidências das Atividades começam em nova página e exibem a data de cada atividade.",
      "No PDF, “1 anexo” ou “N anexos” funciona como link para a evidência correspondente; as próprias fotos não possuem link.",
    ],
  },
  {
    id: "project-management",
    icon: "view_kanban",
    title: "Gestão de projetos",
    items: [
      "Cadastre projetos estratégicos, operacionais, emergenciais ou compulsórios e classifique-os por categoria, programa, prioridade, responsável e equipe.",
      "Registre a necessidade, objetivos, resultados esperados, cronograma, parceiros, financiadores, orçamento previsto, comprometido e realizado.",
      "Use o Kanban para arrastar os cartões entre Ideias, Análise, Planejamento, Aprovação, Execução, Pausado, Concluído ou Cancelado; toda movimentação entra no histórico.",
      "Acompanhe tarefas, entregas, horas, progresso automático ou ponderado, riscos, planos de resposta, atividades vinculadas, comentários, documentos e evidências.",
      "Alterne entre Kanban, Painel e Lista. Use filtros por programa, tipo, prioridade e prazo e exporte o portfólio em CSV ou o relatório individual em PDF.",
    ],
  },
  {
    id: "purchase-requests",
    icon: "shopping_cart",
    title: "Solicitações de compras",
    items: [
      "Acesse Operações → Solicitações de compras para registrar materiais, bens, serviços, obras ou instalações necessários.",
      "Informe o objeto, a justificativa, a urgência, a data necessária e os itens. Quantidade e valor unitário formam automaticamente o total estimado.",
      "Vincule a solicitação a um projeto de gestão e, quando aplicável, informe edital, prazo e fonte do recurso.",
      "Selecione um ou mais programas e pessoas beneficiadas ou descreva outro público, como comunidades, parceiros e turmas.",
      "Salve como rascunho para continuar depois. Antes do envio, confira a prévia completa; durante a aprovação o conteúdo fica protegido contra alterações.",
      "Todas as solicitações ficam visíveis aos usuários autenticados. O solicitante pode editar seus próprios rascunhos e solicitações devolvidas para ajustes; o administrador pode editar qualquer registro.",
      "A exclusão é exclusiva do administrador, inclusive quando a solicitação ainda estiver como rascunho.",
      "Solicitações dos demais usuários exigem aprovação de Reinaldo e Thaís. Quando um deles solicita, somente o outro aprova, pois ninguém pode aprovar a própria compra.",
      "Ajustes e reprovações exigem parecer. Após a aprovação, os responsáveis acompanham cotação, pedido, recebimento parcial ou total e eventual cancelamento.",
      "Use a Linha do tempo completa para registrar cada cotação solicitada ou recebida, fornecedor escolhido, pedido, nota fiscal, programação e realização do pagamento e conferência do recebimento.",
      "Cada movimentação guarda autor, data, descrição, fornecedor, número de documento, valor e anexos. Toda a equipe pode registrar comentários e documentos; etapas financeiras e de compras são restritas aos responsáveis.",
      "O solicitante recebe notificações e pode acompanhar o estado, os responsáveis e todas as decisões registradas na trilha de auditoria.",
    ],
  },
  {
    id: "expenses",
    icon: "receipt_long",
    title: "Relatórios de despesas",
    items: [
      "Crie e acompanhe prestações de contas conforme as permissões do seu perfil, informando adiantamento e lançamentos de despesa.",
      "Ao iniciar um relatório, usuário, programa e cargo são preenchidos automaticamente conforme o perfil autenticado; revise os dados antes de salvar.",
      "Somente Banco e Forma de crédito são obrigatórios. Os demais campos podem ser completados conforme a necessidade da prestação de contas.",
      "Registre descrição, valor e comprovantes de cada lançamento; revise os totais e o saldo antes de encaminhar ou finalizar o relatório.",
      "A data do comprovante não pode ser anterior ao dia atual. A competência em mês e ano aparece abaixo do campo de data.",
      "O comprovante fica somente no formulário até o salvamento. Se você cancelar ou sair sem salvar, ele não será enviado ao armazenamento.",
      "Ao clicar em Finalizar relatório, revise a prévia completa e use Confirmar e finalizar somente depois de conferir identificação, despesas, anexos, banco e totais.",
      "Enquanto estiver como rascunho, o relatório pode ser excluído por qualquer usuário autenticado. Depois de finalizado, somente um administrador pode excluí-lo; os demais usuários devem solicitar a operação ao administrador do sistema.",
      "Relatórios de Reinaldo são analisados por Thaís; relatórios de Thaís são analisados por Reinaldo. Para os demais usuários, a aprovação exige a decisão dos dois responsáveis.",
      "Acompanhe o painel Fluxo de aprovação: ele informa aprovações concluídas, análise pendente, data, observação e o progresso geral. Solicitações de ajuste e reprovações exigem justificativa e permanecem no histórico.",
      "Após uma solicitação de ajustes, o autor pode corrigir e reenviar o relatório. O reenvio inicia uma nova rodada de análise.",
      "Gere o PDF da prestação de contas e aguarde o indicador de processamento antes de repetir o comando.",
      "No Resumo dos relatórios, filtre por programa e situação e consulte totalizações por programa, por descrição, fluxo financeiro e rastreabilidade.",
    ],
  },
  {
    id: "vehicles",
    icon: "directions_car",
    title: "Veículos",
    items: [
      "Consulte a disponibilidade e os agendamentos e reserve um veículo informando solicitante, programa, data e hora, finalidade e destino.",
      "Edite ou cancele uma reserva quando necessário. Ao finalizar o uso, informe os dados solicitados e registre ocorrências, avarias ou observações.",
      "Usuários autorizados podem cadastrar e editar veículos, placa e situação: disponível, em manutenção ou inativo.",
    ],
  },
  {
    id: "communication",
    icon: "notifications",
    title: "Notificações e mural de avisos",
    items: [
      "O sino reúne notificações em tempo real sobre atividades, menções, comentários, arquivos, despesas e eventos de segurança destinados ao seu perfil.",
      "Abra uma notificação para acessar o item relacionado ou marque-a como lida. Se houver falha de carregamento, o sistema apresenta o erro em vez de ocultá-lo.",
      "No Mural, publique avisos para todos ou para um programa, navegue pelas semanas e edite ou exclua seus próprios avisos quando permitido.",
      "Os indicadores visuais do cabeçalho avisam quando existem novidades no Mural ou no Repositório.",
    ],
  },
  {
    id: "files",
    icon: "folder",
    title: "Repositório de arquivos",
    items: [
      "Envie documentos com descrição para um programa específico ou para todos os programas.",
      "Navegue entre as semanas para consultar e baixar os arquivos compartilhados.",
      "Os líderes dos programas destinatários recebem notificação de novos documentos.",
      "Exclua manualmente um arquivo quando necessário e observe o prazo de retenção exibido pelo sistema.",
    ],
  },
  {
    id: "profile",
    icon: "account_circle",
    title: "Perfil, aparência e idioma",
    items: [
      "Em Configurações, atualize as informações permitidas do seu perfil e escolha o modo claro ou escuro.",
      "Para a foto de perfil, são aceitas imagens JPG, JPEG, JFIF, PNG e WebP de até 5 MB. Prefira uma imagem quadrada e nítida.",
      "Use o seletor de idioma para alternar a interface entre português, inglês e espanhol.",
      "O seletor personalizado mostra uma única bandeira por idioma: Brasil, Estados Unidos ou Espanha.",
      "O rodapé oferece Manual, Configurações, site, redes sociais, estado da conexão e Voltar ao topo.",
    ],
  },
  {
    id: "administration",
    icon: "admin_panel_settings",
    title: "Administração",
    items: [
      "Somente administradores acessam os cadastros administrativos e as Configurações Avançadas.",
      "Em Programas, crie, edite ou exclua áreas e associe seus líderes. Em Líderes, visualize e altere rapidamente cada vínculo; somente um usuário Administrador pode remover a liderança de um programa.",
      "Em Pessoas, cadastre nome, e-mail e iniciais, altere os dados, redefina senhas e desative, reative ou exclua usuários conforme a necessidade.",
      "Consulte o Histórico de acessos para verificar data, usuário, e-mail e tipo de evento.",
      "Em Manutenção de dados, administradores podem visualizar e excluir registros de teste a partir de uma data, aplicar retenção até uma data e reconciliar arquivos órfãos. A prévia e a confirmação digitada são obrigatórias.",
      "Escolha categorias independentes para a manutenção. Cadastros estruturais, usuários, programas, veículos e configurações ficam protegidos contra limpeza em massa.",
      "Digite EXCLUIR somente depois de revisar a prévia. Para reconciliar o armazenamento, use a confirmação LIMPAR ARQUIVOS; apenas objetos sem referência e com mais de 24 horas são removidos.",
      "Em Configurações Avançadas, habilite ou desabilite os modos de lançamento e a Auditoria e rastreabilidade.",
      "Conceda apenas as permissões necessárias à responsabilidade real de cada pessoa e programa.",
    ],
  },
  {
    id: "audit",
    icon: "policy",
    title: "Auditoria e rastreabilidade",
    items: [
      "A área de Auditoria registra inclusões, edições e exclusões para segurança e prestação de contas e possui acesso restrito.",
      "Filtre por texto, módulo e tipo de movimento e abra Detalhes para comparar os dados anteriores e posteriores.",
      "A auditoria só pode ser ligada ou desligada nas Configurações Avançadas. Seus registros são imutáveis e não devem ser alterados manualmente.",
    ],
  },
  {
    id: "installation-support",
    icon: "install_mobile",
    title: "Instalação, conexão e suporte",
    items: [
      "A aplicação é responsiva e pode ser usada no navegador de computadores, tablets e celulares.",
      "Quando o navegador oferecer a instalação, no Chrome ou Edge use Instalar; no Safari do iPhone ou iPad, use Compartilhar e Adicionar à Tela de Início.",
      "Se aparecer o aviso “Sem conexão”, aguarde a internet retornar antes de salvar, enviar arquivos ou repetir uma operação.",
      "Em caso de dúvida, consulte novamente esta seção ou procure a administração do sistema.",
    ],
  },
];

export default function About() {
  const [openSections, setOpenSections] = useState(() => new Set(["latest-news"]));

  const toggleSection = (id) => {
    setOpenSections((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allOpen = openSections.size === sections.length;
  const toggleAll = () => setOpenSections(allOpen ? new Set() : new Set(sections.map(({ id }) => id)));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <header className="mb-6 rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/10 via-white to-accent/10 p-6 shadow-sm dark:from-primary/20 dark:via-slate-900 dark:to-accent/10 sm:p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
          <span className="material-symbols-outlined" aria-hidden="true">menu_book</span>
        </div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-primary dark:text-accent">Guia completo de utilização</p>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">Manual do Agenda Iracambi</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Consulte todas as funcionalidades da aplicação, do primeiro acesso à gestão de atividades, relatórios, despesas, veículos e administração.
        </p>
      </header>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">Selecione um assunto para exibir as instruções.</p>
        <button type="button" onClick={toggleAll} className="shrink-0 rounded-full border border-primary px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/10 dark:text-accent">
          {allOpen ? "Recolher tudo" : "Expandir tudo"}
        </button>
      </div>

      <section className="space-y-3" aria-label="Seções do manual">
        {sections.map((section) => {
          const isOpen = openSections.has(section.id);
          return (
            <article key={section.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-white/5 ${section.id === "latest-news" ? "border-amber-300 ring-1 ring-amber-200/60 dark:border-amber-800 dark:ring-amber-900/40" : "border-slate-200 dark:border-white/10"}`}>
              <button type="button" onClick={() => toggleSection(section.id)} aria-expanded={isOpen} aria-controls={`manual-${section.id}`} className="flex min-h-16 w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-primary/5 sm:px-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-accent/10 dark:text-accent"><span className="material-symbols-outlined" aria-hidden="true">{section.icon}</span></span>
                <h2 className="flex-1 text-base font-bold text-slate-900 dark:text-white sm:text-lg">{section.title}</h2>
                <span className={`material-symbols-outlined text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true">expand_more</span>
              </button>
              {isOpen && (
                <div id={`manual-${section.id}`} className="border-t border-slate-100 px-5 pb-5 pt-4 dark:border-white/10 sm:px-6 sm:pb-6">
                  {(section.purpose || section.usage) && <div className="mb-5 grid gap-3 md:grid-cols-2">{section.purpose && <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/20"><h3 className="flex items-center gap-2 text-sm font-bold text-primary dark:text-green-300"><span className="material-symbols-outlined text-[19px]" aria-hidden="true">target</span>Finalidade</h3><p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{section.purpose}</p></div>}{section.usage && <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/20"><h3 className="flex items-center gap-2 text-sm font-bold text-blue-800 dark:text-blue-300"><span className="material-symbols-outlined text-[19px]" aria-hidden="true">touch_app</span>Forma de uso</h3><p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{section.usage}</p></div>}</div>}
                  <ul className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                    {section.items.map((item) => <li key={item} className="flex gap-2.5"><span className="material-symbols-outlined mt-0.5 text-base text-primary dark:text-accent" aria-hidden="true">check_circle</span><span>{item}</span></li>)}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <aside className="mt-6 flex flex-col gap-4 rounded-2xl bg-primary p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div><h2 className="text-lg font-bold">Pronto para continuar?</h2><p className="mt-1 text-sm text-white/80">Volte ao painel e consulte suas atividades do período.</p></div>
        <Link to="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 font-semibold text-primary transition-colors hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"><span className="material-symbols-outlined" aria-hidden="true">dashboard</span>Ir para o painel</Link>
      </aside>
    </main>
  );
}
