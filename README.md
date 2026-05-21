# AGENDA IRACAMBI

Sistema de gestão de atividades semanais para o Colegiado IRACAMBI.

## 🚀 Tecnologias

- React 19
- Vite
- Tailwind CSS
- Supabase (banco de dados, storage, realtime)
- date-fns
- framer-motion
- jsPDF + jspdf-autotable

## ✨ Funcionalidades principais

- **Dashboard** com cards compactos (até 5 por linha em desktop), filtro por programa, navegação semanal, exportação PDF.
- **Lançamento de atividades**:
  - Modo WhatsApp (parsing de texto)
  - Modo Rápido (formulário dinâmico, repetição, menções `@`)
  - Upload de fotos e arquivos (PDF, DOC, XLS, ZIP, etc.)
- **Detalhe da atividade**:
  - Edição completa (título, descrição, data, prioridade, responsável, envolvidos)
  - Data/hora de finalização prevista com botões de prorrogação (+/- dia, semana, mês)
  - Comentários com menções
  - Histórico de atualizações
  - Cancelamento com justificativa
  - Remoção de anexos do storage ao excluir
- **Calendário mensal** interativo (bolinhas coloridas, legenda, filtro por programa)
- **Estatísticas** semanais com gráfico de barras; clicar nos cards de status filtra o histórico
- **Histórico** com filtros (programa, responsável, status, período) e exportação CSV/PDF
- **Mural de avisos** com navegação semanal e permissões
- **Repositório de arquivos** por programa, com notificação aos líderes e exclusão automática após 30 dias
- **Administração** de programas, pessoas e líderes
- **Notificações em tempo real** (sino) via Supabase Realtime (sem polling)
- **Modo escuro** e **internacionalização** (pt, en, es)
- **PWA** – instalação como aplicativo

## 📦 Instalação

```bash
git clone https://github.com/seu-usuario/agenda-iracambi.git
cd agenda-iracambi
npm install


