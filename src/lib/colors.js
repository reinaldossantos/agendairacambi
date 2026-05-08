export const userColors = [
  { bg: "bg-[#e8f5e9]", text: "text-[#2e7d32]", ring: "ring-[#2e7d32]", border: "border-[#2e7d32]" },
  { bg: "bg-[#e3f2fd]", text: "text-[#1565c0]", ring: "ring-[#1565c0]", border: "border-[#1565c0]" },
  { bg: "bg-[#fff3e0]", text: "text-[#e65100]", ring: "ring-[#e65100]", border: "border-[#e65100]" },
  { bg: "bg-[#f3e5f5]", text: "text-[#7b1fa2]", ring: "ring-[#7b1fa2]", border: "border-[#7b1fa2]" },
  { bg: "bg-[#fce4ec]", text: "text-[#c62828]", ring: "ring-[#c62828]", border: "border-[#c62828]" },
  { bg: "bg-[#e0f2f1]", text: "text-[#00695c]", ring: "ring-[#00695c]", border: "border-[#00695c]" },
  { bg: "bg-[#fff9c4]", text: "text-[#f57f17]", ring: "ring-[#f57f17]", border: "border-[#f57f17]" },
  { bg: "bg-[#f1f8e9]", text: "text-[#33691e]", ring: "ring-[#33691e]", border: "border-[#33691e]" },
  { bg: "bg-[#ede7f6]", text: "text-[#4527a0]", ring: "ring-[#4527a0]", border: "border-[#4527a0]" },
  { bg: "bg-[#fbe9e7]", text: "text-[#bf360c]", ring: "ring-[#bf360c]", border: "border-[#bf360c]" },
  { bg: "bg-[#e1f5fe]", text: "text-[#0277bd]", ring: "ring-[#0277bd]", border: "border-[#0277bd]" },
  { bg: "bg-[#f9fbe7]", text: "text-[#827717]", ring: "ring-[#827717]", border: "border-[#827717]" },
];

export function getUserColor(personId) {
  if (!personId) return userColors[0];
  let hash = 0;
  for (let i = 0; i < personId.length; i++) {
    hash = personId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return userColors[Math.abs(hash) % userColors.length];
}

// Cores fixas para programas existentes (podem ser personalizadas)
export const programColors = {
  "Assistente de Colegiado": {
    bg: "bg-[#F3E5F5]",
    bgLight: "bg-[#F3E5F5]/30",
    text: "text-[#7B1FA2]",
    border: "border-[#CE93D8]",
    hover: "hover:bg-[#F3E5F5]/50",
  },
  "Educação Ambiental": {
    bg: "bg-[#E8F5E9]",
    bgLight: "bg-[#E8F5E9]/30",
    text: "text-[#2E7D32]",
    border: "border-[#A5D6A7]",
    hover: "hover:bg-[#E8F5E9]/50",
  },
  "Florestas para Água": {
    bg: "bg-[#E0F2F1]",
    bgLight: "bg-[#E0F2F1]/30",
    text: "text-[#00695C]",
    border: "border-[#80CBC4]",
    hover: "hover:bg-[#E0F2F1]/50",
  },
  "Gestão Financeira": {
    bg: "bg-[#FFF3E0]",
    bgLight: "bg-[#FFF3E0]/30",
    text: "text-[#E65100]",
    border: "border-[#FFCC80]",
    hover: "hover:bg-[#FFF3E0]/50",
  },
  "Pesquisas e Monitoramento": {
    bg: "bg-[#E3F2FD]",
    bgLight: "bg-[#E3F2FD]/30",
    text: "text-[#1565C0]",
    border: "border-[#90CAF9]",
    hover: "hover:bg-[#E3F2FD]/50",
  },
  "Relações Institucionais": {
    bg: "bg-[#FCE4EC]",
    bgLight: "bg-[#FCE4EC]/30",
    text: "text-[#C62828]",
    border: "border-[#EF9A9A]",
    hover: "hover:bg-[#FCE4EC]/50",
  },
  "Viveiro e Manutenção": {
    bg: "bg-[#F1F8E9]",
    bgLight: "bg-[#F1F8E9]/30",
    text: "text-[#33691E]",
    border: "border-[#C5E1A5]",
    hover: "hover:bg-[#F1F8E9]/50",
  },
  "Voluntariado": {
    bg: "bg-[#FFF9C4]",
    bgLight: "bg-[#FFF9C4]/30",
    text: "text-[#F57F17]",
    border: "border-[#FFF176]",
    hover: "hover:bg-[#FFF9C4]/50",
  },
};

// Gera cores suaves automaticamente para novos programas
function generateProgramColor(name) {
  if (!name) return programColors["Educação Ambiental"]; // fallback

  // Lista de cores de fundo (tons pastéis)
  const palette = [
    { bg: "#F3E5F5", text: "#7B1FA2", border: "#CE93D8" },
    { bg: "#E8F5E9", text: "#2E7D32", border: "#A5D6A7" },
    { bg: "#E0F2F1", text: "#00695C", border: "#80CBC4" },
    { bg: "#FFF3E0", text: "#E65100", border: "#FFCC80" },
    { bg: "#E3F2FD", text: "#1565C0", border: "#90CAF9" },
    { bg: "#FCE4EC", text: "#C62828", border: "#EF9A9A" },
    { bg: "#F1F8E9", text: "#33691E", border: "#C5E1A5" },
    { bg: "#FFF9C4", text: "#F57F17", border: "#FFF176" },
    { bg: "#EDE7F6", text: "#4527A0", border: "#B39DDB" },
    { bg: "#FBE9E7", text: "#BF360C", border: "#FFAB91" },
    { bg: "#E1F5FE", text: "#0277BD", border: "#81D4FA" },
    { bg: "#F9FBE7", text: "#827717", border: "#E6EE9C" },
  ];

  // Hash simples baseado no nome
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % palette.length;
  const color = palette[index];

  return {
    bg: `bg-[${color.bg}]`,
    bgLight: `bg-[${color.bg}]/30`,
    text: `text-[${color.text}]`,
    border: `border-[${color.border}]`,
    hover: `hover:bg-[${color.bg}]/50`,
  };
}

// Função principal que retorna as cores de um programa
export function getProgramColor(programName) {
  if (programColors[programName]) {
    return programColors[programName];
  }
  // Se não existir, gera automaticamente
  return generateProgramColor(programName);
}