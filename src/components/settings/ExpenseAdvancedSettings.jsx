import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function ExpenseAdvancedSettings() {
  const [sendEmail, setSendEmail] = useState(false);
  const [rates, setRates] = useState([]);
  const [form, setForm] = useState({ vehicle_type: "car", amount_per_km: "", effective_date: "" });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  async function loadSettings() {
    const [settingsResult, ratesResult] = await Promise.all([
      supabase.from("app_settings").select("value").eq("key", "expense_report_settings").maybeSingle(),
      supabase.from("mileage_rates").select("*").order("effective_date", { ascending: false }),
    ]);
    setSendEmail(settingsResult.data?.value?.send_email === true);
    setRates(ratesResult.data || []);
  }

  useEffect(() => {
    const timer = window.setTimeout(loadSettings, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function toggleEmail() {
    const enabled = !sendEmail;
    setSendEmail(enabled);
    const { error } = await supabase.from("app_settings").upsert({
      key: "expense_report_settings", value: { send_email: enabled },
    }, { onConflict: "key" });
    if (error) {
      setSendEmail(!enabled);
      setMessage({ type: "error", text: error.message });
    } else setMessage({ type: "success", text: enabled ? "Envio por e-mail ativado." : "Envio por e-mail desativado." });
  }

  async function saveRate(event) {
    event.preventDefault();
    if (!form.effective_date || Number(form.amount_per_km) <= 0) {
      setMessage({ type: "error", text: "Informe um valor e uma data de vigência válidos." });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("mileage_rates").insert({
      ...form, amount_per_km: Number(form.amount_per_km),
    });
    setSaving(false);
    if (error) return setMessage({ type: "error", text: error.message });
    setForm({ vehicle_type: "car", amount_per_km: "", effective_date: "" });
    setMessage({ type: "success", text: "Novo valor registrado no histórico." });
    await loadSettings();
  }

  return (
    <>
      {message.text && <div className={`rounded-xl p-3 ${message.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{message.text}</div>}
      <section className="border-t border-surface-variant pt-5 dark:border-white/10">
        <h3 className="mb-4 text-lg font-bold text-primary dark:text-white">Relatórios de despesas</h3>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-primary dark:text-white">Enviar relatório por e-mail</p>
            <p className="text-sm text-on-surface-variant dark:text-gray-400">Quando desativado, a aprovação continua somente pelas notificações do sistema.</p>
          </div>
          <button type="button" onClick={toggleEmail} aria-pressed={sendEmail} className={`h-6 w-12 shrink-0 rounded-full transition-colors ${sendEmail ? "bg-primary" : "bg-stone-300"}`}>
            <span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${sendEmail ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
        <p className="mt-2 text-xs font-medium text-outline">Padrão do sistema: desativado.</p>
      </section>

      <section className="border-t border-surface-variant pt-5 dark:border-white/10">
        <h3 className="text-lg font-bold text-primary dark:text-white">Valores de KM rodado</h3>
        <p className="mb-4 text-sm text-outline">Cada atualização cria uma nova vigência e preserva os valores anteriores.</p>
        <form onSubmit={saveRate} className="grid gap-3 rounded-xl bg-surface p-4 dark:bg-gray-800 sm:grid-cols-3">
          <label><span className="mb-1 block text-sm font-medium">Veículo</span><select value={form.vehicle_type} onChange={(event) => setForm({ ...form, vehicle_type: event.target.value })} className="w-full rounded-xl border-surface-variant dark:bg-gray-700"><option value="car">Carro</option><option value="motorcycle">Moto</option></select></label>
          <label><span className="mb-1 block text-sm font-medium">Valor por KM (R$)</span><input required min="0.0001" step="0.0001" type="number" value={form.amount_per_km} onChange={(event) => setForm({ ...form, amount_per_km: event.target.value })} placeholder="Ex.: 1,2500" className="w-full rounded-xl border-surface-variant dark:bg-gray-700" /></label>
          <label><span className="mb-1 block text-sm font-medium">Início da vigência</span><input required type="date" value={form.effective_date} onChange={(event) => setForm({ ...form, effective_date: event.target.value })} className="w-full rounded-xl border-surface-variant dark:bg-gray-700" /></label>
          <button disabled={saving} className="rounded-full bg-accent px-5 py-2.5 font-bold text-primary sm:col-span-3 sm:justify-self-end">{saving ? "Salvando..." : "Registrar novo valor"}</button>
        </form>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm"><thead><tr className="border-b border-surface-variant text-left text-xs uppercase text-outline"><th className="p-2">Vigência</th><th className="p-2">Veículo</th><th className="p-2 text-right">Valor por KM</th></tr></thead><tbody>{rates.map((rate) => <tr key={rate.id} className="border-b border-surface-variant/60"><td className="p-2">{rate.effective_date}</td><td className="p-2">{rate.vehicle_type === "car" ? "Carro" : "Moto"}</td><td className="p-2 text-right font-bold">{Number(rate.amount_per_km).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 4 })}</td></tr>)}</tbody></table>
          {!rates.length && <p className="py-5 text-center text-sm text-outline">Nenhum valor por KM cadastrado.</p>}
        </div>
      </section>
    </>
  );
}
