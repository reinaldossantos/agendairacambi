import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import ProgramCard from "../components/programs/ProgramCard";

export default function Programs() {
  const [programs, setPrograms] = useState([]);

  useEffect(() => {
    supabase.from("programs").select("*, leader:leader_id(name)").order("name").then(({ data }) => setPrograms(data || []));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-8">Programas</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((prog, idx) => <ProgramCard key={prog.id} program={prog} index={idx} />)}
      </div>
    </div>
  );
}