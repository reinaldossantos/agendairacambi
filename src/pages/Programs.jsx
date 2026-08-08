/* eslint-disable react-hooks/immutability */
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import ProgramCard from "../components/programs/ProgramCard";

export default function Programs() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrograms();
  }, []);

  async function fetchPrograms() {
    setLoading(true);
    const { data } = await supabase
      .from("programs")
      .select("*, leader:leader_id(name)")
      .order("name");
    setPrograms(data || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-6">Programas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-white/5 rounded-xl p-4 h-36 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6">
      <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-6">Programas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {programs.map((prog, idx) => (
          <ProgramCard key={prog.id} program={prog} index={idx} />
        ))}
      </div>
      {programs.length === 0 && (
        <div className="text-center py-10 text-on-surface-variant dark:text-gray-400">
          Nenhum programa cadastrado.
        </div>
      )}
    </div>
  );
}
