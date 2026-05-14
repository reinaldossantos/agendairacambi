import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { startOfWeek, addDays, format } from "date-fns";

export function useAnnouncementsAlert() {
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    const checkAnnouncements = async () => {
      const today = new Date();
      const monday = startOfWeek(today, { weekStartsOn: 1 });
      const saturday = addDays(monday, 5);
      const startStr = format(monday, "yyyy-MM-dd");
      const endStr = format(saturday, "yyyy-MM-dd");

      const { count } = await supabase
        .from("announcements")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startStr)
        .lte("created_at", endStr + "T23:59:59");

      setHasNew((count ?? 0) > 0);
    };

    checkAnnouncements();
    const interval = setInterval(checkAnnouncements, 30000); // verifica a cada 30s
    return () => clearInterval(interval);
  }, []);

  return hasNew;
}