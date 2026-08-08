/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const CurrentUserContext = createContext(null);

export function CurrentUserProvider({ children }) {
  const [session, setSession] = useState(null);
  const [persons, setPersons] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  async function loadProfile(activeSession) {
    if (!activeSession?.user) {
      setCurrentUser(null);
      setPersons([]);
      localStorage.removeItem("iracambi_current_user");
      setAuthLoading(false);
      return;
    }
    const [{ data: profiles }, { data: activePersons }] = await Promise.all([
      supabase.from("persons").select("*").eq("auth_user_id", activeSession.user.id).eq("is_active", true).is("locked_at", null).order("access_role", { ascending: false }),
      supabase.from("persons").select("id,name,initials,is_active").eq("is_active", true).order("name"),
    ]);
    const profile = (profiles || []).find((person) => person.access_role === "admin") || profiles?.[0] || null;
    if (!profile) {
      await supabase.auth.signOut();
      setSession(null);
    }
    setCurrentUser(profile);
    setPersons(activePersons || []);
    if (profile) localStorage.setItem("iracambi_current_user", JSON.stringify(profile));
    setAuthLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadProfile(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      window.setTimeout(() => loadProfile(nextSession), 0);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const accessLogId = localStorage.getItem("iracambi_access_log_id");
    if (!session || !accessLogId) return undefined;
    const touchSession = () => supabase.rpc("touch_current_access_session", { p_log_id: Number(accessLogId) });
    const firstTouch = window.setTimeout(touchSession, 1000);
    const heartbeat = window.setInterval(touchSession, 60000);
    const handleVisibility = () => { if (document.visibilityState === "hidden") touchSession(); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearTimeout(firstTouch);
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [session]);

  async function signOut() {
    const accessLogId = localStorage.getItem("iracambi_access_log_id");
    if (accessLogId) await supabase.rpc("close_current_access_session", { p_log_id: Number(accessLogId) });
    localStorage.removeItem("iracambi_access_log_id");
    await supabase.auth.signOut();
  }

  return <CurrentUserContext.Provider value={{ session, currentUser, persons, authLoading, signOut, refreshProfile: () => loadProfile(session) }}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser() { return useContext(CurrentUserContext); }
