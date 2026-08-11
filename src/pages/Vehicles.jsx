/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "../lib/supabaseClient";
import { useCurrentUser } from "../context/CurrentUserContext";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { useLocation } from "react-router-dom";

const emptyVehicle = { name: "", plate: "", capacity: 5, status: "available", notes: "" };
const emptyBooking = {
  vehicle_id: "", person_id: "", program_id: "", start_at: "", end_at: "",
  destination: "", purpose: "", passengers: 1, notes: "",
};
const emptyCompletion = { start_odometer: "", end_odometer: "", completion_notes: "" };

const inputClass =
  "w-full bg-surface dark:bg-gray-800 border border-surface-variant dark:border-gray-700 focus:border-primary focus:ring-primary rounded-xl px-3 py-2.5 text-on-surface dark:text-white";

function toLocalInput(date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function statusLabel(status) {
  return { available: "Disponível", maintenance: "Em manutenção", inactive: "Inativo" }[status] || status;
}

export default function Vehicles() {
  const location = useLocation();
  const { currentUser, persons } = useCurrentUser();
  const [tab, setTab] = useState("schedule");
  const [vehicles, setVehicles] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [bookingForm, setBookingForm] = useState(emptyBooking);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [completionTarget, setCompletionTarget] = useState(null);
  const [completionForm, setCompletionForm] = useState(emptyCompletion);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    const [vehicleResult, programResult, bookingResult] = await Promise.all([
      supabase.from("vehicles").select("*").order("name"),
      supabase.from("programs").select("id, name, leader_id").order("name"),
      supabase
        .from("vehicle_bookings")
        .select("*, vehicle:vehicle_id(id,name,plate,capacity), person:person_id(id,name,is_active), program:program_id(id,name)")
        .order("start_at"),
    ]);
    const firstError = vehicleResult.error || programResult.error || bookingResult.error;
    if (firstError) setError(`Não foi possível carregar o módulo: ${firstError.message}`);
    setVehicles(vehicleResult.data || []);
    setPrograms(programResult.data || []);
    setBookings(bookingResult.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    if (location.state?.quickAction === "booking") {
      const start = new Date();
      start.setMinutes(Math.ceil((start.getMinutes() + 1) / 30) * 30, 0, 0);
      setTab("schedule");
      setEditingBooking(null);
      setBookingForm((current) => ({ ...current, start_at: toLocalInput(start), end_at: toLocalInput(new Date(start.getTime() + 60 * 60 * 1000)) }));
      setShowBookingForm(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (!showBookingForm || editingBooking) return;
    const available = vehicles.filter((vehicle) => vehicle.status === "available");
    const userProgram = programs.find((program) => program.leader_id === currentUser?.id);
    setBookingForm((current) => ({
      ...current,
      vehicle_id: available.length === 1 ? available[0].id : current.vehicle_id,
      person_id: currentUser?.id || current.person_id,
      program_id: userProgram?.id || current.program_id,
    }));
  }, [showBookingForm, editingBooking, vehicles, programs, currentUser]);

  const scheduledBookings = useMemo(
    () => bookings.filter((item) => item.status === "scheduled"),
    [bookings],
  );
  const completedBookings = useMemo(
    () => bookings
      .filter((item) => item.status === "completed")
      .sort((a, b) => new Date(b.completed_at || b.updated_at) - new Date(a.completed_at || a.updated_at))
      .slice(0, 10),
    [bookings],
  );

  function openNewBooking() {
    const start = new Date();
    start.setMinutes(Math.ceil((start.getMinutes() + 1) / 30) * 30, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const available = vehicles.filter((vehicle) => vehicle.status === "available");
    const userProgram = programs.find((program) => program.leader_id === currentUser?.id);
    setEditingBooking(null);
    setBookingForm({
      ...emptyBooking,
      vehicle_id: available.length === 1 ? available[0].id : "",
      person_id: currentUser?.id || "",
      program_id: userProgram?.id || "",
      start_at: toLocalInput(start),
      end_at: toLocalInput(end),
    });
    setError("");
    setShowBookingForm(true);
  }

  function editBooking(item) {
    setEditingBooking(item.id);
    setError("");
    setSuccess("");
    setBookingForm({
      vehicle_id: item.vehicle_id,
      person_id: item.person_id,
      program_id: item.program_id,
      start_at: toLocalInput(new Date(item.start_at)),
      end_at: toLocalInput(new Date(item.end_at)),
      destination: item.destination || "",
      purpose: item.purpose,
      passengers: item.passengers,
      notes: item.notes || "",
    });
    setShowBookingForm(true);
  }

  async function saveBooking(event) {
    event.preventDefault();
    setError("");
    const now = new Date();
    if (new Date(bookingForm.start_at) < now || new Date(bookingForm.end_at) < now) {
      setError("As datas de saída e retorno não podem ser anteriores à data e hora atuais.");
      return;
    }
    if (new Date(bookingForm.end_at) <= new Date(bookingForm.start_at)) {
      setError("O horário de término deve ser posterior ao horário de início.");
      return;
    }
    const selectedVehicle = vehicles.find((item) => item.id === bookingForm.vehicle_id);
    if (Number(bookingForm.passengers) > selectedVehicle?.capacity) {
      setError(`Este veículo comporta no máximo ${selectedVehicle.capacity} pessoas.`);
      return;
    }
    setSaving(true);
    let conflictQuery = supabase
      .from("vehicle_bookings")
      .select("id")
      .eq("vehicle_id", bookingForm.vehicle_id)
      .neq("status", "cancelled")
      .lt("start_at", new Date(bookingForm.end_at).toISOString())
      .gt("end_at", new Date(bookingForm.start_at).toISOString());
    if (editingBooking) conflictQuery = conflictQuery.neq("id", editingBooking);
    const { data: conflicts, error: conflictError } = await conflictQuery.limit(1);
    if (conflictError || conflicts?.length) {
      setError(conflictError?.message || "Este veículo já está reservado nesse período.");
      setSaving(false);
      return;
    }
    const payload = {
      ...bookingForm,
      passengers: Number(bookingForm.passengers),
      start_at: new Date(bookingForm.start_at).toISOString(),
      end_at: new Date(bookingForm.end_at).toISOString(),
    };
    const result = editingBooking
      ? await supabase.from("vehicle_bookings").update(payload).eq("id", editingBooking)
      : await supabase.from("vehicle_bookings").insert(payload);
    setSaving(false);
    if (result.error) return setError(result.error.message);
    setShowBookingForm(false);
    setSuccess(editingBooking ? "Agendamento atualizado." : "Veículo agendado com sucesso.");
    await loadData();
  }

  function chooseBookingPerson(personId) {
    const program = programs.find((item) => item.leader_id === personId);
    setBookingForm((current) => ({ ...current, person_id: personId, program_id: program?.id || "" }));
  }

  function openVehicleForm(vehicle = null) {
    setEditingVehicle(vehicle?.id || null);
    setError("");
    setSuccess("");
    setVehicleForm(vehicle ? {
      name: vehicle.name, plate: vehicle.plate, capacity: vehicle.capacity,
      status: vehicle.status, notes: vehicle.notes || "",
    } : emptyVehicle);
    setShowVehicleForm(true);
  }

  async function saveVehicle(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...vehicleForm,
      plate: vehicleForm.plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""),
      capacity: Number(vehicleForm.capacity),
    };
    const result = editingVehicle
      ? await supabase.from("vehicles").update(payload).eq("id", editingVehicle)
      : await supabase.from("vehicles").insert(payload);
    setSaving(false);
    if (result.error) return setError(result.error.message);
    setShowVehicleForm(false);
    setSuccess(editingVehicle ? "Veículo atualizado." : "Veículo cadastrado.");
    await loadData();
  }

  async function cancelBooking(item) {
    const { error: updateError } = await supabase
      .from("vehicle_bookings").update({ status: "cancelled" }).eq("id", item.id);
    if (updateError) setError(updateError.message);
    else {
      setDeleteTarget(null);
      setSuccess("Agendamento cancelado.");
      await loadData();
    }
  }

  function openCompletion(item) {
    setCompletionTarget(item);
    setCompletionForm({
      start_odometer: item.start_odometer ?? "",
      end_odometer: item.end_odometer ?? "",
      completion_notes: item.completion_notes ?? "",
    });
    setError("");
    setSuccess("");
  }

  async function completeBooking(event) {
    event.preventDefault();
    setError("");
    const startOdometer = Number(completionForm.start_odometer);
    const endOdometer = Number(completionForm.end_odometer);
    if (!Number.isFinite(startOdometer) || !Number.isFinite(endOdometer) || startOdometer < 0 || endOdometer < 0) {
      setError("Informe quilometragens válidas.");
      return;
    }
    if (endOdometer < startOdometer) {
      setError("O KM final não pode ser menor que o KM inicial.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase
      .from("vehicle_bookings")
      .update({
        start_odometer: startOdometer,
        end_odometer: endOdometer,
        completion_notes: completionForm.completion_notes.trim() || null,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", completionTarget.id)
      .eq("status", "scheduled");
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setCompletionTarget(null);
    setCompletionForm(emptyCompletion);
    setSuccess(`Agendamento finalizado. Distância percorrida: ${endOdometer - startOdometer} km.`);
    await loadData();
  }

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-sm text-primary-light dark:text-green-300 font-medium">Mobilidade Iracambi</p>
          <h2 className="font-roboto text-headline-lg text-primary dark:text-white">Veículos</h2>
          <p className="text-sm text-on-surface-variant dark:text-gray-400">Gerencie a frota e evite conflitos de agenda.</p>
        </div>
        <button onClick={openNewBooking} className="bg-accent text-primary font-bold px-5 py-3 rounded-full flex items-center justify-center gap-2 hover:bg-yellow-400 active:scale-95">
          <span className="material-symbols-outlined">add</span>Novo agendamento
        </button>
      </div>

      {(error || success) && (
        <div className={`mb-4 p-3 rounded-xl flex items-center justify-between ${error ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"}`}>
          <span>{error || success}</span>
          <button onClick={() => { setError(""); setSuccess(""); }} aria-label="Fechar"><span className="material-symbols-outlined">close</span></button>
        </div>
      )}

      <div className="inline-flex p-1 bg-surface dark:bg-dark-surface rounded-xl mb-6">
        {[["schedule", "Agenda", "calendar_month"], ["fleet", "Frota", "directions_car"]].map(([value, label, icon]) => (
          <button key={value} onClick={() => setTab(value)} className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium ${tab === value ? "bg-white dark:bg-gray-700 text-primary dark:text-white shadow-sm" : "text-outline dark:text-gray-400"}`}>
            <span className="material-symbols-outlined text-[20px]">{icon}</span>{label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-outline">Carregando veículos...</div>
      ) : tab === "schedule" ? (
        <div className="space-y-3">
          {scheduledBookings.length === 0 && <Empty icon="event_available" text="Nenhum agendamento pendente." />}
          {scheduledBookings.map((item) => (
            <article key={item.id} className="bg-white dark:bg-dark-surface border border-surface-variant dark:border-white/10 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className="min-w-[120px]">
                <p className="font-bold text-primary dark:text-white capitalize">{format(new Date(item.start_at), "EEE, dd MMM", { locale: ptBR })}</p>
                <p className="text-sm text-outline">{format(new Date(item.start_at), "HH:mm")} – {format(new Date(item.end_at), "HH:mm")}</p>
              </div>
              <div className="flex-1 border-l-4 border-accent pl-4">
                <h3 className="font-bold text-primary dark:text-white">{item.vehicle?.name} <span className="text-xs font-normal text-outline">{item.vehicle?.plate}</span></h3>
                <p className="text-on-surface dark:text-gray-200">{item.purpose}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-outline dark:text-gray-400">
                  <span>👤 {item.person?.name}{item.person?.is_active === false ? " · Usuário desativado" : ""}</span><span>🌱 {item.program?.name}</span>
                  {item.destination && <span>📍 {item.destination}</span>}<span>👥 {item.passengers}</span>
                </div>
              </div>
              <div className="flex gap-2 self-end md:self-center">
                <button onClick={() => openCompletion(item)} className="p-2 rounded-full text-green-700 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-900/30" title="Finalizar"><span className="material-symbols-outlined">task_alt</span></button>
                <button onClick={() => editBooking(item)} className="p-2 rounded-full hover:bg-surface dark:hover:bg-white/10" title="Editar"><span className="material-symbols-outlined">edit</span></button>
                <button onClick={() => setDeleteTarget(item)} className="p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" title="Cancelar"><span className="material-symbols-outlined">event_busy</span></button>
              </div>
            </article>
          ))}
          {completedBookings.length > 0 && (
            <section className="pt-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-outline">Finalizados recentemente</h3>
              <div className="space-y-2">
                {completedBookings.map((item) => (
                  <article key={item.id} className="bg-white/70 dark:bg-dark-surface/70 border border-surface-variant dark:border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-300">check_circle</span>
                    <div className="flex-1">
                      <p className="font-bold text-primary dark:text-white">{item.vehicle?.name} <span className="text-xs font-normal text-outline">{item.vehicle?.plate}</span></p>
                      <p className="text-sm text-outline">{format(new Date(item.start_at), "dd/MM/yyyy")} · {item.purpose}</p>
                    </div>
                    <div className="text-sm sm:text-right">
                      <p className="font-medium text-primary dark:text-white">{item.start_odometer} → {item.end_odometer} km</p>
                      <p className="text-outline">{item.end_odometer - item.start_odometer} km percorridos</p>
                    </div>
                    {item.completion_notes && <p className="sm:basis-full text-sm text-outline"><strong>Observação:</strong> {item.completion_notes}</p>}
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => openVehicleForm()} className="border border-primary text-primary dark:text-white dark:border-white px-4 py-2 rounded-full flex items-center gap-2"><span className="material-symbols-outlined">add</span>Cadastrar veículo</button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.length === 0 && <div className="sm:col-span-2 lg:col-span-3"><Empty icon="no_crash" text="Nenhum veículo cadastrado." /></div>}
            {vehicles.map((vehicle) => (
              <article key={vehicle.id} className="bg-white dark:bg-dark-surface border border-surface-variant dark:border-white/10 rounded-xl p-5">
                <div className="flex justify-between items-start">
                  <span className="material-symbols-outlined text-4xl text-primary-light dark:text-green-300">directions_car</span>
                  <button onClick={() => openVehicleForm(vehicle)} className="p-2 rounded-full hover:bg-surface dark:hover:bg-white/10"><span className="material-symbols-outlined">edit</span></button>
                </div>
                <h3 className="font-bold text-lg text-primary dark:text-white mt-3">{vehicle.name}</h3>
                <p className="font-mono tracking-wider text-outline">{vehicle.plate}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-outline">{vehicle.capacity} lugares</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${vehicle.status === "available" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{statusLabel(vehicle.status)}</span>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {showBookingForm && (
        <Modal title={editingBooking ? "Editar agendamento" : "Agendar veículo"} onClose={() => setShowBookingForm(false)}>
          <form onSubmit={saveBooking} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="relative z-10 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-700 shadow-sm dark:border-red-700 dark:bg-red-900/40 dark:text-red-200"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">error</span>
                <span className="flex-1">{error}</span>
                <button
                  type="button"
                  onClick={() => setError("")}
                  className="rounded-full p-0.5 hover:bg-red-100 dark:hover:bg-red-800"
                  aria-label="Fechar mensagem"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Veículo"><select required disabled={!editingBooking && vehicles.filter((vehicle) => vehicle.status === "available").length === 1} className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-75`} value={bookingForm.vehicle_id} onChange={(e) => setBookingForm({ ...bookingForm, vehicle_id: e.target.value })}><option value="">Selecione</option>{vehicles.filter(v => v.status === "available" || v.id === bookings.find(b => b.id === editingBooking)?.vehicle_id).map(v => <option key={v.id} value={v.id}>{v.name} · {v.plate}</option>)}</select></Field>
              <Field label="Solicitante"><select required className={inputClass} value={bookingForm.person_id} onChange={(e) => chooseBookingPerson(e.target.value)}><option value="">Selecione</option>{persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
              <Field label="Programa"><select required disabled={programs.some((program) => program.leader_id === bookingForm.person_id)} className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-75`} value={bookingForm.program_id} onChange={(e) => setBookingForm({ ...bookingForm, program_id: e.target.value })}><option value="">Selecione</option>{programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
              <Field label="Número de passageiros"><input required min="1" type="number" className={inputClass} value={bookingForm.passengers} onChange={(e) => setBookingForm({ ...bookingForm, passengers: e.target.value })} /></Field>
              <Field label="Saída"><input required type="datetime-local" min={toLocalInput(new Date())} className={inputClass} value={bookingForm.start_at} onChange={(e) => setBookingForm({ ...bookingForm, start_at: e.target.value })} /></Field>
              <Field label="Retorno"><input required type="datetime-local" min={bookingForm.start_at || toLocalInput(new Date())} className={inputClass} value={bookingForm.end_at} onChange={(e) => setBookingForm({ ...bookingForm, end_at: e.target.value })} /></Field>
              <Field label="Finalidade"><input required className={inputClass} value={bookingForm.purpose} onChange={(e) => setBookingForm({ ...bookingForm, purpose: e.target.value })} placeholder="Ex.: visita de campo" /></Field>
              <Field label="Destino"><input className={inputClass} value={bookingForm.destination} onChange={(e) => setBookingForm({ ...bookingForm, destination: e.target.value })} placeholder="Cidade ou local" /></Field>
            </div>
            <Field label="Observações"><textarea className={inputClass} rows="2" value={bookingForm.notes} onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })} /></Field>
            <Actions saving={saving} onCancel={() => setShowBookingForm(false)} />
          </form>
        </Modal>
      )}

      {showVehicleForm && (
        <Modal title={editingVehicle ? "Editar veículo" : "Cadastrar veículo"} onClose={() => setShowVehicleForm(false)}>
          <form onSubmit={saveVehicle} className="space-y-4">
            <Field label="Nome do veículo"><input required className={inputClass} value={vehicleForm.name} onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })} placeholder="Ex.: Toyota Hilux" /></Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Placa"><input required maxLength="8" className={inputClass} value={vehicleForm.plate} onChange={(e) => setVehicleForm({ ...vehicleForm, plate: e.target.value })} placeholder="ABC1D23" /></Field>
              <Field label="Capacidade"><input required min="1" max="99" type="number" className={inputClass} value={vehicleForm.capacity} onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: e.target.value })} /></Field>
              <Field label="Situação"><select className={inputClass} value={vehicleForm.status} onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })}><option value="available">Disponível</option><option value="maintenance">Em manutenção</option><option value="inactive">Inativo</option></select></Field>
            </div>
            <Field label="Observações"><textarea className={inputClass} rows="2" value={vehicleForm.notes} onChange={(e) => setVehicleForm({ ...vehicleForm, notes: e.target.value })} /></Field>
            <Actions saving={saving} onCancel={() => setShowVehicleForm(false)} />
          </form>
        </Modal>
      )}

      {completionTarget && (
        <Modal title="Finalizar agendamento" onClose={() => setCompletionTarget(null)}>
          <form onSubmit={completeBooking} className="space-y-4">
            <div className="rounded-xl bg-surface dark:bg-gray-800 p-4">
              <p className="font-bold text-primary dark:text-white">{completionTarget.vehicle?.name} · {completionTarget.vehicle?.plate}</p>
              <p className="text-sm text-outline">{completionTarget.purpose}</p>
            </div>
            {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200">{error}</div>}
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="KM inicial">
                <input required min="0" step="1" inputMode="numeric" type="number" className={inputClass} value={completionForm.start_odometer} onChange={(e) => setCompletionForm({ ...completionForm, start_odometer: e.target.value })} />
              </Field>
              <Field label="KM final">
                <input required min="0" step="1" inputMode="numeric" type="number" className={inputClass} value={completionForm.end_odometer} onChange={(e) => setCompletionForm({ ...completionForm, end_odometer: e.target.value })} />
              </Field>
            </div>
            {completionForm.start_odometer !== "" && completionForm.end_odometer !== "" && Number(completionForm.end_odometer) >= Number(completionForm.start_odometer) && (
              <p className="text-sm text-outline">Distância percorrida: <strong className="text-primary dark:text-white">{Number(completionForm.end_odometer) - Number(completionForm.start_odometer)} km</strong></p>
            )}
            <Field label="Observação da finalização">
              <textarea
                className={inputClass}
                rows="3"
                maxLength="2000"
                value={completionForm.completion_notes}
                onChange={(e) => setCompletionForm({ ...completionForm, completion_notes: e.target.value })}
                placeholder="Registre ocorrências, avarias ou outras informações relevantes (opcional)"
              />
            </Field>
            <Actions saving={saving} onCancel={() => setCompletionTarget(null)} submitLabel="Finalizar" />
          </form>
        </Modal>
      )}

      <ConfirmDialog isOpen={!!deleteTarget} title="Cancelar agendamento" message={deleteTarget ? `Deseja cancelar a reserva de ${deleteTarget.vehicle?.name} em ${format(new Date(deleteTarget.start_at), "dd/MM 'às' HH:mm")}?` : ""} confirmText="Sim, cancelar" onCancel={() => setDeleteTarget(null)} onConfirm={() => cancelBooking(deleteTarget)} />
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block"><span className="block text-sm font-medium text-primary dark:text-gray-200 mb-1.5">{label}</span>{children}</label>;
}

function Modal({ title, onClose, children }) {
  return <div className="fixed inset-0 z-[60] bg-stone-900/40 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 pt-10 sm:pt-16"><div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-2xl p-5 sm:p-7"><div className="flex justify-between items-center mb-5"><h3 className="text-xl font-bold text-primary dark:text-white">{title}</h3><button onClick={onClose} className="p-2 rounded-full hover:bg-surface dark:hover:bg-white/10"><span className="material-symbols-outlined">close</span></button></div>{children}</div></div>;
}

function Actions({ saving, onCancel, submitLabel = "Salvar" }) {
  return <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-full border border-surface-variant dark:border-gray-600">Cancelar</button><button disabled={saving} type="submit" className="px-6 py-2.5 rounded-full bg-accent text-primary font-bold disabled:opacity-50">{saving ? "Salvando..." : submitLabel}</button></div>;
}

function Empty({ icon, text }) {
  return <div className="py-14 text-center bg-white dark:bg-dark-surface border border-dashed border-surface-variant dark:border-gray-700 rounded-xl"><span className="material-symbols-outlined text-5xl text-outline">{icon}</span><p className="mt-2 text-outline">{text}</p></div>;
}
