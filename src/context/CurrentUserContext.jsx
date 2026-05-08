import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const CurrentUserContext = createContext(null);

export function CurrentUserProvider({ children }) {
  const [persons, setPersons] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => {
    // tenta recuperar do localStorage
    const saved = localStorage.getItem("iracambi_current_user");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    fetchPersons();
  }, []);

  async function fetchPersons() {
    const { data } = await supabase.from("persons").select("*").order("name");
    setPersons(data || []);
  }

  const selectUser = (person) => {
    setCurrentUser(person);
    localStorage.setItem("iracambi_current_user", JSON.stringify(person));
  };

  return (
    <CurrentUserContext.Provider value={{ currentUser, persons, selectUser }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}