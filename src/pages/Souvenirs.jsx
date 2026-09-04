import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "../lib/supabaseClient";
import { useCurrentUser } from "../context/CurrentUserContext";

const inputClass = "w-full rounded-xl border border-surface-variant bg-surface px-3 py-2.5 text-on-surface focus:border-primary focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const blankProduct = { name: "", sku: "", category: "", description: "", cost_price: "", sale_price: "", minimum_stock: "0", is_active: true };
const blankMovement = { product_id: "", movement_type: "entry", quantity: "1", unit_cost: "", unit_sale_price: "", recipient_name: "", notes: "" };
const typeLabels = { entry: "Entrada", sale: "Venda", bonus: "Bonificação" };
const statusLabels = { approved: "Efetivada", pending_approval: "Aguardando autorização", rejected: "Rejeitada" };

function money(value) { return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function margin(product) { const cost = Number(product.cost_price); return cost > 0 ? ((Number(product.sale_price) - cost) / cost) * 100 : null; }

export default function Souvenirs() {
  const { currentUser } = useCurrentUser();
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [productForm, setProductForm] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [movementForm, setMovementForm] = useState(null);
  const [decisionComments, setDecisionComments] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    const [productResult, movementResult, managerResult] = await Promise.all([
      supabase.from("souvenir_products").select("*").order("is_active", { ascending: false }).order("name"),
      supabase.from("souvenir_movements").select("*,product:product_id(id,name,sku),requester:requested_by(id,name),decider:decided_by(id,name)").order("created_at", { ascending: false }).limit(500),
      supabase.from("expense_approval_config").select("person_id").eq("is_active", true),
    ]);
    const error = productResult.error || movementResult.error || managerResult.error;
    if (error) setMessage({ type: "error", text: `Não foi possível carregar os souvenires: ${error.message}` });
    setProducts(productResult.data || []);
    setMovements(movementResult.data || []);
    setManagers((managerResult.data || []).map((item) => item.person_id));
    setLoading(false);
  }, []);

  useEffect(() => { const timer = window.setTimeout(loadData, 0); return () => window.clearTimeout(timer); }, [loadData]);

  const canManageProducts = currentUser?.access_role === "admin" || managers.includes(currentUser?.id);
  const canApprove = managers.includes(currentUser?.id);
  const activeProducts = products.filter((product) => product.is_active);
  const totals = useMemo(() => activeProducts.reduce((result, product) => ({
    units: result.units + product.stock_quantity,
    cost: result.cost + product.stock_quantity * Number(product.cost_price),
    revenue: result.revenue + product.stock_quantity * Number(product.sale_price),
    low: result.low + (product.stock_quantity <= product.minimum_stock ? 1 : 0),
  }), { units: 0, cost: 0, revenue: 0, low: 0 }), [activeProducts]);
  const filteredProducts = activeProducts.filter((product) => [product.name, product.sku, product.category].some((value) => String(value || "").toLowerCase().includes(search.toLowerCase())));
  const filteredMovements = movements.filter((movement) => !typeFilter || movement.movement_type === typeFilter);

  function openProduct(product = null) {
    setEditingProductId(product?.id || null);
    setProductForm(product ? { name: product.name, sku: product.sku || "", category: product.category || "", description: product.description || "", cost_price: product.cost_price, sale_price: product.sale_price, minimum_stock: product.minimum_stock, is_active: product.is_active } : blankProduct);
    setMessage({ type: "", text: "" });
  }

  async function saveProduct(event) {
    event.preventDefault(); setSaving(true); setMessage({ type: "", text: "" });
    const payload = { ...productForm, name: productForm.name.trim(), sku: productForm.sku.trim().toUpperCase() || null, category: productForm.category.trim() || null, description: productForm.description.trim() || null, cost_price: Number(productForm.cost_price || 0), sale_price: Number(productForm.sale_price || 0), minimum_stock: Number(productForm.minimum_stock || 0) };
    const result = editingProductId
      ? await supabase.from("souvenir_products").update(payload).eq("id", editingProductId)
      : await supabase.from("souvenir_products").insert({ ...payload, created_by: currentUser.id });
    setSaving(false);
    if (result.error) return setMessage({ type: "error", text: result.error.code === "23505" ? "Já existe um produto com este código." : result.error.message });
    setProductForm(null); setMessage({ type: "success", text: editingProductId ? "Produto atualizado." : "Produto cadastrado. Registre uma entrada para formar o estoque." }); await loadData();
  }

  function openMovement(type, product = null) {
    setMovementForm({ ...blankMovement, movement_type: type, product_id: product?.id || "", unit_cost: product?.cost_price ?? "", unit_sale_price: product?.sale_price ?? "" });
    setMessage({ type: "", text: "" });
  }

  async function saveMovement(event) {
    event.preventDefault(); setSaving(true); setMessage({ type: "", text: "" });
    const { error } = await supabase.rpc("create_souvenir_movement", {
      target_product_id: movementForm.product_id,
      requested_type: movementForm.movement_type,
      requested_quantity: Number(movementForm.quantity),
      requested_unit_cost: movementForm.unit_cost === "" ? null : Number(movementForm.unit_cost),
      requested_unit_sale_price: movementForm.unit_sale_price === "" ? null : Number(movementForm.unit_sale_price),
      requested_recipient: movementForm.recipient_name.trim() || null,
      requested_notes: movementForm.notes.trim() || null,
    });
    setSaving(false);
    if (error) return setMessage({ type: "error", text: error.message });
    const pending = movementForm.movement_type === "bonus";
    setMovementForm(null); setMessage({ type: "success", text: pending ? "Bonificação enviada para autorização da gestão. O estoque ainda não foi alterado." : "Movimentação registrada e estoque atualizado." }); await loadData();
  }

  async function decideBonus(movement, decision) {
    const comment = decisionComments[movement.id]?.trim() || null;
    if (decision === "rejected" && !comment) return setMessage({ type: "error", text: "Informe a justificativa para rejeitar a bonificação." });
    setSaving(true);
    const { error } = await supabase.rpc("decide_souvenir_bonus", { target_movement_id: movement.id, requested_decision: decision, requested_comment: comment });
    setSaving(false);
    if (error) return setMessage({ type: "error", text: error.message });
    setDecisionComments((current) => ({ ...current, [movement.id]: "" }));
    setMessage({ type: "success", text: decision === "approved" ? "Bonificação autorizada, assinada digitalmente e baixada do estoque." : "Bonificação rejeitada." }); await loadData();
  }

  return <main className="mx-auto max-w-screen-2xl space-y-6 p-2 sm:p-4 md:p-8">
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="font-bold uppercase tracking-widest text-secondary">Produtos institucionais</p><h1 className="flex items-center gap-3 text-3xl font-black text-primary dark:text-white"><span className="material-symbols-outlined rounded-2xl bg-violet-100 p-2 text-violet-700">redeem</span>Souvenires Iracambi</h1><p className="text-on-surface-variant">Controle estoque, custos, vendas, margens e bonificações autorizadas.</p></div><div className="flex flex-wrap gap-2">{canManageProducts && <button onClick={() => openProduct()} className="rounded-full border border-primary px-5 py-3 font-bold text-primary dark:text-white">+ Novo produto</button>}<button onClick={() => openMovement("entry")} className="rounded-full bg-primary px-5 py-3 font-bold text-white">Registrar movimentação</button></div></header>
    {message.text && <div role="status" className={`rounded-xl p-3 font-bold ${message.type === "error" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>{message.text}</div>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Unidades em estoque" value={totals.units} icon="inventory_2" /><Metric label="Custo do estoque" value={money(totals.cost)} icon="payments" /><Metric label="Venda potencial" value={money(totals.revenue)} icon="point_of_sale" /><Metric label="Estoque baixo" value={totals.low} icon="production_quantity_limits" alert={totals.low > 0} /></section>
    <section className="rounded-3xl border border-surface-variant bg-white p-4 dark:border-white/10 dark:bg-dark-surface sm:p-5"><div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-xl font-black text-primary dark:text-white">Estoque atual</h2><p className="text-sm text-outline">A margem considera (preço de venda − custo) ÷ custo.</p></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar produto, código ou categoria" className={`${inputClass} sm:max-w-sm`} /></div>
      {loading ? <p className="py-10 text-center text-outline">Carregando estoque...</p> : !filteredProducts.length ? <p className="rounded-xl border border-dashed p-10 text-center text-outline">Nenhum produto cadastrado.</p> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filteredProducts.map((product) => <ProductCard key={product.id} product={product} canManage={canManageProducts} onEdit={() => openProduct(product)} onMove={openMovement} />)}</div>}
    </section>
    <section className="rounded-3xl border border-surface-variant bg-white p-4 dark:border-white/10 dark:bg-dark-surface sm:p-5"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black text-primary dark:text-white">Movimentações</h2><p className="text-sm text-outline">Histórico de entradas, vendas e bonificações.</p></div><select className={`${inputClass} w-56`} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">Todos os tipos</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="space-y-3">{filteredMovements.map((movement) => <MovementCard key={movement.id} movement={movement} canApprove={canApprove && movement.requested_by !== currentUser?.id} saving={saving} comment={decisionComments[movement.id] || ""} setComment={(value) => setDecisionComments((current) => ({ ...current, [movement.id]: value }))} onDecide={(decision) => decideBonus(movement, decision)} />)}{!filteredMovements.length && <p className="rounded-xl border border-dashed p-8 text-center text-outline">Nenhuma movimentação encontrada.</p>}</div>
    </section>
    {productForm && <Modal title={editingProductId ? "Editar produto" : "Novo produto"} onClose={() => setProductForm(null)}><ProductForm form={productForm} setForm={setProductForm} saving={saving} onSubmit={saveProduct} onCancel={() => setProductForm(null)} /></Modal>}
    {movementForm && <Modal title="Registrar movimentação" onClose={() => setMovementForm(null)}><MovementForm form={movementForm} setForm={setMovementForm} products={activeProducts} saving={saving} onSubmit={saveMovement} onCancel={() => setMovementForm(null)} /></Modal>}
  </main>;
}

function Metric({ label, value, icon, alert }) { return <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900"><span className={`material-symbols-outlined rounded-xl p-2 ${alert ? "bg-red-100 text-red-700" : "bg-violet-100 text-violet-700"}`}>{icon}</span><strong className={`ml-3 text-2xl ${alert ? "text-red-700" : "text-primary dark:text-white"}`}>{value}</strong><p className="mt-2 text-sm text-outline">{label}</p></div>; }

function ProductCard({ product, canManage, onEdit, onMove }) {
  const profit = margin(product); const low = product.stock_quantity <= product.minimum_stock;
  return <article className={`rounded-2xl border p-4 ${low ? "border-red-300 bg-red-50/40 dark:border-red-900 dark:bg-red-950/20" : "border-surface-variant dark:border-white/10"}`}><div className="flex justify-between gap-3"><div><p className="text-xs font-bold uppercase text-outline">{product.category || "Souvenir"}{product.sku ? ` · ${product.sku}` : ""}</p><h3 className="text-lg font-black text-primary dark:text-white">{product.name}</h3></div>{canManage && <button onClick={onEdit} className="h-10 w-10 rounded-full hover:bg-surface" title="Editar produto"><span className="material-symbols-outlined">edit</span></button>}</div><div className="my-4 grid grid-cols-2 gap-2 rounded-xl bg-surface p-3 text-sm dark:bg-gray-800"><Info label="Estoque" value={`${product.stock_quantity} un.`} alert={low} /><Info label="Mínimo" value={`${product.minimum_stock} un.`} /><Info label="Custo unitário" value={money(product.cost_price)} /><Info label="Venda" value={money(product.sale_price)} /><Info label="Lucro unitário" value={money(Number(product.sale_price) - Number(product.cost_price))} /><Info label="Margem" value={profit === null ? "Não calculável" : `${profit.toFixed(1)}%`} /></div>{low && <p className="mb-3 text-sm font-bold text-red-700">Estoque no limite mínimo.</p>}<div className="flex flex-wrap gap-2"><SmallButton onClick={() => onMove("entry", product)} label="Entrada" icon="add_box" /><SmallButton onClick={() => onMove("sale", product)} label="Venda" icon="shopping_bag" /><SmallButton onClick={() => onMove("bonus", product)} label="Bonificar" icon="volunteer_activism" /></div></article>;
}

function MovementCard({ movement, canApprove, saving, comment, setComment, onDecide }) {
  const pending = movement.status === "pending_approval"; const isOut = movement.movement_type !== "entry";
  const total = movement.movement_type === "sale" ? movement.quantity * Number(movement.unit_sale_price) : movement.quantity * Number(movement.unit_cost);
  return <article className="rounded-2xl border border-surface-variant p-4 dark:border-white/10"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div className="flex gap-3"><span className={`material-symbols-outlined h-fit rounded-xl p-2 ${movement.movement_type === "entry" ? "bg-emerald-100 text-emerald-700" : movement.movement_type === "sale" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{movement.movement_type === "entry" ? "input" : movement.movement_type === "sale" ? "sell" : "redeem"}</span><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-primary dark:text-white">{movement.product?.name}</h3><span className="rounded-full bg-surface px-2 py-1 text-xs font-bold dark:bg-gray-700">{typeLabels[movement.movement_type]}</span><span className={`rounded-full px-2 py-1 text-xs font-bold ${pending ? "bg-amber-100 text-amber-800" : movement.status === "rejected" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>{statusLabels[movement.status]}</span></div><p className="mt-1 text-sm"><strong>{isOut ? "−" : "+"}{movement.quantity} unidade(s)</strong> · {movement.movement_type === "sale" ? `Venda total ${money(total)}` : `Custo total ${money(total)}`}</p>{movement.recipient_name && <p className="text-sm">Destinatário/comprador: <strong>{movement.recipient_name}</strong></p>}<p className="mt-1 text-xs text-outline">Solicitado por {movement.requester?.name} em {format(new Date(movement.requested_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}</p>{movement.notes && <p className="mt-2 text-sm text-outline">{movement.notes}</p>}</div></div>{movement.decided_at && <div className="text-sm sm:text-right"><strong>{movement.decider?.name}</strong><p className="text-outline">Assinado digitalmente</p><p className="text-xs text-outline">{format(new Date(movement.decided_at), "dd/MM/yyyy 'as' HH:mm")}</p>{movement.decision_comment && <p className="mt-1 max-w-sm">{movement.decision_comment}</p>}</div>}</div>{pending && canApprove && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20"><label className="text-sm font-bold">Parecer da gestão (obrigatório para rejeitar)</label><textarea rows="2" className={`${inputClass} mt-1`} value={comment} onChange={(event) => setComment(event.target.value)} /><div className="mt-2 flex flex-wrap gap-2"><button disabled={saving} onClick={() => onDecide("approved")} className="rounded-full bg-emerald-600 px-4 py-2 font-bold text-white">Autorizar e assinar</button><button disabled={saving} onClick={() => onDecide("rejected")} className="rounded-full bg-red-600 px-4 py-2 font-bold text-white">Rejeitar</button></div></div>}</article>;
}

function ProductForm({ form, setForm, saving, onSubmit, onCancel }) { const profit = margin(form); return <form onSubmit={onSubmit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Produto *"><input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Caneca Iracambi" /></Field><Field label="Código/SKU"><input className={inputClass} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></Field><Field label="Categoria"><input className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex.: Canecas, camisas" /></Field><Field label="Estoque mínimo"><input required min="0" step="1" type="number" className={inputClass} value={form.minimum_stock} onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })} /></Field><Field label="Custo unitário *"><input required min="0" step="0.01" type="number" className={inputClass} value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} /></Field><Field label="Preço de venda *"><input required min="0" step="0.01" type="number" className={inputClass} value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} /></Field></div><p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-800">Lucro unitário: <strong>{money(Number(form.sale_price) - Number(form.cost_price))}</strong> · Margem: <strong>{profit === null ? "Não calculável" : `${profit.toFixed(1)}%`}</strong></p><Field label="Descrição"><textarea rows="3" className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field><label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />Produto ativo</label><Actions saving={saving} onCancel={onCancel} /></form>; }

function MovementForm({ form, setForm, products, saving, onSubmit, onCancel }) { const product = products.find((item) => item.id === form.product_id); const choose = (id) => { const selected = products.find((item) => item.id === id); setForm({ ...form, product_id: id, unit_cost: selected?.cost_price ?? "", unit_sale_price: selected?.sale_price ?? "" }); }; return <form onSubmit={onSubmit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Tipo *"><select className={inputClass} value={form.movement_type} onChange={(e) => setForm({ ...form, movement_type: e.target.value })}>{Object.entries(typeLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Produto *"><select required className={inputClass} value={form.product_id} onChange={(e) => choose(e.target.value)}><option value="">Selecione</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.stock_quantity} un.</option>)}</select></Field><Field label="Quantidade *"><input required min="1" step="1" type="number" className={inputClass} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>{form.movement_type === "entry" && <Field label="Custo unitário *"><input required min="0" step="0.01" type="number" className={inputClass} value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} /></Field>}{form.movement_type === "sale" && <Field label="Valor unitário da venda *"><input required min="0" step="0.01" type="number" className={inputClass} value={form.unit_sale_price} onChange={(e) => setForm({ ...form, unit_sale_price: e.target.value })} /></Field>}{form.movement_type !== "entry" && <Field label={form.movement_type === "sale" ? "Vendido para *" : "Entregue como bonificação para *"}><input required className={inputClass} value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} /></Field>}</div>{product && form.movement_type !== "entry" && <p className="rounded-xl bg-surface p-3 text-sm">Estoque disponível: <strong>{product.stock_quantity} unidade(s)</strong></p>}{form.movement_type === "bonus" && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">A bonificação será enviada para autorização superior. O estoque somente será baixado após o aceite digital da gestão.</p>}<Field label="Observações"><textarea rows="3" className={inputClass} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field><Actions saving={saving} onCancel={onCancel} submitLabel={form.movement_type === "bonus" ? "Solicitar autorização" : "Registrar"} /></form>; }

function Modal({ title, children, onClose }) { return <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl dark:bg-dark-surface sm:p-7"><div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-black text-primary dark:text-white">{title}</h2><button type="button" onClick={onClose} aria-label="Fechar"><span className="material-symbols-outlined">close</span></button></div>{children}</div></div>; }
function Field({ label, children }) { return <label><span className="mb-1 block text-sm font-bold">{label}</span>{children}</label>; }
function Info({ label, value, alert }) { return <div><span className="block text-xs text-outline">{label}</span><strong className={alert ? "text-red-700" : "text-primary dark:text-white"}>{value}</strong></div>; }
function SmallButton({ onClick, label, icon }) { return <button type="button" onClick={onClick} className="inline-flex items-center gap-1 rounded-full border border-primary/30 px-3 py-2 text-xs font-bold text-primary dark:text-white"><span className="material-symbols-outlined text-[17px]">{icon}</span>{label}</button>; }
function Actions({ saving, onCancel, submitLabel = "Salvar" }) { return <div className="flex justify-end gap-2 border-t border-surface-variant pt-4"><button type="button" onClick={onCancel} className="rounded-full px-5 py-2.5 font-bold">Cancelar</button><button disabled={saving} className="rounded-full bg-primary px-6 py-2.5 font-black text-white disabled:opacity-50">{saving ? "Salvando..." : submitLabel}</button></div>; }
