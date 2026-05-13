// import { format, parseISO, addDays } from 'date-fns';
// import { ptBR } from 'date-fns/locale';

// export function shareViaWhatsApp(text) {
//   const encoded = encodeURIComponent(text);
//   const url = `https://wa.me/?text=${encoded}`;
//   window.open(url, '_blank');
// }

// export function formatAgendaForWhatsApp({ program, responsible, weekStart, activities }) {
//   const weekEnd = addDays(parseISO(weekStart), 5);
//   const weekLabel = `${format(parseISO(weekStart), "dd/MM")} a ${format(weekEnd, "dd/MM")}`;

//   let text = `*IRACAMBI - AGENDA DE ATIVIDADES*\n`;
//   text += `Semana: ${weekLabel}\n\n`;
//   text += `*Programa:* ${program}\n`;
//   text += `*Responsável:* ${responsible}\n`;
//   text += `\n━━━━━━━━━━━━━━━\n\n`;

//   if (activities.length === 0) {
//     text += `Nenhuma atividade lançada.\n`;
//   } else {
//     const grouped = {};
//     activities.forEach((act) => {
//       const dateKey = act.due_date;
//       if (!grouped[dateKey]) grouped[dateKey] = [];
//       grouped[dateKey].push(act);
//     });

//     const sortedDates = Object.keys(grouped).sort();
//     sortedDates.forEach((date) => {
//       const dateObj = parseISO(date);
//       const dayOfWeek = format(dateObj, "EEEE, dd/MM", { locale: ptBR });
//       text += `☐ ${dayOfWeek}\n`;
//       grouped[date].forEach((act) => {
//         text += `   • ${act.title}\n`;
//         if (act.description && act.description.trim() !== '') {
//           const desc = act.description.length > 80 ? act.description.substring(0, 80) + '...' : act.description;
//           text += `     ${desc}\n`;
//         }
//       });
//       text += `\n`;
//     });
//   }

//   text += `━━━━━━━━━━━━━━━`;

//   return text;
// }

// com emojis

// import { format, parseISO, addDays } from "date-fns";
// import { ptBR } from "date-fns/locale";

// export function shareViaWhatsApp(text) {
//   const encoded = encodeURIComponent(text);
//   const url = `https://wa.me/?text=${encoded}`;
//   window.open(url, "_blank");
// }

// // Mapeamento simples de programa para emoji (pode ser expandido)
// const programEmojis = {
//   "Educação Ambiental": "📚",
//   "Florestas para Água": "💧🌳",
//   "Relações Institucionais": "🤝",
//   "Viveiro e Manutenção": "🌱",
//   Voluntariado: "🙋",
//   Pesquisas: "🔬",
//   "Gestão Financeira": "💰",
//   "Assistente de Colegiado": "📋",
//   Colegiado: "🏛️",
// };

// function getProgramEmoji(program) {
//   return programEmojis[program] || "📌";
// }

// export function formatAgendaForWhatsApp({
//   program,
//   responsible,
//   weekStart,
//   activities,
// }) {
//   const weekEnd = addDays(parseISO(weekStart), 5);
//   const weekLabel = `${format(parseISO(weekStart), "dd/MM")} a ${format(weekEnd, "dd/MM")}`;
//   const progEmoji = getProgramEmoji(program);

//   let text = `📋 *AGENDA IRACAMBI*\n`;
//   text += `📅 Semana: ${weekLabel}\n\n`;
//   text += `${progEmoji} *Programa:* ${program}\n`;
//   text += `👤 *Responsável:* ${responsible}\n`;
//   text += `\n━━━━━━━━━━━━━━━\n\n`;

//   if (activities.length === 0) {
//     text += `⚠️ Nenhuma atividade lançada.\n`;
//   } else {
//     const grouped = {};
//     activities.forEach((act) => {
//       const dateKey = act.due_date;
//       if (!grouped[dateKey]) grouped[dateKey] = [];
//       grouped[dateKey].push(act);
//     });

//     const sortedDates = Object.keys(grouped).sort();
//     sortedDates.forEach((date) => {
//       const dateObj = parseISO(date);
//       const dayOfWeek = format(dateObj, "EEEE, dd/MM", { locale: ptBR });
//       text += `📌 *${dayOfWeek}*\n`;
//       grouped[date].forEach((act) => {
//         text += `   ▸ ${act.title}\n`;
//         if (act.description && act.description.trim() !== "") {
//           const desc =
//             act.description.length > 80
//               ? act.description.substring(0, 80) + "..."
//               : act.description;
//           text += `     📝 ${desc}\n`;
//         }
//       });
//       text += `\n`;
//     });
//   }

//   text += `━━━━━━━━━━━━━━━\n`;
//   text += `🌿 *Colegiado IRACAMBI®*`;

//   return text;
// }


// atualização nova


import { format, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function shareViaWhatsApp(text) {
  const encoded = encodeURIComponent(text);
  const url = `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank');
}

// Mapeamento de programa para emoji SIMPLES (compatíveis com WhatsApp)
const programEmojis = {
  "Educação Ambiental": "📚",
  "Florestas para Água": "💧",
  "Relações Institucionais": "🤝",
  "Viveiro e Manutenção": "🌱",
  "Voluntariado": "🙋",
  "Pesquisas": "🔬",
  "Gestão Financeira": "💰",
  "Assistente de Colegiado": "📋",
  "Colegiado": "🏛️",
};

function getProgramEmoji(program) {
  return programEmojis[program] || "📌";
}

export function formatAgendaForWhatsApp({ program, responsible, weekStart, activities }) {
  const weekEnd = addDays(parseISO(weekStart), 5);
  const weekLabel = `${format(parseISO(weekStart), "dd/MM")} a ${format(weekEnd, "dd/MM")}`;
  const progEmoji = getProgramEmoji(program);

  let text = `📋 *AGENDA IRACAMBI*\n`;
  text += `📅 Semana: ${weekLabel}\n\n`;
  text += `${progEmoji} *Programa:* ${program}\n`;
  text += `👤 *Responsável:* ${responsible}\n`;
  text += `\n━━━━━━━━━━━━━━━\n\n`;

  if (activities.length === 0) {
    text += `⚠️ Nenhuma atividade lançada.\n`;
  } else {
    const grouped = {};
    activities.forEach((act) => {
      const dateKey = act.due_date;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(act);
    });

    const sortedDates = Object.keys(grouped).sort();
    sortedDates.forEach((date) => {
      const dateObj = parseISO(date);
      const dayOfWeek = format(dateObj, "EEEE, dd/MM", { locale: ptBR });
      text += `📌 *${dayOfWeek}*\n`;
      grouped[date].forEach((act) => {
        text += `   ▸ ${act.title}\n`;
        if (act.description && act.description.trim() !== '') {
          const desc = act.description.length > 80 ? act.description.substring(0, 80) + '...' : act.description;
          text += `     📝 ${desc}\n`;
        }
      });
      text += `\n`;
    });
  }

  text += `━━━━━━━━━━━━━━━\n`;
  text += `🌿 *Colegiado IRACAMBI®*`;

  return text;
}