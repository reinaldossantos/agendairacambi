import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useCurrentUser } from "../context/CurrentUserContext";
import { canManageRestaurant } from "../lib/restaurantAccess";

const commonProducts = ["Arroz", "Feijão", "Óleo", "Açúcar", "Café", "Leite", "Farinha", "Macarrão", "Sal", "Ovos", "Carne", "Verduras"];
const statusLabels = { requested: "Aguardando compra", purchasing: "Compra em andamento", restocked: "Reposto", cancelled: "Cancelado" };
const urgencyLabels = { running_low: "Está acabando", out_of_stock: "Acabou" };

export default function RestaurantRestock() {
  const { currentUser } = useCurrentUser();
  const manager = canManageRestaurant(currentUser);
  const [items, setItems] = useState([]);
  const [product, setProduct] = useState("");
  const [urgency, setUrgency] = useState("running_low");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("restaurant_restock_requests").select("*, requester:requested_by(name), updater:updated_by(name)").order("requested_at", { ascending: false });
    if (error) setMessage(error.message); else setItems(data || []);
  }, []);
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);

  const openItems = items.filter((item) => ["requested", "purchasing"].includes(item.status));
  const shoppingList = useMemo(() => Object.values(openItems.reduce((map, item) => {
    const key = item.product_name.trim().toLocaleLowerCase("pt-BR");
    const group = map[key] || { name: item.product_name, quantities: [], out: false, ids: [] };
    if (item.quantity) group.quantities.push(`${Number(item.quantity).toLocaleString("pt-BR")} ${item.unit || "un."}`);
    group.out ||= item.urgency === "out_of_stock"; group.ids.push(item.id); map[key] = group; return map;
  }, {})), [openItems]);

  async function submit(event) {
    event.preventDefault(); setSaving(true); setMessage("");
    const { error } = await supabase.rpc("create_restaurant_restock_request", { requested_product_name: product, requested_urgency: urgency, requested_quantity: quantity ? Number(quantity) : null, requested_unit: unit || null, requested_notes: notes || null });
    setSaving(false); if (error) return setMessage(error.message);
    setProduct(""); setQuantity(""); setUnit(""); setNotes(""); setUrgency("running_low"); setMessage("Produto informado. Thaís e Arielle foram notificadas."); await load();
  }
  async function changeStatus(id, status) {
    const { error } = await supabase.rpc("update_restaurant_restock_status", { target_request_id: id, requested_status: status });
    if (error) setMessage(error.message); else await load();
  }
  function printList() {
    const rows = shoppingList.map((item) => `<tr><td>${item.name}</td><td>${item.quantities.join(" + ") || "Conferir quantidade"}</td><td>${item.out ? "Acabou" : "Acabando"}</td></tr>`).join("");
    const popup = window.open("", "_blank"); if (!popup) return setMessage("Permita a abertura da janela para imprimir a lista.");
    popup.document.write(`<html><head><title>Lista de compras do restaurante</title><style>body{font:16px Arial;padding:28px}h1{color:#173f30}table{width:100%;border-collapse:collapse}th,td{border:1px solid #aaa;padding:10px;text-align:left}</style></head><body><h1>Lista de compras do restaurante</h1><p>Gerada em ${new Date().toLocaleString("pt-BR")}</p><table><thead><tr><th>Produto</th><th>Quantidade solicitada</th><th>Prioridade</th></tr></thead><tbody>${rows}</tbody></table><script>window.print()</script></body></html>`); popup.document.close();
  }

  return <main className="mx-auto max-w-6xl space-y-6 px-1 sm:px-4"><header><p className="font-bold text-emerald-700">Restaurante Iracambi</p><h1 className="text-3xl font-black text-primary dark:text-white">Reposição do restaurante</h1><p className="text-outline">Informe de forma rápida o que está acabando ou já acabou.</p></header>{message && <p role="alert" className="rounded-2xl bg-blue-50 p-4 font-bold text-blue-800">{message}</p>}
    <section className="rounded-3xl bg-white p-5 shadow-sm dark:bg-dark-surface sm:p-7"><h2 className="mb-4 text-xl font-black text-primary dark:text-white">O que precisa comprar?</h2><form onSubmit={submit} className="space-y-5"><div><p className="mb-2 font-bold">Produtos mais usados</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{commonProducts.map((name) => <button type="button" key={name} onClick={() => setProduct(name)} className={`min-h-14 rounded-2xl border px-3 font-bold ${product === name ? "border-primary bg-emerald-100 text-primary" : "border-surface-variant bg-surface"}`}>{name}</button>)}</div></div><label className="block"><span className="mb-1 block font-bold">Outro produto</span><input required value={product} onChange={(event) => setProduct(event.target.value)} className="w-full rounded-2xl border border-surface-variant p-4 text-lg" placeholder="Digite o nome do produto" /></label><fieldset><legend className="mb-2 font-bold">Como está o estoque?</legend><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setUrgency("running_low")} className={`min-h-16 rounded-2xl border-2 font-black ${urgency === "running_low" ? "border-amber-500 bg-amber-100 text-amber-900" : "border-surface-variant"}`}>Está acabando</button><button type="button" onClick={() => setUrgency("out_of_stock")} className={`min-h-16 rounded-2xl border-2 font-black ${urgency === "out_of_stock" ? "border-red-500 bg-red-100 text-red-800" : "border-surface-variant"}`}>Acabou</button></div></fieldset><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1 block font-bold">Quantidade (opcional)</span><input type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="w-full rounded-2xl border border-surface-variant p-4" /></label><label><span className="mb-1 block font-bold">Unidade (opcional)</span><input value={unit} onChange={(event) => setUnit(event.target.value)} className="w-full rounded-2xl border border-surface-variant p-4" placeholder="kg, pacote, caixa..." /></label></div><label className="block"><span className="mb-1 block font-bold">Observação (opcional)</span><textarea rows="2" value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full rounded-2xl border border-surface-variant p-4" /></label><button disabled={saving} className="min-h-16 w-full rounded-full bg-[#ffd12f] px-6 text-lg font-black text-primary shadow disabled:opacity-50">{saving ? "Enviando..." : "Enviar pedido de reposição"}</button></form></section>
    {manager && <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black text-primary">Lista consolidada de compras</h2><p>{shoppingList.length} produto(s) reunidos automaticamente.</p></div><button onClick={printList} disabled={!shoppingList.length} className="rounded-full bg-primary px-5 py-3 font-bold text-white disabled:opacity-40">Imprimir lista</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{shoppingList.map((item) => <article key={item.name} className="rounded-2xl bg-white p-4"><div className="flex justify-between gap-3"><strong className="text-lg text-primary">{item.name}</strong><span className={`h-fit rounded-full px-2 py-1 text-xs font-bold ${item.out ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>{item.out ? "Acabou" : "Acabando"}</span></div><p className="mt-2 text-sm">{item.quantities.join(" + ") || "Quantidade a conferir"}</p></article>)}</div>{!shoppingList.length && <p className="mt-5 rounded-2xl bg-white p-5 text-center">Nenhum produto aguardando compra.</p>}</section>}
    <section><h2 className="mb-3 text-xl font-black text-primary dark:text-white">Acompanhamento</h2><div className="space-y-3">{items.map((item) => <article key={item.id} className="rounded-2xl border border-surface-variant bg-white p-4 dark:bg-dark-surface"><div className="flex flex-wrap justify-between gap-3"><div><strong className="text-lg text-primary dark:text-white">{item.product_name}</strong><p className="text-sm text-outline">{urgencyLabels[item.urgency]} · informado por {item.requester?.name}</p>{item.quantity && <p>{Number(item.quantity).toLocaleString("pt-BR")} {item.unit || "un."}</p>}</div><span className="h-fit rounded-full bg-surface px-3 py-1 text-xs font-bold">{statusLabels[item.status]}</span></div>{manager && ["requested","purchasing"].includes(item.status) && <div className="mt-3 flex flex-wrap gap-2 border-t pt-3"><button onClick={() => changeStatus(item.id,"purchasing")} className="rounded-full bg-blue-100 px-4 py-2 font-bold text-blue-800">Compra em andamento</button><button onClick={() => changeStatus(item.id,"restocked")} className="rounded-full bg-emerald-600 px-4 py-2 font-bold text-white">Marcar como reposto</button><button onClick={() => changeStatus(item.id,"cancelled")} className="rounded-full px-4 py-2 font-bold text-red-700">Cancelar</button></div>}</article>)}</div></section>
  </main>;
}
