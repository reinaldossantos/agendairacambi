// // import { Link } from "react-router-dom";
// // import { useEffect, useState } from "react";

// // export default function FAB() {
// //   const [visible, setVisible] = useState(true);
// //   const [lastScroll, setLastScroll] = useState(0);

// //   useEffect(() => {
// //     const handleScroll = () => {
// //       const currentScroll = window.scrollY;

// //       // 🔻 Rolando para baixo → esconde
// //       if (currentScroll > lastScroll && currentScroll > 100) {
// //         setVisible(false);
// //       } else {
// //         // 🔺 Rolando para cima → mostra
// //         setVisible(true);
// //       }

// //       setLastScroll(currentScroll);
// //     };

// //     window.addEventListener("scroll", handleScroll);
// //     return () => window.removeEventListener("scroll", handleScroll);
// //   }, [lastScroll]);

// //   return (
// //     <div
// //       className={`
// //         fixed 
// //         bottom-24 md:bottom-10   /* ✅ Mobile mais alto */
// //         right-6 
// //         z-50 
// //         transition-all duration-300
// //         ${visible
// //           ? "opacity-100 translate-y-0"
// //           : "opacity-0 translate-y-12 pointer-events-none"}
// //       `}
// //     >
// //       <Link
// //         to="/nova-atividade"
// //         className="
// //           bg-yellow-400 hover:bg-yellow-500
// //           text-black
// //           px-5 py-3
// //           rounded-full
// //           flex items-center gap-2
// //           shadow-[0_8px_24px_rgba(0,0,0,0.25)]   /* 🔥 sombra premium */
// //           transition-all duration-200
// //           active:scale-95
// //         "
// //       >
// //         <span className="material-symbols-outlined text-xl">
// //           add
// //         </span>

// //         {/* 🔥 TEXTO ESTILO GOOGLE */}
// //         <span className="text-sm font-medium hidden sm:inline">
// //           Nova
// //         </span>
// //       </Link>
// //     </div>
// //   );
// // }
// // ``



// import { Link } from "react-router-dom";
// import { useState, useEffect } from "react";

// export default function FAB() {
//   const [open, setOpen] = useState(false);
//   const [visible, setVisible] = useState(true);
//   const [lastScroll, setLastScroll] = useState(0);

//   // ✅ Controle de scroll (some e aparece)
//   useEffect(() => {
//     const handleScroll = () => {
//       const currentScroll = window.scrollY;

//       if (currentScroll > lastScroll && currentScroll > 100) {
//         setVisible(false);
//       } else {
//         setVisible(true);
//       }

//       setLastScroll(currentScroll);
//     };

//     window.addEventListener("scroll", handleScroll);
//     return () => window.removeEventListener("scroll", handleScroll);
//   }, [lastScroll]);

//   return (
//     <>
//       {/* ✅ OVERLAY ESCURO */}
//       {open && (
//         <div
//           onClick={() => setOpen(false)}
//           className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
//         />
//       )}

//       <div
//         className={`
//           fixed 
//           bottom-24 md:bottom-10 
//           right-6 
//           z-50 
//           flex flex-col items-end gap-3
//           transition-all duration-300
//           ${
//             visible
//               ? "opacity-100 translate-y-0"
//               : "opacity-0 translate-y-12 pointer-events-none"
//           }
//         `}
//       >
//         {/* ✅ AÇÕES DO MENU */}
//         {open && (
//           <>
//             <Link
//               to="/nova-atividade"
//               className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:scale-105 transition"
//             >
//               <span className="material-symbols-outlined text-lg">task</span>
//               Nova Atividade
//             </Link>

//             <Link
//               to="/novo-evento"
//               className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:scale-105 transition"
//             >
//               <span className="material-symbols-outlined text-lg">event</span>
//               Novo Evento
//             </Link>

//             <Link
//               to="/novo-arquivo"
//               className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:scale-105 transition"
//             >
//               <span className="material-symbols-outlined text-lg">upload</span>
//               Enviar Arquivo
//             </Link>
//           </>
//         )}

//         {/* ✅ BOTÃO PRINCIPAL */}
//         <button
//           onClick={() => setOpen(!open)}
//           className={`
//             bg-yellow-400 hover:bg-yellow-500
//             text-black
//             w-14 h-14
//             rounded-full
//             flex items-center justify-center
//             shadow-[0_8px_24px_rgba(0,0,0,0.25)]
//             transition-all duration-300
//             active:scale-95
//             ${open ? "rotate-45" : "rotate-0"}
//           `}
//         >
//           <span className="material-symbols-outlined text-2xl">
//             add
//           </span>
//         </button>
//       </div>
//     </>
//   );
// }




// import { Link } from "react-router-dom";
// import { useState, useEffect } from "react";
// import { motion, AnimatePresence } from "framer-motion";

// export default function FAB() {
//   const [open, setOpen] = useState(false);
//   const [visible, setVisible] = useState(true);
//   const [lastScroll, setLastScroll] = useState(0);

//   // ✅ CONTROLE DE SCROLL INTELIGENTE
//   useEffect(() => {
//     const handleScroll = () => {
//       const currentScroll = window.scrollY;

//       if (currentScroll > lastScroll && currentScroll > 100) {
//         setVisible(false);
//       } else {
//         setVisible(true);
//       }

//       setLastScroll(currentScroll);
//     };

//     window.addEventListener("scroll", handleScroll);
//     return () => window.removeEventListener("scroll", handleScroll);
//   }, [lastScroll]);

//   return (
//     <>
//       {/* ✅ OVERLAY COM ANIMAÇÃO */}
//       <AnimatePresence>
//         {open && (
//           <motion.div
//             onClick={() => setOpen(false)}
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
//           />
//         )}
//       </AnimatePresence>

//       <motion.div
//         initial={{ opacity: 0, y: 50 }}
//         animate={{
//           opacity: visible ? 1 : 0,
//           y: visible ? 0 : 60,
//         }}
//         transition={{ duration: 0.3 }}
//         className="fixed bottom-24 md:bottom-10 right-6 z-50 flex flex-col items-end gap-3"
//       >
//         {/* ✅ MENU DE AÇÕES COM ANIMAÇÃO */}
//         <AnimatePresence>
//           {open && (
//             <>
//               {[
//                 {
//                   label: "Nova Atividade",
//                   icon: "task",
//                   link: "/nova-atividade",
//                   color: "bg-blue-500",
//                 },
//                 {
//                   label: "Novo Evento",
//                   icon: "event",
//                   link: "/novo-evento",
//                   color: "bg-green-500",
//                 },
//                 {
//                   label: "Enviar Arquivo",
//                   icon: "upload",
//                   link: "/novo-arquivo",
//                   color: "bg-purple-500",
//                 },
//               ].map((item, index) => (
//                 <motion.div
//                   key={item.label}
//                   initial={{ opacity: 0, y: 20, scale: 0.8 }}
//                   animate={{ opacity: 1, y: 0, scale: 1 }}
//                   exit={{ opacity: 0, y: 20, scale: 0.8 }}
//                   transition={{ delay: index * 0.08 }}
//                 >
//                   <Link
//                     to={item.link}
//                     className="flex items-center gap-3 px-4 py-2 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:scale-105 transition"
//                   >
//                     <div
//                       className={`w-8 h-8 rounded-full ${item.color} flex items-center justify-center text-white`}
//                     >
//                       <span className="material-symbols-outlined text-sm">
//                         {item.icon}
//                       </span>
//                     </div>

//                     <span className="text-sm font-medium">
//                       {item.label}
//                     </span>
//                   </Link>
//                 </motion.div>
//               ))}
//             </>
//           )}
//         </AnimatePresence>

//         {/* ✅ BOTÃO PRINCIPAL SUPER ANIMADO */}
//         <motion.button
//           onClick={() => setOpen(!open)}
//           whileTap={{ scale: 0.9 }}
//           animate={{ rotate: open ? 45 : 0 }}
//           transition={{ type: "spring", stiffness: 260, damping: 20 }}
//           className="bg-yellow-400 hover:bg-yellow-500 text-black w-16 h-16 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
//         >
//           <span className="material-symbols-outlined text-3xl">
//             add
//           </span>
//         </motion.button>
//       </motion.div>
//     </>
//   );
// }



// import { Link } from "react-router-dom";
// import { useState, useEffect } from "react";
// import { motion, AnimatePresence } from "framer-motion";

// export default function FAB() {
//   const [open, setOpen] = useState(false);
//   const [visible, setVisible] = useState(true);
//   const [lastScroll, setLastScroll] = useState(0);

//   // ✅ Scroll inteligente (UX real)
//   useEffect(() => {
//     const handleScroll = () => {
//       const currentScroll = window.scrollY;

//       if (currentScroll > lastScroll && currentScroll > 100) {
//         setVisible(false);
//       } else {
//         setVisible(true);
//       }

//       setLastScroll(currentScroll);
//     };

//     window.addEventListener("scroll", handleScroll);
//     return () => window.removeEventListener("scroll", handleScroll);
//   }, [lastScroll]);

//   const actions = [
//     {
//       label: "Nova Atividade",
//       icon: "task",
//       link: "/nova-atividade",
//       color: "bg-blue-500",
//     },
//     {
//       label: "Novo Evento",
//       icon: "event",
//       link: "/novo-evento",
//       color: "bg-green-500",
//     },
//     {
//       label: "Arquivo",
//       icon: "upload",
//       link: "/novo-arquivo",
//       color: "bg-purple-500",
//     },
//   ];

//   return (
//     <>
//       {/* ✅ Overlay estilo iOS */}
//       <AnimatePresence>
//         {open && (
//           <motion.div
//             onClick={() => setOpen(false)}
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black/20 backdrop-blur-md z-40"
//           />
//         )}
//       </AnimatePresence>

//       <motion.div
//         initial={{ opacity: 0, y: 80 }}
//         animate={{
//           opacity: visible ? 1 : 0,
//           y: visible ? 0 : 80,
//         }}
//         transition={{ duration: 0.35 }}
//         className="fixed bottom-24 md:bottom-10 right-6 z-50 flex flex-col items-end gap-3"
//       >
//         {/* 🔥 MENU COM ANIMAÇÃO PHYSICS */}
//         <AnimatePresence>
//           {open &&
//             actions.map((item, index) => (
//               <motion.div
//                 key={item.label}
//                 initial={{ opacity: 0, y: 20, scale: 0.8 }}
//                 animate={{ opacity: 1, y: 0, scale: 1 }}
//                 exit={{ opacity: 0, y: 20, scale: 0.8 }}
//                 transition={{
//                   type: "spring",
//                   stiffness: 260,
//                   damping: 20,
//                   delay: index * 0.05,
//                 }}
//               >
//                 <Link
//                   to={item.link}
//                   className="
//                     flex items-center gap-3 px-4 py-2 rounded-full
//                     backdrop-blur-lg bg-white/70 dark:bg-gray-800/70
//                     border border-white/20
//                     shadow-lg
//                     hover:scale-105 hover:shadow-xl
//                     transition-all duration-200
//                   "
//                 >
//                   <div
//                     className={`w-9 h-9 ${item.color} text-white rounded-full flex items-center justify-center shadow`}
//                   >
//                     <span className="material-symbols-outlined text-sm">
//                       {item.icon}
//                     </span>
//                   </div>

//                   <span className="text-sm font-medium">
//                     {item.label}
//                   </span>
//                 </Link>
//               </motion.div>
//             ))}
//         </AnimatePresence>

//         {/* 🔥 BOTÃO PRINCIPAL PREMIUM */}
//         <motion.button
//           onClick={() => setOpen(!open)}
//           whileTap={{ scale: 0.92 }}
//           animate={{
//             rotate: open ? 45 : 0,
//             boxShadow: open
//               ? "0 12px 40px rgba(0,0,0,0.35)"
//               : "0 8px 24px rgba(0,0,0,0.25)",
//           }}
//           transition={{
//             type: "spring",
//             stiffness: 300,
//             damping: 20,
//           }}
//           className="
//             relative
//             bg-gradient-to-br from-yellow-300 to-yellow-500
//             text-black
//             w-16 h-16
//             rounded-full
//             flex items-center justify-center
//           "
//         >
//           {/* brilho interno (efeito Apple) */}
//           <div className="absolute inset-0 rounded-full bg-white/20 blur-sm" />

//           <span className="material-symbols-outlined text-3xl relative">
//             add
//           </span>
//         </motion.button>
//       </motion.div>
//     </>
//   );
// }