import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useState, useEffect } from "react";
import { startOfWeek, addDays, format } from "date-fns";

const bgPalette = [
  "bg-[#e8f5e9] dark:bg-[#1e3a2a]",
  "bg-[#fff8e1] dark:bg-[#3e3a1e]",
  "bg-[#e3f2fd] dark:bg-[#1a2e3a]",
  "bg-[#f3e5f5] dark:bg-[#3a1e3a]",
  "bg-[#ffebee] dark:bg-[#3a1e1e]",
  "bg-[#e0f2f1] dark:bg-[#1a3a35]",
  "bg-[#f1f8e9] dark:bg-[#2e3a1e]",
  "bg-[#ede7f6] dark:bg-[#2e1e3a]",
];

export default function ProgramCard({ program, index }) {
  const [count, setCount] = useState(0);
  const bgColor = bgPalette[index % bgPalette.length];
  const today = new Date();
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  const saturday = addDays(monday, 5);

  useEffect(() => {
    const fetchCount = async () => {
      const { count, error } = await supabase
        .from("activities")
        .select("id", { count: "exact", head: true })
        .eq("program_id", program.id)
        .gte("due_date", format(monday, "yyyy-MM-dd"))
        .lte("due_date", format(saturday, "yyyy-MM-dd"));
      if (!error) setCount(count || 0);
    };
    fetchCount();
  }, [program.id, monday, saturday]);

  return (
    <Link
      to={`/?program=${encodeURIComponent(program.name)}`}
      className={`${bgColor} rounded-xl p-4 border border-surface-variant dark:border-gray-700 hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-36 sm:h-40`}
    >
      <div>
        <h3 className="font-epilogue text-base sm:text-lg font-semibold text-primary dark:text-white mb-1 line-clamp-2">
          {program.name}
        </h3>
        {program.leader && (
          <p className="text-xs text-on-surface dark:text-gray-300 truncate">
            Líder: {program.leader.name}
          </p>
        )}
      </div>
      <div className="flex items-end justify-between mt-2">
        <span className="text-2xl sm:text-3xl font-bold text-primary dark:text-white">
          {count}
        </span>
        <span className="text-[10px] sm:text-xs text-outline dark:text-gray-400 text-right leading-tight">
          atividades<br />esta semana
        </span>
      </div>
    </Link>
  );
}