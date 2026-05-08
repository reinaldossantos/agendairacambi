# 🌳 AGENDA IRACAMBI

**Agenda virtual para o Colegiado IRACAMBI®**  
Organize as atividades semanais dos seus programas, acompanhe status,
envolva pessoas e gere relatórios instantâneos para o WhatsApp.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38BDF8?logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-backend-3ECF8E?logo=supabase)](https://supabase.com/)
[![Vite](https://img.shields.io/badge/Vite-⚡-646CFF?logo=vite)](https://vitejs.dev/)
[![Framer Motion](https://img.shields.io/badge/animation-Framer%20Motion-0055FF?logo=framer)](https://www.framer.com/motion/)
[![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8)](https://web.dev/progressive-web-apps/)

---

## 🚀 Funcionalidades

- 📋 **Lançamento de atividades** com dois modos: WhatsApp (parser inteligente) e Rápido.
- 👥 **Envolvimento de pessoas** nas atividades – todos recebem notificações.
- 🔔 **Notificações em tempo real** (comentários, envolvimentos, lembretes, arquivos).
- 🏷️ **Prioridades**: Baixa, Média, Alta e Urgente – cada uma com cor própria.
- 📸 **Upload de fotos** para comprovação de ocorrências.
- 📊 **Dashboard de estatísticas** com gráficos e contadores.
- 📅 **Calendário mensal** com navegação e filtros coloridos.
- 📢 **Mural de avisos** por programa (editar/excluir pelo autor).
- 📁 **Repositório de arquivos** por programa, com exclusão automática após 30 dias.
- 📤 **Exportação para WhatsApp** – relatório formatado com um clique.
- 🌙 **Modo escuro** translúcido (configurável).
- 📱 **Responsividade completa** – desktop, tablet e celular com menu hambúrguer.
- ⚡ **PWA** – instale no celular como aplicativo nativo.
- ♿ **Acessibilidade** – botões com área de toque mínima de 44px e dicas visuais.

---

## 📦 Tecnologias

| Camada         | Tecnologia                                 |
| -------------- | ------------------------------------------ |
| Frontend       | React 18, Vite, Tailwind CSS 3             |
| Backend        | Supabase (banco PostgreSQL + Storage)      |
| Animações      | Framer Motion                              |
| Ícones         | Material Symbols (Google Fonts)            |
| Notificações   | Supabase Realtime + Polling (15s)          |
| PWA            | vite-plugin-pwa (Workbox)                  |

---

## ⚙️ Pré‑requisitos

- Node.js 18+ e npm 9+
- Conta gratuita no [Supabase](https://supabase.com/)

---

## 🛠️ Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/iracambi-agenda.git
cd iracambi-agenda

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local

Preencha o arquivo .env.local com as credenciais do seu projeto Supabase:
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

-- Criação das tabelas principais (programs, persons, activities, activity_logs)
-- Inserção dos programas padrão e pessoas iniciais
-- Criação dos buckets de storage e políticas de acesso
-- (todo o script sql que você já tem – separei em snippets executáveis)

npm run dev

npm run build
npm run preview


src/
├── components/
│   ├── activities/     # ActivityCard, CommentSection, PhotoUpload
│   ├── layout/         # Header, Footer, Layout, BottomNav, FAB
│   ├── programs/       # ProgramCard
│   └── ui/             # ConfirmDialog, SkeletonCard
├── context/            # CurrentUserContext, ThemeContext
├── hooks/              # useNotifications, useOnlineStatus
├── lib/                # supabaseClient, colors, whatsapp
├── pages/              # Dashboard, NewActivity, ActivityDetail,
│                         History, Calendar, Stats, Announcements,
│                         ProgramFiles, Programs, About, Settings,
│                         AdminPrograms, AdminPersons, AdminLeaders
styles/
├── index.css           # Tailwind directives + Material Symbols
public/
├── logo.webp           # logotipo oficial
├── manifest.json       # PWA manifest
.env.local              # variáveis de ambiente (não versionadas)


