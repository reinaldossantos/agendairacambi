import { useState } from "react";
import { Link } from "react-router-dom";

const sections = [
  {
    id: "welcome",
    title: "🌿 Bem-vindo(a) ao AGENDA IRACAMBI",
    content: (
      <>
        <p className="mb-4">
          O <strong>AGENDA IRACAMBI</strong> é a ferramenta digital oficial do{" "}
          <strong>Colegiado IRACAMBI®</strong>, desenvolvida para substituir as
          listas de WhatsApp e organizar as atividades semanais de cada programa
          da Associação Amigos de Iracambi.
        </p>
        <p>
          Com esta plataforma você pode lançar tarefas, acompanhar status, envolver
          pessoas, exportar relatórios, anexar fotos, publicar avisos, gerenciar
          arquivos e muito mais — tudo de forma simples, intuitiva e responsiva.
        </p>
      </>
    ),
  },
  {
    id: "start",
    title: "🚀 Primeiros passos",
    content: (
      <ol className="list-decimal ml-5 space-y-2">
        <li>
          <strong>Selecione seu nome</strong> no seletor do canto superior direito.
          Isso identificará você nos comentários, edições e notificações.
        </li>
        <li>
          No computador, clique em{" "}
          <span className="bg-accent/20 text-primary dark:text-white px-2 py-0.5 rounded-full text-sm font-roboto">
            + Nova
          </span>{" "}
          no cabeçalho. No celular, use o botão flutuante{" "}
          <span className="material-symbols-outlined align-middle">add</span>{" "}
          no canto inferior direito.
        </li>
        <li>
          No <strong>Dashboard</strong>, você verá a semana atual (de segunda a
          sábado). Aos domingos, o painel avança automaticamente para a semana
          seguinte.
        </li>
        <li>
          Acesse <strong>Programas</strong> para visualizar cards coloridos com a
          contagem de atividades de cada setor.
        </li>
        <li>
          Use o <strong>Calendário Mensal</strong> para navegar por todas as
          atividades do mês.
        </li>
      </ol>
    ),
  },
  {
    id: "new-activity",
    title: "📋 Lançar Atividades",
    content: (
      <>
        <p className="mb-4">Existem dois modos de lançamento:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-surface dark:bg-white/5 p-4 rounded-xl">
            <h4 className="font-roboto text-label-md mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#075E54]">chat</span>
              Modo WhatsApp
            </h4>
            <p className="text-sm">
              Cole o texto que você já envia no grupo da equipe. O sistema
              reconhece automaticamente cabeçalhos como "Segunda:", "Terça-feira:"
              e transforma cada dia em uma atividade com a data correta.
            </p>
            <p className="text-sm mt-2">
              Se o texto não tiver cabeçalhos, um botão{" "}
              <strong>"Usar modo Rápido"</strong> transfere automaticamente o
              conteúdo para o modo manual.
            </p>
          </div>
          <div className="bg-surface dark:bg-white/5 p-4 rounded-xl">
            <h4 className="font-roboto text-label-md mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#F59E0B]">bolt</span>
              Modo Rápido
            </h4>
            <p className="text-sm">
              Preencha manualmente data, título, descrição e prioridade de cada
              atividade. Você pode adicionar várias atividades de uma vez e marcar
              pessoas envolvidas.
            </p>
          </div>
        </div>
        <p className="text-sm">
          Em ambos os modos, você pode <strong>envolver outras pessoas</strong> —
          elas receberão uma notificação no sino.
        </p>
        <p className="text-sm mt-2">
          Após publicar, o botão{" "}
          <span className="bg-[#25D366] text-white px-2 py-0.5 rounded-full text-xs font-roboto">
            Enviar via WhatsApp
          </span>{" "}
          gera um relatório formatado pronto para compartilhar no grupo.
        </p>
      </>
    ),
  },
  {
    id: "dashboard",
    title: "📊 Dashboard e Filtros",
    content: (
      <>
        <p className="mb-4">
          O painel principal exibe as atividades de <strong>segunda a sábado</strong>.
          No domingo, o sistema já mostra a semana seguinte.
        </p>
        <ul className="list-disc ml-5 space-y-2">
          <li>
            Use as <strong>setas verdes</strong> ou o botão{" "}
            <strong>"Hoje"</strong> para navegar entre as semanas.
          </li>
          <li>
            Os <strong>botões dos programas</strong> têm cores próprias — cada setor
            possui uma tonalidade suave que aparece também nos cards.
          </li>
          <li>
            No computador, você pode <strong>clicar e arrastar</strong> a linha de
            filtros para os lados.
          </li>
          <li>
            Cada card exibe o nome do programa, prioridade (com emoji), status,
            responsável e um ícone de compartilhamento. O círculo com as iniciais e
            a sombra ao passar o mouse herdam a cor do programa.
          </li>
          <li>
            O contador <strong>+2</strong> indica quantas pessoas estão envolvidas
            naquela atividade.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "interaction",
    title: "💬 Interações e Edição",
    content: (
      <>
        <p className="mb-4">Dentro de cada atividade você pode:</p>
        <ul className="list-disc ml-5 space-y-2">
          <li><strong>Comentar</strong> — qualquer pessoa pode deixar mensagens.</li>
          <li><strong>Alterar status</strong> — Planejado, Em andamento, Realizado, Pendente ou Cancelado.</li>
          <li><strong>Cancelar atividade</strong> — exige uma justificativa que fica registrada no histórico.</li>
          <li><strong>Editar</strong> — modificar título, descrição, data, prioridade, programa e pessoas envolvidas.</li>
          <li><strong>Excluir</strong> — remove a atividade permanentemente (com confirmação visual).</li>
          <li><strong>Anexar fotos</strong> — faça upload de imagens para comprovar ocorrências.</li>
        </ul>
        <p className="mt-4">
          Toda mudança fica registrada no <strong>Histórico de Atualizações</strong>,
          onde cada pessoa aparece com uma cor diferente e as alterações são descritas em detalhes.
        </p>
      </>
    ),
  },
  {
    id: "notifications",
    title: "🔔 Notificações",
    content: (
      <>
        <p className="mb-4">
          O ícone de sino no cabeçalho exibe um número sempre que há novidades
          para você. Você será notificado quando:
        </p>
        <ul className="list-disc ml-5 space-y-2">
          <li>Alguém comentar em uma atividade sua.</li>
          <li>Você for <strong>envolvido(a)</strong> em uma atividade.</li>
          <li>O status de uma atividade sua for alterado (inclusive cancelamento).</li>
          <li>Um <strong>lembrete</strong> automático for gerado (atividades que vencem amanhã).</li>
          <li>Um <strong>arquivo</strong> for enviado para o seu programa ou para todos os programas.</li>
        </ul>
        <p className="mt-4">
          As notificações são atualizadas a cada 5 segundos e também em tempo real
          via Supabase. Para fechar a lista, clique fora ou no próprio ícone.
        </p>
      </>
    ),
  },
  {
    id: "export",
    title: "📤 Exportar para WhatsApp e PDF",
    content: (
      <>
        <p className="mb-4">Existem várias formas de compartilhar informações:</p>
        <ul className="list-disc ml-5 space-y-2">
          <li>
            No <strong>card da atividade</strong>, o ícone verde de compartilhar
            envia os dados daquela atividade para o WhatsApp.
          </li>
          <li>
            Após <strong>publicar uma agenda</strong>, o botão "Enviar via WhatsApp"
            gera um relatório formatado com emojis e marcadores.
          </li>
          <li>
            No <strong>Dashboard</strong> e no <strong>Histórico</strong>, o botão{" "}
            <span className="text-red-500 font-bold">PDF</span> gera um relatório
            profissional com logotipo, tabela colorida e rodapé institucional.
          </li>
        </ul>
        <p className="text-sm mt-2">
          O PDF pode ser salvo, impresso ou compartilhado oficialmente.
        </p>
      </>
    ),
  },
  {
    id: "calendar",
    title: "📅 Calendário Mensal",
    content: (
      <>
        <p className="mb-4">
          Acesse o calendário pelo ícone{" "}
          <span className="material-symbols-outlined align-middle">calendar_month</span>{" "}
          no cabeçalho. Você pode:
        </p>
        <ul className="list-disc ml-5 space-y-2">
          <li>Navegar entre os meses com as setas ou voltar para o mês atual com o botão <strong>Hoje</strong>.</li>
          <li>Filtrar por programa usando os botões coloridos (arrastáveis).</li>
          <li>Clicar em um dia para ver a lista de atividades daquela data.</li>
          <li>Os dias que possuem atividades mostram bolinhas coloridas e uma legenda abaixo da grade.</li>
        </ul>
      </>
    ),
  },
  {
    id: "stats",
    title: "📊 Dashboard de Estatísticas",
    content: (
      <>
        <p className="mb-4">
          Acesse as estatísticas pelo ícone{" "}
          <span className="material-symbols-outlined align-middle">bar_chart</span>{" "}
          no cabeçalho. Você verá:
        </p>
        <ul className="list-disc ml-5 space-y-2">
          <li>Cards com a contagem de atividades por status.</li>
          <li>Um gráfico de barras colorido mostrando a distribuição de atividades por programa na semana atual.</li>
          <li>Navegação entre semanas (setas + Hoje) para comparar períodos.</li>
        </ul>
      </>
    ),
  },
  {
    id: "announcements",
    title: "📢 Mural de Avisos",
    content: (
      <>
        <p className="mb-4">
          Acesse o mural pelo ícone{" "}
          <span className="material-symbols-outlined align-middle">campaign</span>{" "}
          no cabeçalho. Quando há novos avisos na semana, o ícone{" "}
          <strong className="text-red-500">pulsa em vermelho</strong>. Você pode:
        </p>
        <ul className="list-disc ml-5 space-y-2">
          <li><strong>Publicar</strong> um novo aviso com título, conteúdo e programa (opcional).</li>
          <li><strong>Editar</strong> ou <strong>excluir</strong> seus próprios avisos (e avisos anônimos).</li>
          <li>Navegar entre as semanas para ver os avisos por período.</li>
        </ul>
      </>
    ),
  },
  {
    id: "files",
    title: "📁 Repositório de Arquivos",
    content: (
      <>
        <p className="mb-4">
          Acesse o repositório pelo ícone{" "}
          <span className="material-symbols-outlined align-middle">folder</span>{" "}
          no cabeçalho. Quando há novos arquivos na semana, o ícone{" "}
          <strong className="text-blue-500">pulsa em azul</strong>. Você pode:
        </p>
        <ul className="list-disc ml-5 space-y-2">
          <li><strong>Enviar</strong> arquivos para um programa específico ou para <strong>todos os programas</strong>.</li>
          <li>Adicionar uma <strong>descrição</strong> ao arquivo antes do upload.</li>
          <li>Visualizar os arquivos por semana (com navegação igual ao Dashboard).</li>
          <li><strong>Excluir</strong> arquivos manualmente (ou aguardar a exclusão automática após 30 dias).</li>
          <li>Quando um arquivo é enviado, o(s) líder(es) do programa recebem uma <strong>notificação</strong>.</li>
        </ul>
      </>
    ),
  },
  {
    id: "history",
    title: "📜 Histórico e Relatórios",
    content: (
      <>
        <p className="mb-4">
          Acesse o histórico pela barra inferior (mobile) ou pelo menu. Você pode:
        </p>
        <ul className="list-disc ml-5 space-y-2">
          <li>Filtrar por período, programa, responsável ou status (incluindo Cancelado).</li>
          <li>Visualizar uma tabela completa com todas as atividades.</li>
          <li><strong>Exportar CSV</strong> para análise externa.</li>
          <li><strong>Exportar PDF</strong> com o mesmo formato profissional.</li>
        </ul>
      </>
    ),
  },
  {
    id: "pwa",
    title: "📱 Instalar como Aplicativo (PWA)",
    content: (
      <>
        <p className="mb-4">
          O AGENDA IRACAMBI pode ser instalado no seu celular ou computador como
          um aplicativo nativo, sem precisar da loja de apps.
        </p>
        <ul className="list-disc ml-5 space-y-2">
          <li>No <strong>Chrome/Edge</strong> (Android ou desktop): clique no ícone de "Instalar" na barra de endereço.</li>
          <li>No <strong>Safari</strong> (iOS): toque no botão "Compartilhar" e depois em "Adicionar à Tela de Início".</li>
        </ul>
        <p className="mt-4">
          O app funcionará offline para consultas rápidas e enviará notificações
          (quando suportado pelo navegador).
        </p>
      </>
    ),
  },
  {
    id: "admin",
    title: "⚙️ Administração",
    content: (
      <>
        <p className="mb-4">
          No cabeçalho você encontrará ícones para gerenciar:
        </p>
        <ul className="list-disc ml-5 space-y-2">
          <li>
            <span className="material-symbols-outlined align-middle">admin_panel_settings</span>{" "}
            <strong>Programas</strong> — criar, editar e definir um líder.
          </li>
          <li>
            <span className="material-symbols-outlined align-middle">group</span>{" "}
            <strong>Pessoas</strong> — cadastrar membros com nome e iniciais.
          </li>
          <li>
            <span className="material-symbols-outlined align-middle">diversity_3</span>{" "}
            <strong>Líderes</strong> — visualizar e trocar rapidamente o líder de cada programa.
          </li>
          <li>
            <span className="material-symbols-outlined align-middle">settings</span>{" "}
            <strong>Configurações</strong> — ativar modo escuro e selecionar idioma.
          </li>
        </ul>
        <p className="mt-4">
          Todos os botões possuem dicas (passe o mouse para ver a descrição).
          No celular, esses ícones estão disponíveis no menu hambúrguer.
        </p>
      </>
    ),
  },
  {
    id: "tips",
    title: "💡 Dicas e Suporte",
    content: (
      <>
        <p className="mb-4">
          - Os botões têm no mínimo <strong>44px</strong> de altura, pensados para
          o toque em telas mobile.
        </p>
        <p className="mb-4">
          - As <strong>redes sociais</strong> e o site oficial estão disponíveis
          no rodapé de todas as páginas.
        </p>
        <p className="mb-4">
          - O <strong>modo escuro</strong> pode ser ativado em Configurações, com
          visual translúcido e mais suave.
        </p>
        <p>
          🌳 Em caso de dúvidas, procure a equipe de desenvolvimento ou acesse a
          seção de administração do sistema.
        </p>
      </>
    ),
  },
];

export default function About() {
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (id) => {
    setOpenSection(openSection === id ? null : id);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <div className="mb-8">
        <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-2">
          Manual do AGENDA IRACAMBI
        </h2>
        <p className="font-roboto text-on-surface-variant dark:text-gray-400">
          Um guia rápido para todas as funcionalidades.
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div
            key={section.id}
            className="bg-white dark:bg-white/5 border border-surface-variant dark:border-white/10 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-surface dark:hover:bg-white/5 transition-colors"
            >
              <span className="font-roboto text-headline-md text-primary dark:text-white">
                {section.title}
              </span>
              <span
                className={`material-symbols-outlined text-outline dark:text-gray-400 transition-transform duration-300 ${
                  openSection === section.id ? "rotate-180" : ""
                }`}
              >
                expand_more
              </span>
            </button>
            {openSection === section.id && (
              <div className="px-6 pb-6 font-roboto text-body-md text-on-surface dark:text-gray-200 leading-relaxed">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-label-sm text-outline dark:text-gray-500">
          🌱 Colegiado IRACAMBI®
        </p>
        <Link
          to="/"
          className="inline-block mt-4 px-6 py-2 rounded-full bg-accent text-primary font-roboto text-label-md hover:bg-yellow-400 transition-all active:scale-95"
        >
          Ir para o Dashboard
        </Link>
      </div>
    </div>
  );
}