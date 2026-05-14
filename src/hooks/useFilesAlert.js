import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { startOfWeek, addDays, format } from "date-fns";

export function useFilesAlert() {
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    const checkFiles = async () => {
      const today = new Date();
      const monday = startOfWeek(today, { weekStartsOn: 1 });
      const saturday = addDays(monday, 5);
      const startStr = format(monday, "yyyy-MM-dd");
      const endStr = format(saturday, "yyyy-MM-dd");

      const { count } = await supabase
        .from("program_files")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startStr)
        .lte("created_at", endStr + "T23:59:59");

      setHasNew((count ?? 0) > 0);
    };

    checkFiles();
    const interval = setInterval(checkFiles, 30000);
    return () => clearInterval(interval);
  }, []);

  return hasNew;
}