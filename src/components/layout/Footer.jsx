import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-stone-100 dark:bg-stone-900 w-full py-12 mt-auto border-t border-stone-200 dark:border-stone-700">
      <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2 text-primary/60 dark:text-stone-400 font-roboto text-xs tracking-normal">
          <span className="text-lg">🌳</span>
          <span>© {new Date().getFullYear()} Colegiado IRACAMBI®</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="https://iracambi.org"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-full text-primary dark:text-primary-light hover:bg-primary/10 dark:hover:bg-primary-light/20 hover:text-primary dark:hover:text-accent transition-all font-roboto text-xs font-medium"
          >
            Site Iracambi
          </a>
          <a
            href="https://www.instagram.com/ong_iracambi/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-full text-[#E4405F] dark:text-[#E4405F] hover:bg-[#E4405F]/15 dark:hover:bg-[#E4405F]/25 hover:text-[#C13584] dark:hover:text-[#F77737] transition-all font-roboto text-xs font-medium"
            title="Instagram"
          >
            Instagram
          </a>
          <a
            href="https://www.facebook.com/iracambi"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-full text-[#1877F2] dark:text-[#1877F2] hover:bg-[#1877F2]/15 dark:hover:bg-[#1877F2]/25 hover:text-[#0E5CAD] dark:hover:text-[#3B82F6] transition-all font-roboto text-xs font-medium"
            title="Facebook"
          >
            Facebook
          </a>
          <a
            href="https://www.youtube.com/@Iracambi"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-full text-[#FF0000] dark:text-[#FF0000] hover:bg-[#FF0000]/15 dark:hover:bg-[#FF0000]/25 hover:text-[#CC0000] dark:hover:text-[#FF4444] transition-all font-roboto text-xs font-medium"
            title="YouTube"
          >
            YouTube
          </a>
          <a
            href="https://www.linkedin.com/company/ong-iracambi"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-full text-[#0A66C2] dark:text-[#0A66C2] hover:bg-[#0A66C2]/15 dark:hover:bg-[#0A66C2]/25 hover:text-[#084D96] dark:hover:text-[#3B82F6] transition-all font-roboto text-xs font-medium"
            title="LinkedIn"
          >
            LinkedIn
          </a>
          <Link
            to="/about"
            className="px-3 py-1.5 rounded-full text-primary dark:text-primary-light hover:bg-primary/10 dark:hover:bg-primary-light/20 hover:text-accent dark:hover:text-accent transition-all font-roboto text-xs font-medium"
          >
            Sobre
          </Link>
        </div>
      </div>
    </footer>
  );
}