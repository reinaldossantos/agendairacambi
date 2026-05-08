// import { Link } from "react-router-dom";

// export default function FAB() {
//   return (
//     <div
//       style={{
//         position: "sticky",
//         bottom: "32px",
//         display: "flex",
//         justifyContent: "flex-end",
//         marginTop: "32px",
//         zIndex: 10
//       }}
//     >
//       <Link
//         to="/new"
//         aria-label="Lançar atividade"
//         style={{
//           width: "56px",
//           height: "56px",
//           borderRadius: "50%",
//           backgroundColor: "#F7C948",
//           color: "#000",
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           fontSize: "32px",
//           textDecoration: "none",
//           boxShadow: "0 6px 16px rgba(0, 0, 0, 0.25)",
//           cursor: "pointer"
//         }}
//       >
//         +
//       </Link>
//     </div>
//   );
// }


// import { Link } from "react-router-dom";

// export default function FAB() {
//   return (
//     <Link
//       to="/new"
//       title="Lançar atividade"
//       className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-accent/90 dark:bg-accent/40 backdrop-blur-sm text-primary rounded-full shadow-lg hover:shadow-xl flex items-center justify-center active:scale-95 transition-all z-40"
//     >
//       <span className="material-symbols-outlined text-3xl">add</span>
//     </Link>
//   );
// }

import { Link } from "react-router-dom";

export default function FAB() {
  return (
    <Link
      to="/new"
      title="Lançar atividade"
      className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-accent/90 dark:bg-accent/40 backdrop-blur-sm text-primary rounded-full shadow-lg hover:shadow-xl flex items-center justify-center active:scale-95 transition-all z-40"
    >
      <span className="material-symbols-outlined text-3xl">add</span>
    </Link>
  );
}