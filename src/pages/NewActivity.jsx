import { useState, useEffect, useRef } from "react";
/* eslint-disable react-hooks/set-state-in-effect */
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { startOfWeek, addDays, format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { shareViaWhatsApp, formatAgendaForWhatsAppSimple } from "../lib/whatsapp";
import { useCurrentUser } from "../context/CurrentUserContext";
import { useAdvancedSettings } from "../context/AdvancedSettingsContext";
import { getUserColor } from "../lib/colors";
import PhotoUpload from "../components/activities/PhotoUpload";
import FileUpload from "../components/activities/FileUpload";
import EventFields from "../components/activities/EventFields";
import TeamMemberSelector from "../components/activities/TeamMemberSelector";
import { emptyEventData } from "../lib/events";
import { sentenceCase, sentenceCaseEventData } from "../lib/textFormatting";

export default function NewActivity() {
  const location = useLocation();
  const { currentUser } = useCurrentUser();
  const { modes } = useAdvancedSettings();
  const uncommittedUploads = useRef({ images: new Set(), files: new Set() });

  useEffect(() => () => {
    const imagePaths = [...uncommittedUploads.current.images];
    const filePaths = [...uncommittedUploads.current.files];
    if (imagePaths.length) supabase.storage.from("activity-attachments").remove(imagePaths);
    if (filePaths.length) supabase.storage.from("activity-files").remove(filePaths);
  }, []);

  const trackUploads = (bucket, metadata) => {
    for (const path of metadata?.uploadedPaths || []) uncommittedUploads.current[bucket].add(path);
  };
  const [programs, setPrograms] = useState([]);
  const [managementProjects, setManagementProjects] = useState([]);
  const [persons, setPersons] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleBookings, setVehicleBookings] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedManagementProject, setSelectedManagementProject] = useState("");
  const [selectedPerson, setSelectedPerson] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("Média");
  const [whatsAppStartTime, setWhatsAppStartTime] = useState("08:00");
  const [whatsAppEndTime, setWhatsAppEndTime] = useState("17:00");

  const getInitialMode = () => {
    if (modes.wpp) return "wpp";
    if (modes.quick) return "quick";
    return null;
  };
  const [selectedMode, setSelectedMode] = useState(getInitialMode());

  const [weekText, setWeekText] = useState("");
  const rawWeekDate = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const [quickActivities, setQuickActivities] = useState([
    { 
      date: format(new Date(), "yyyy-MM-dd"), 
      title: "", 
      description: "", 
      involvedIds: [], 
      priority: "Média", 
      repeat: false, 
      repeatEndDate: "", 
      repeatDays: [], 
      images: [],
      files: [],
      startDateTime: "",
      endDateTime: "",
      isEvent: false,
      eventData: emptyEventData(),
      usesVehicle: false,
      vehicleBooking: { vehicle_id: "", passengers: 1, destination: "", notes: "" },
    },
  ]);
  const [involvedIdsGlobal, setInvolvedIdsGlobal] = useState([]);
  const [globalImages, setGlobalImages] = useState([]);
  const [globalFiles, setGlobalFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [lastInserted, setLastInserted] = useState(null);
  const [vehicleModal, setVehicleModal] = useState(null);

  // ---- Menções ----
  const [mentionIndex, setMentionIndex] = useState(null);
  const [mentionList, setMentionList] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const textareaRefs = useRef([]);

  // Clonagem de atividade (pré‑preenchimento)
  useEffect(() => {
    const dueDate = location.state?.dueDate;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate || "")) {
      setQuickActivities((items) => items.map((item, index) => index === 0 ? { ...item, date: dueDate } : item));
      setSelectedMode("quick");
      window.history.replaceState({}, document.title);
    }
    const clone = location.state?.clone;
    if (clone) {
      setSelectedProgram(clone.program || "");
      setSelectedPerson(clone.responsible || "");
      setSelectedPriority(clone.priority || "Média");
      if (clone.title) {
        setQuickActivities([{
          date: format(new Date(), "yyyy-MM-dd"),
          title: clone.title,
          description: clone.description || "",
          involvedIds: clone.involvedIds || [],
          priority: clone.priority || "Média",
          repeat: false,
          repeatEndDate: "",
          repeatDays: [],
          images: [],
          files: [],
          startDateTime: "",
          endDateTime: "",
          isEvent: clone.is_event || false,
          eventData: { ...emptyEventData(), ...(clone.event_data || {}) },
        }]);
        setSelectedMode("quick");
      }
      // Limpa o state para não recarregar em futuros acessos
      window.history.replaceState({}, document.title);
    }
    if (location.state?.createEvent) {
      const date = format(new Date(), "yyyy-MM-dd");
      setQuickActivities([{ date, title: "", description: "", involvedIds: [], priority: "Média", repeat: false, repeatEndDate: "", repeatDays: [], images: [], files: [], startDateTime: `${date}T09:00`, endDateTime: `${date}T17:00`, isEvent: true, eventData: { ...emptyEventData(), start_at: `${date}T09:00`, end_at: `${date}T17:00` } }]);
      setSelectedMode("quick");
      window.history.replaceState({}, document.title);
    }
    if (location.state?.managementProjectId) {
      setSelectedManagementProject(location.state.managementProjectId);
      setSelectedMode("quick");
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (!modes.wpp && selectedMode === "wpp") setSelectedMode(modes.quick ? "quick" : null);
    if (!modes.quick && selectedMode === "quick") setSelectedMode(modes.wpp ? "wpp" : null);
  }, [modes, selectedMode]);

  useEffect(() => {
    supabase.from("programs").select("id, name, leader_id").order("name").then(({ data }) => setPrograms(data || []));
    supabase.from("persons").select("id, name, initials").eq("is_active", true).order("name").then(({ data }) => setPersons(data || []));
    supabase.from("management_projects").select("id,title,program_id,status").not("status", "in", "(completed,cancelled)").order("title").then(({ data }) => setManagementProjects(data || []));
    supabase.from("vehicles").select("id,name,plate,capacity,status").eq("status", "available").order("name").then(({ data }) => setVehicles(data || []));
    supabase.from("vehicle_bookings").select("id,vehicle_id,start_at,end_at,status").eq("status", "scheduled").then(({ data }) => setVehicleBookings(data || []));
  }, []);

  useEffect(() => {
    const project = managementProjects.find((item) => item.id === selectedManagementProject);
    const program = programs.find((item) => item.id === project?.program_id);
    if (program) setSelectedProgram(program.name);
  }, [managementProjects, programs, selectedManagementProject]);

  useEffect(() => {
    if (!selectedProgram) return;
    const program = programs.find((item) => item.name === selectedProgram);
    const leader = persons.find((person) => person.id === program?.leader_id);
    setSelectedPerson(leader?.name || "");
  }, [persons, programs, selectedProgram]);

  const weekStartDate = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEndDate = format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 5), "yyyy-MM-dd");
  const weekDisplay = `${format(parseISO(weekStartDate), "dd 'de' MMM", { locale: ptBR })} – ${format(parseISO(weekEndDate), "dd 'de' MMM", { locale: ptBR })}`;

  // --- parser (mantido) ---
  function parseWeekText(text, mondayDate) {
    const dayMap = {
      'segunda': 0, 'segunda-feira': 0, 'segunda feira': 0,
      'terça': 1, 'terca': 1, 'terça-feira': 1, 'terca-feira': 1, 'terça feira': 1,
      'quarta': 2, 'quarta-feira': 2, 'quarta feira': 2,
      'quinta': 3, 'quinta-feira': 3, 'quinta feira': 3,
      'sexta': 4, 'sexta-feira': 4, 'sexta feira': 4,
      'sábado': 5, 'sabado': 5,
    };
    const activities = [];
    const lines = text.split('\n');
    let currentDay = null, currentLines = [], explicitDate = null;
    const dayPattern = /^(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado)(\s*(-feira| feira))?\s*[:.-]?\s*/i;
    const datePattern = /^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*[:.-]?\s*/;

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const dayMatch = trimmed.match(dayPattern);
      if (dayMatch) {
        if (currentDay !== null && currentLines.length > 0) {
          const { title, description } = buildTitleAndDescription(currentLines);
          activities.push({ dayOfWeek: currentDay, title, description, explicitDate });
        }
        let dayKey = dayMatch[1].toLowerCase();
        if (dayKey === 'terca') dayKey = 'terça';
        if (dayKey === 'sabado') dayKey = 'sábado';
        if (dayMatch[2]) dayKey += '-feira';
        currentDay = dayMap[dayKey] ?? null;
        let remaining = trimmed.replace(dayPattern, '').trim();
        explicitDate = null;
        const dateMatch = remaining.match(datePattern);
        if (dateMatch) {
          const dateStr = dateMatch[1];
          const parsed = parseDateFlexible(dateStr);
          if (parsed) explicitDate = format(parsed, "yyyy-MM-dd");
          remaining = remaining.replace(datePattern, '').trim();
        }
        currentLines = remaining ? [remaining] : [];
      } else if (currentDay !== null) {
        currentLines.push(trimmed);
      }
    }
    if (currentDay !== null && currentLines.length > 0) {
      const { title, description } = buildTitleAndDescription(currentLines);
      activities.push({ dayOfWeek: currentDay, title, description, explicitDate });
    }

    return activities.map(item => {
      let finalDate = item.explicitDate || format(addDays(mondayDate, item.dayOfWeek), "yyyy-MM-dd");
      return { title: item.title, description: item.description, due_date: finalDate, week_start: format(mondayDate, "yyyy-MM-dd") };
    });
  }
  function parseDateFlexible(dateStr) {
    const parts = dateStr.split('/');
    if (parts.length < 2 || parts.length > 3) return null;
    const day = parseInt(parts[0], 10), month = parseInt(parts[1], 10) - 1;
    let year = new Date().getFullYear();
    if (parts.length === 3) year = parseInt(parts[2], 10) + (parts[2] < 100 ? 2000 : 0);
    const date = new Date(year, month, day);
    return isValid(date) ? date : null;
  }
  function buildTitleAndDescription(lines) {
    const cleaned = lines.filter(l => l.trim() && !/^\d{1,2}\/\d{1,2}(\/\d{2,4})?\s*$/.test(l.trim()));
    if (cleaned.length === 0) return { title: "Atividade", description: "" };
    return { title: cleaned[0], description: cleaned.join('; ') };
  }

  const addQuickActivity = () => setQuickActivities([...quickActivities, { date: format(new Date(), "yyyy-MM-dd"), title: "", description: "", involvedIds: [], priority: "Média", repeat: false, repeatEndDate: "", repeatDays: [], images: [], files: [], startDateTime: "", endDateTime: "", isEvent: false, eventData: emptyEventData(), usesVehicle: false, vehicleBooking: { vehicle_id: "", passengers: 1, destination: "", notes: "" } }]);
  const removeQuickActivity = (i) => { if (quickActivities.length > 1) setQuickActivities(quickActivities.filter((_, idx) => idx !== i)); };
  const updateQuickActivity = (i, f, v) => { const u = [...quickActivities]; u[i][f] = v; setQuickActivities(u); };
  const openVehicleModal = (index, activity) => {
    const responsibleId = persons.find((person) => person.name === selectedPerson)?.id;
    setVehicleModal({
      index,
      value: {
        vehicle_id: activity.vehicleBooking?.vehicle_id || (vehicles.length === 1 ? vehicles[0].id : ""),
        start_at: activity.vehicleBooking?.start_at || (activity.isEvent ? activity.eventData?.start_at : activity.startDateTime) || "",
        end_at: activity.vehicleBooking?.end_at || (activity.isEvent ? activity.eventData?.end_at : activity.endDateTime) || "",
        destination: activity.vehicleBooking?.destination || "",
        notes: activity.vehicleBooking?.notes || "",
        start_odometer: activity.vehicleBooking?.start_odometer ?? "",
        end_odometer: activity.vehicleBooking?.end_odometer ?? "",
        completion_notes: activity.vehicleBooking?.completion_notes || "",
        passenger_ids: activity.vehicleBooking?.passenger_ids?.length ? activity.vehicleBooking.passenger_ids : (responsibleId ? [responsibleId] : []),
      },
    });
  };
  const confirmVehicleModal = () => {
    const booking = vehicleModal?.value;
    if (!booking?.vehicle_id || !booking.start_at || !booking.end_at || booking.end_at <= booking.start_at || !booking.passenger_ids?.length) {
      setMessage({ type: "error", text: "Informe veículo, saída, retorno e ao menos um passageiro." });
      return;
    }
    const selectedVehicle = vehicles.find((vehicle) => vehicle.id === booking.vehicle_id);
    if (booking.passenger_ids.length > selectedVehicle.capacity) {
      setMessage({ type: "error", text: `O veículo ${selectedVehicle.name} comporta no máximo ${selectedVehicle.capacity} pessoas.` });
      return;
    }
    if (booking.start_odometer !== "" && booking.end_odometer !== "" && Number(booking.end_odometer) < Number(booking.start_odometer)) {
      setMessage({ type: "error", text: "O KM de chegada não pode ser menor que o KM de partida." });
      return;
    }
    setQuickActivities((items) => items.map((item, index) => index === vehicleModal.index
      ? { ...item, usesVehicle: true, vehicleBooking: { ...booking, passengers: booking.passenger_ids.length } }
      : item));
    setVehicleModal(null);
    setMessage({ type: "", text: "" });
  };
  const addInvolved = (index, id) => {
    const updated = [...quickActivities];
    if (!updated[index].involvedIds.includes(id)) updated[index].involvedIds = [...updated[index].involvedIds, id];
    setQuickActivities(updated);
  };

  const mentionedPersonIds = (description = "") => {
    const normalized = description.toLocaleLowerCase("pt-BR");
    return persons.filter((person) => {
      const mention = `@${person.name.toLocaleLowerCase("pt-BR")}`;
      let position = normalized.indexOf(mention);
      while (position >= 0) {
        const nextCharacter = normalized[position + mention.length];
        if (!nextCharacter || /[\s.,;:!?()[\]{}\n]/.test(nextCharacter)) return true;
        position = normalized.indexOf(mention, position + mention.length);
      }
      return false;
    }).map((person) => person.id);
  };
  const toggleRepeatDay = (i, day) => { const u = [...quickActivities]; const days = u[i].repeatDays || []; if (days.includes(day)) u[i].repeatDays = days.filter(d => d !== day); else u[i].repeatDays = [...days, day]; setQuickActivities(u); };
  const switchToQuickWithText = () => {
    setQuickActivities([{ date: rawWeekDate, title: weekText.split('\n')[0] || "Atividade", description: weekText, involvedIds: involvedIdsGlobal, priority: selectedPriority, repeat: false, repeatEndDate: "", repeatDays: [], images: [], files: [], startDateTime: "", endDateTime: "", isEvent: false, eventData: emptyEventData() }]);
    setSelectedMode("quick");
    setMessage({ type: "", text: "" });
  };

  function generateRepeatDates(startDateStr, endDateStr, daysOfWeek) {
    const start = parseISO(startDateStr);
    const end = parseISO(endDateStr);
    if (!isValid(start) || !isValid(end) || daysOfWeek.length === 0) return [];
    const dates = [];
    let current = start;
    while (current <= end) {
      const dayOfWeek = current.getDay();
      const targetDays = daysOfWeek.map(d => ({ 'Seg': 1, 'Ter': 2, 'Qua': 3, 'Qui': 4, 'Sex': 5, 'Sáb': 6 }[d]));
      if (targetDays.includes(dayOfWeek)) dates.push(format(current, "yyyy-MM-dd"));
      current = addDays(current, 1);
    }
    return dates;
  }

  // Handlers de menção
  const handleDescriptionChange = (index, value) => {
    updateQuickActivity(index, "description", value);
    const textarea = textareaRefs.current[index];
    if (!textarea) return;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const match = textBeforeCursor.match(/@([\p{L}\p{M}.'-]*)$/u);
    if (match) {
      const normalize = (text = "") => text.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const query = normalize(match[1]);
      const filtered = persons
        .filter((person) => normalize(person.name).includes(query) || normalize(person.initials).includes(query))
        .sort((first, second) => {
          const firstName = normalize(first.name); const secondName = normalize(second.name);
          const firstRank = firstName.startsWith(query) ? 0 : normalize(first.initials).startsWith(query) ? 1 : 2;
          const secondRank = secondName.startsWith(query) ? 0 : normalize(second.initials).startsWith(query) ? 1 : 2;
          return firstRank - secondRank || first.name.localeCompare(second.name, "pt-BR", { sensitivity: "base" });
        });
      setMentionList(filtered);
      setShowMentions(true);
      setMentionIndex(index);
    } else {
      setShowMentions(false);
      setMentionIndex(null);
    }
  };

  const handleMentionClick = (person) => {
    if (mentionIndex === null) return;
    const textarea = textareaRefs.current[mentionIndex];
    if (!textarea) return;
    const cursorPos = textarea.selectionStart;
    const currentText = quickActivities[mentionIndex].description;
    const textBefore = currentText.substring(0, cursorPos);
    const textAfter = currentText.substring(cursorPos);
    const lastAtIndex = textBefore.lastIndexOf("@");
    const newText = textBefore.substring(0, lastAtIndex) + `@${person.name} `;
    updateQuickActivity(mentionIndex, "description", newText + textAfter);
    addInvolved(mentionIndex, person.id);
    setShowMentions(false);
    setMentionIndex(null);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newText.length, newText.length);
    }, 0);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedProgram || !selectedPerson) { setMessage({ type: "error", text: "Selecione programa e responsável." }); return; }
    setLoading(true);
    const programId = programs.find(p => p.name === selectedProgram)?.id || null;
    const personId = persons.find(p => p.name === selectedPerson)?.id || null;
    
    if (!personId) {
      setMessage({ type: "error", text: "Responsável não encontrado na base." });
      setLoading(false);
      return;
    }

    let list = [];
    if (selectedMode === "wpp") {
      const parsed = parseWeekText(weekText, parseISO(weekStartDate));
      if (parsed.length === 0) { setMessage({ type: "error", text: "Não foram encontrados dias da semana no texto.", action: "switch" }); setLoading(false); return; }
      if (!whatsAppStartTime || !whatsAppEndTime || whatsAppEndTime <= whatsAppStartTime) { setMessage({ type: "error", text: "Informe horários válidos de início e finalização; a finalização deve ser posterior ao início." }); setLoading(false); return; }
      if (parsed.some((item) => !item.description?.trim())) { setMessage({ type: "error", text: "Todas as atividades precisam de descrição." }); setLoading(false); return; }
      list = parsed.map(item => ({ 
        program_id: programId, 
        management_project_id: selectedManagementProject || null,
        responsible_id: personId, 
        created_by: personId, 
        title: item.title, 
        description: item.description, 
        week_start: item.week_start, 
        due_date: item.due_date, 
        status: "Planejado", 
        priority: selectedPriority, 
        involved_ids: involvedIdsGlobal,
        images: globalImages,
        files: globalFiles,
        start_datetime: `${item.due_date}T${whatsAppStartTime}`,
        end_datetime: `${item.due_date}T${whatsAppEndTime}`
      }));
    } else if (selectedMode === "quick") {
      for (let i = 0; i < quickActivities.length; i++) {
        const q = quickActivities[i];
        const activityStart = q.isEvent ? q.eventData?.start_at : q.startDateTime;
        const activityEnd = q.isEvent ? q.eventData?.end_at : q.endDateTime;
        if (!q.title.trim() || !q.date || !q.description.trim()) { setMessage({ type: "error", text: "Preencha título, data e descrição de todas as atividades." }); setLoading(false); return; }
        if (!activityStart || !activityEnd || activityEnd <= activityStart) { setMessage({ type: "error", text: `Informe início e finalização válidos para “${q.title}”.` }); setLoading(false); return; }
        if (q.isEvent && (!q.eventData?.theme?.trim() || !q.eventData?.start_at || !q.eventData?.end_at)) { setMessage({ type: "error", text: `Informe temática, início e término do evento “${q.title}”.` }); setLoading(false); return; }
        if (q.isEvent && q.eventData.start_at > q.eventData.end_at) { setMessage({ type: "error", text: `O término do evento “${q.title}” deve ser posterior ao início.` }); setLoading(false); return; }
        if (q.usesVehicle) {
          const selectedVehicle = vehicles.find((vehicle) => vehicle.id === q.vehicleBooking?.vehicle_id);
          if (!selectedVehicle) { setMessage({ type: "error", text: `Selecione um veículo para “${q.title}”.` }); setLoading(false); return; }
          if (!q.vehicleBooking?.passenger_ids?.length || q.vehicleBooking.passenger_ids.length > selectedVehicle.capacity) { setMessage({ type: "error", text: `Revise os passageiros do veículo ${selectedVehicle.name}, que comporta no máximo ${selectedVehicle.capacity} pessoas.` }); setLoading(false); return; }
          if (!q.vehicleBooking.start_at || !q.vehicleBooking.end_at || q.vehicleBooking.end_at <= q.vehicleBooking.start_at) { setMessage({ type: "error", text: `Revise a saída e o retorno da reserva para “${q.title}”.` }); setLoading(false); return; }
          if (new Date(q.vehicleBooking.start_at) < new Date()) { setMessage({ type: "error", text: `A reserva de veículo para “${q.title}” precisa iniciar no futuro.` }); setLoading(false); return; }
        }
        if (q.repeat && q.repeatEndDate && q.repeatDays.length > 0) {
          const dates = generateRepeatDates(q.date, q.repeatEndDate, q.repeatDays);
          dates.forEach(date => list.push({ 
            program_id: programId, 
            management_project_id: selectedManagementProject || null,
            responsible_id: personId, 
            created_by: personId, 
            title: q.title, 
            description: q.description, 
            week_start: format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), "yyyy-MM-dd"), 
            due_date: date, 
            status: "Planejado", 
            priority: q.priority || "Média", 
            involved_ids: q.involvedIds || [], 
            images: q.images || [],
            files: q.files || [],
            start_datetime: `${date}T${activityStart.slice(11, 16)}`,
            end_datetime: `${date}T${activityEnd.slice(11, 16)}`,
            is_event: q.isEvent || false,
            event_data: q.isEvent ? q.eventData : {},
            _vehicle_booking: q.usesVehicle ? { ...q.vehicleBooking, start_at: `${date}T${q.vehicleBooking.start_at.slice(11, 16)}`, end_at: `${date}T${q.vehicleBooking.end_at.slice(11, 16)}` } : null
          }));
        } else {
          const activityDate = q.isEvent ? q.eventData.start_at.slice(0, 10) : q.date;
          list.push({ 
            program_id: programId, 
            management_project_id: selectedManagementProject || null,
            responsible_id: personId, 
            created_by: personId, 
            title: q.title, 
            description: q.description, 
            week_start: format(startOfWeek(parseISO(activityDate), { weekStartsOn: 1 }), "yyyy-MM-dd"),
            due_date: activityDate,
            status: "Planejado", 
            priority: q.priority || "Média", 
            involved_ids: q.involvedIds || [], 
            images: q.images || [],
            files: q.files || [],
            start_datetime: activityStart,
            end_datetime: activityEnd,
            is_event: q.isEvent || false,
            event_data: q.isEvent ? q.eventData : {},
            _vehicle_booking: q.usesVehicle ? { ...q.vehicleBooking } : null
          });
        }
      }
    } else { setMessage({ type: "error", text: "Nenhum modo disponível." }); setLoading(false); return; }

    list = list.map((activity) => ({
      ...activity,
      title: sentenceCase(activity.title),
      description: sentenceCase(activity.description),
      event_data: activity.is_event ? sentenceCaseEventData(activity.event_data) : activity.event_data,
      involved_ids: [...new Set([...(activity.involved_ids || []), ...mentionedPersonIds(activity.description)])],
    }));

    const requestedBookings = list.filter((activity) => activity._vehicle_booking).map((activity) => activity._vehicle_booking);
    for (const booking of requestedBookings) {
      const start = new Date(booking.start_at);
      const end = new Date(booking.end_at);
      const conflict = vehicleBookings.some((existing) => existing.vehicle_id === booking.vehicle_id && new Date(existing.start_at) < end && new Date(existing.end_at) > start)
        || requestedBookings.some((other) => other !== booking && other.vehicle_id === booking.vehicle_id && new Date(other.start_at) < end && new Date(other.end_at) > start);
      if (conflict) { setMessage({ type: "error", text: "Um dos veículos selecionados já possui reserva no período informado." }); setLoading(false); return; }
    }

    const activityPayloads = list.map((activity) => {
      const payload = { ...activity };
      delete payload._vehicle_booking;
      return payload;
    });
    const { data: inserted, error } = await supabase.from("activities").insert(activityPayloads).select();
    if (error) { setMessage({ type: "error", text: "Erro: " + error.message }); setLoading(false); return; }

    const bookingsToInsert = (inserted || []).flatMap((activity, index) => {
      const booking = list[index]?._vehicle_booking;
      if (!booking) return [];
      return [{ activity_id: activity.id, vehicle_id: booking.vehicle_id, person_id: currentUser.id,
        program_id: activity.program_id, start_at: new Date(booking.start_at).toISOString(), end_at: new Date(booking.end_at).toISOString(),
        destination: booking.destination?.trim() || null, purpose: activity.title, passengers: booking.passenger_ids.length,
        passenger_ids: booking.passenger_ids, notes: booking.notes?.trim() || null,
        start_odometer: booking.start_odometer === "" ? null : Number(booking.start_odometer),
        end_odometer: booking.end_odometer === "" ? null : Number(booking.end_odometer),
        completion_notes: booking.completion_notes?.trim() || null }];
    });
    if (bookingsToInsert.length) {
      const { error: bookingError } = await supabase.from("vehicle_bookings").insert(bookingsToInsert);
      if (bookingError) {
        await supabase.from("activities").delete().in("id", inserted.map((activity) => activity.id));
        setMessage({ type: "error", text: `A agenda não foi publicada porque o veículo não pôde ser reservado: ${bookingError.message}` });
        setLoading(false);
        return;
      }
    }
    
    // Notificações
    if (inserted && inserted.length > 0) {
      const allLogs = [];
      for (const activity of inserted) {
        const mentionedIds = mentionedPersonIds(activity.description).filter((id) => id !== currentUser?.id);
        if (personId) {
          allLogs.push({
            activity_id: activity.id,
            person_id: personId,
            type: "create",
            content: `Atividade publicada: "${activity.title}"`,
            metadata: { program_id: activity.program_id, due_date: activity.due_date }
          });
        }
        for (const pid of mentionedIds) {
          allLogs.push({
            activity_id: activity.id,
            person_id: pid,
            type: "mention",
            content: `${currentUser?.name || "Alguém"} mencionou você na descrição de “${activity.title}”.`,
            metadata: { mentioned_by: currentUser?.id, source: "description" }
          });
        }
        if (activity.involved_ids && Array.isArray(activity.involved_ids) && activity.involved_ids.length > 0) {
          for (const pid of activity.involved_ids.filter((id) => !mentionedIds.includes(id) && id !== currentUser?.id)) {
            const person = persons.find(p => p.id === pid);
            if (person) {
              allLogs.push({
                activity_id: activity.id,
                person_id: pid,
                type: "involvement",
                content: `${currentUser?.name || "Alguém"} envolveu você na atividade "${activity.title}".`,
                metadata: { involved_person_id: pid, action: "added" }
              });
            }
          }
        }
      }
      if (allLogs.length > 0) {
        const { error: logsError } = await supabase.from("activity_logs").insert(allLogs);
        if (logsError) console.error("Erro ao inserir notificações:", logsError);
        else console.log(`${allLogs.length} notificações inseridas com sucesso.`);
      }
    }

    setMessage({ type: "success", text: `${list.length} atividade(s) lançada(s)!` });
    uncommittedUploads.current.images.clear();
    uncommittedUploads.current.files.clear();
    setLastInserted({ program: selectedProgram, responsible: selectedPerson, weekStart: list[0].week_start, activities: list });
    setWeekText("");
    setQuickActivities([{ date: format(new Date(), "yyyy-MM-dd"), title: "", description: "", involvedIds: [], priority: "Média", repeat: false, repeatEndDate: "", repeatDays: [], images: [], files: [], startDateTime: "", endDateTime: "", isEvent: false, eventData: emptyEventData(), usesVehicle: false, vehicleBooking: { vehicle_id: "", passengers: 1, destination: "", notes: "" } }]);
    setInvolvedIdsGlobal([]);
    setGlobalImages([]);
    setGlobalFiles([]);
    setSelectedPriority("Média");
    setLoading(false);
  }

  if (!modes.wpp && !modes.quick) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-0 mt-20 text-center">
        <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-4">Lançar Atividades</h2>
        <p className="text-on-surface-variant dark:text-gray-400">Nenhum modo de lançamento está habilitado no momento.</p>
        <Link to="/" className="inline-block mt-4 px-6 py-2 rounded-full bg-accent text-primary font-roboto text-label-md hover:bg-yellow-400 transition-all">Voltar ao Dashboard</Link>
      </div>
    );
  }

  const activeMode = modes.wpp && !modes.quick ? "wpp" : !modes.wpp && modes.quick ? "quick" : selectedMode;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <header className="mb-lg">
        <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-2">Lançar Atividades</h2>
        <p className="font-roboto text-body-lg text-on-surface-variant dark:text-gray-400">Compartilhe o planejamento da semana.</p>
      </header>

      {modes.wpp && modes.quick && (
        <div className="flex mb-6 bg-surface dark:bg-dark-surface rounded-xl p-1.5 border border-surface-variant dark:border-dark-surface-variant">
          <button onClick={() => setSelectedMode("wpp")} className={`flex-1 py-2 rounded-lg font-roboto text-label-sm flex items-center justify-center gap-2 transition-all ${activeMode === "wpp" ? "bg-[#075E54] text-white shadow-sm" : "text-on-surface-variant dark:text-gray-400 hover:bg-[#075E54]/10 dark:hover:bg-[#075E54]/30 hover:text-[#075E54] dark:hover:text-green-400"}`}>
            <span className="material-symbols-outlined text-[18px]">chat</span> WhatsApp
          </button>
          <button onClick={() => setSelectedMode("quick")} className={`flex-1 py-2 rounded-lg font-roboto text-label-sm flex items-center justify-center gap-2 transition-all ${activeMode === "quick" ? "bg-[#F59E0B] text-white shadow-sm" : "text-on-surface-variant dark:text-gray-400 hover:bg-[#F59E0B]/10 dark:hover:bg-[#F59E0B]/30 hover:text-[#D97706] dark:hover:text-amber-400"}`}>
            <span className="material-symbols-outlined text-[18px]">bolt</span> Rápido
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-surface-variant bg-white p-4 shadow-sm dark:border-dark-surface-variant dark:bg-dark-surface sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div>
            <label className="font-roboto text-label-md uppercase text-outline dark:text-gray-400">Programa</label>
            <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)} className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg text-on-surface dark:text-white font-roboto">
              <option value="">Selecione o Programa</option>
              {programs.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="font-roboto text-label-md uppercase text-outline dark:text-gray-400">Projeto de gestão</label>
            <select value={selectedManagementProject} onChange={e => setSelectedManagementProject(e.target.value)} className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg text-on-surface dark:text-white font-roboto">
              <option value="">Sem vínculo com projeto</option>
              {managementProjects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}
            </select>
          </div>
          <div>
            <label className="font-roboto text-label-md uppercase text-outline dark:text-gray-400">Responsável</label>
            <select value={selectedPerson} onChange={e => setSelectedPerson(e.target.value)} className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg text-on-surface dark:text-white font-roboto">
              <option value="">Selecione o Responsável</option>
              {persons.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="font-roboto text-label-md uppercase text-outline dark:text-gray-400">Prioridade</label>
            <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)} className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg text-on-surface dark:text-white font-roboto">
              <option value="Baixa">🟢 Baixa</option>
              <option value="Média">🟡 Média</option>
              <option value="Alta">🟠 Alta</option>
              <option value="Urgente">🔴 Urgente</option>
            </select>
          </div>
        </div>

        {/* WhatsApp Mode */}
        {activeMode === "wpp" && modes.wpp && (
          <>
            <div className="text-on-surface dark:text-gray-200 font-roboto text-sm flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-accent">event_note</span> Semana atual: {weekDisplay}
            </div>
            <div>
              <label className="font-roboto text-label-md uppercase text-outline dark:text-gray-400">Descritivo da Semana</label>
              <textarea required value={weekText} onChange={e => setWeekText(e.target.value)} className="w-full min-h-[300px] bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none p-4 rounded-t-xl resize-none text-on-surface dark:text-white font-roboto" placeholder="Segunda: Coleta de sementes..." />
              <p className="text-label-sm text-outline mt-2">Dica: cole o texto do chat. Use cabeçalhos como "Segunda:" ou "Terça-feira:".</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-on-surface dark:text-gray-200">Horário de início para as atividades<input required type="time" value={whatsAppStartTime} onChange={(event) => setWhatsAppStartTime(event.target.value)} className="mt-1 w-full rounded-xl border border-surface-variant bg-surface px-3 py-2.5 dark:bg-dark-background" /></label>
              <label className="text-sm font-semibold text-on-surface dark:text-gray-200">Horário de finalização para as atividades<input required type="time" value={whatsAppEndTime} onChange={(event) => setWhatsAppEndTime(event.target.value)} className="mt-1 w-full rounded-xl border border-surface-variant bg-surface px-3 py-2.5 dark:bg-dark-background" /></label>
            </div>
            <TeamMemberSelector people={persons.filter((person) => person.name !== selectedPerson)} selectedIds={involvedIdsGlobal} onChange={setInvolvedIdsGlobal} label="Envolver outras pessoas" />

            {/* Destaque para Fotos (WhatsApp) */}
            <div className="mt-4 p-3 border-2 border-dashed border-primary/30 dark:border-primary/40 rounded-xl bg-primary/5 dark:bg-primary/10">
              <label className="font-roboto text-label-sm text-primary dark:text-white font-semibold flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary">photo_camera</span>
                Fotos (para todas as atividades)
              </label>
              <PhotoUpload
                onUploadComplete={(newPhotos, metadata) => { setGlobalImages(newPhotos); trackUploads("images", metadata); }}
                existingPhotos={globalImages}
              />
            </div>

            {/* Destaque para Arquivos (WhatsApp) */}
            <div className="mt-4 p-3 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-xl bg-blue-50/30 dark:bg-blue-900/20">
              <label className="font-roboto text-label-sm text-blue-700 dark:text-blue-300 font-semibold flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-blue-600">attach_file</span>
                Arquivos (para todas as atividades)
              </label>
              <FileUpload
                onUploadComplete={(newFiles, metadata) => { setGlobalFiles(newFiles); trackUploads("files", metadata); }}
                existingFiles={globalFiles}
              />
            </div>
          </>
        )}

        {/* Quick Mode */}
        {activeMode === "quick" && modes.quick && (
          <div className="space-y-4">
            <h3 className="font-roboto text-label-md text-outline dark:text-gray-400 uppercase">Atividades Rápidas</h3>
            {quickActivities.map((qa, idx) => (
              <div key={idx} className="p-4 bg-surface dark:bg-dark-background rounded-xl border border-surface-variant dark:border-dark-surface-variant space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="font-roboto text-[10px] uppercase text-outline">Data</label>
                    <input required type="date" value={qa.date} onChange={e => updateQuickActivity(idx, "date", e.target.value)} className="w-full bg-transparent border-b border-primary/20 focus:border-accent outline-none py-1 text-sm text-on-surface dark:text-white font-roboto" />
                  </div>
                  <div>
                    <label className="font-roboto text-[10px] uppercase text-outline">Início</label>
                    <input required type="datetime-local" value={(qa.isEvent ? qa.eventData?.start_at : qa.startDateTime) || ""} onChange={e => { updateQuickActivity(idx, "startDateTime", e.target.value); if (qa.isEvent) updateQuickActivity(idx, "eventData", { ...qa.eventData, start_at: e.target.value }); }} className="w-full bg-transparent border-b border-primary/20 focus:border-accent outline-none py-1 text-sm text-on-surface dark:text-white font-roboto" />
                  </div>
                  <div>
                    <label className="font-roboto text-[10px] uppercase text-outline">Finalização</label>
                    <input required type="datetime-local" value={(qa.isEvent ? qa.eventData?.end_at : qa.endDateTime) || ""} onChange={e => { updateQuickActivity(idx, "endDateTime", e.target.value); if (qa.isEvent) updateQuickActivity(idx, "eventData", { ...qa.eventData, end_at: e.target.value }); }} className="w-full bg-transparent border-b border-primary/20 focus:border-accent outline-none py-1 text-sm text-on-surface dark:text-white font-roboto" />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="font-roboto text-[10px] uppercase text-outline">Título</label>
                    <input type="text" placeholder="Título" value={qa.title} onChange={e => updateQuickActivity(idx, "title", e.target.value)} className="w-full bg-transparent border-b border-primary/20 focus:border-accent outline-none py-1 text-sm text-on-surface dark:text-white font-roboto" />
                  </div>
                  <div>
                    <label className="font-roboto text-[10px] uppercase text-outline">Prioridade</label>
                    <select value={qa.priority || "Média"} onChange={e => updateQuickActivity(idx, "priority", e.target.value)} className="w-full bg-transparent border-b border-primary/20 focus:border-accent outline-none py-1 text-sm text-on-surface dark:text-white font-roboto">
                      <option value="Baixa">🟢 Baixa</option>
                      <option value="Média">🟡 Média</option>
                      <option value="Alta">🟠 Alta</option>
                      <option value="Urgente">🔴 Urgente</option>
                    </select>
                  </div>
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-900/20">
                  <input type="checkbox" checked={qa.isEvent || false} onChange={(e) => {
                    updateQuickActivity(idx, "isEvent", e.target.checked);
                    if (e.target.checked && !qa.eventData?.start_at) updateQuickActivity(idx, "eventData", { ...emptyEventData(), ...(qa.eventData || {}), start_at: `${qa.date}T09:00`, end_at: `${qa.date}T17:00` });
                  }} className="mt-1 rounded border-outline text-primary focus:ring-accent" />
                  <span><strong className="block text-sm text-primary dark:text-white">Esta atividade é um evento</strong><span className="text-xs text-outline">Marque para incluir na programação institucional e informar os dados complementares.</span></span>
                </label>
                {qa.isEvent && <EventFields value={qa.eventData} onChange={(value) => updateQuickActivity(idx, "eventData", value)} compact />}
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-900/20">
                  <input type="checkbox" checked={qa.usesVehicle || false} onChange={(event) => event.target.checked ? openVehicleModal(idx, qa) : setQuickActivities((items) => items.map((item, index) => index === idx ? { ...item, usesVehicle: false } : item))} className="mt-1 rounded border-outline text-blue-700 focus:ring-blue-400" />
                  <span className="flex-1"><strong className="block text-sm text-primary dark:text-white">Utilizar veículo nesta atividade</strong><span className="text-xs text-outline">Abra o agendamento completo, confirme a reserva e continue preenchendo a atividade.</span></span>
                </label>
                {qa.usesVehicle && <div className="flex flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/20 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-primary dark:text-white">{vehicles.find((vehicle) => vehicle.id === qa.vehicleBooking?.vehicle_id)?.name || "Veículo selecionado"} · {qa.vehicleBooking?.passenger_ids?.length || 0} passageiro(s)</p><p className="text-xs text-outline">{qa.vehicleBooking?.start_at?.replace("T", " ")} até {qa.vehicleBooking?.end_at?.replace("T", " ")}{qa.vehicleBooking?.destination ? ` · ${qa.vehicleBooking.destination}` : ""}</p></div><button type="button" onClick={() => openVehicleModal(idx, qa)} className="rounded-full bg-blue-700 px-4 py-2 text-xs font-bold text-white">Editar agendamento</button></div>}
                <div className="flex items-center gap-2">
                  <input type="checkbox" disabled={qa.isEvent} checked={qa.repeat || false} onChange={(e) => updateQuickActivity(idx, "repeat", e.target.checked)} className="rounded border-outline dark:border-gray-600 text-primary focus:ring-accent disabled:opacity-50" id={`repeat-${idx}`} />
                  <label htmlFor={`repeat-${idx}`} className="font-roboto text-sm text-on-surface dark:text-gray-200 cursor-pointer">Repetir em várias datas</label>
                </div>
                {qa.repeat && (
                  <div className="pl-4 space-y-3 border-l-2 border-accent/30">
                    <div><label className="font-roboto text-[10px] uppercase text-outline">Data de término</label><input type="date" value={qa.repeatEndDate || ""} onChange={(e) => updateQuickActivity(idx, "repeatEndDate", e.target.value)} className="w-full bg-transparent border-b border-primary/20 focus:border-accent outline-none py-1 text-sm text-on-surface dark:text-white font-roboto" /></div>
                    <div><label className="font-roboto text-[10px] uppercase text-outline mb-1">Dias da semana</label><div className="flex flex-wrap gap-2">{['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => <label key={day} className="flex items-center gap-1 text-sm text-on-surface dark:text-gray-200 cursor-pointer"><input type="checkbox" checked={(qa.repeatDays || []).includes(day)} onChange={() => toggleRepeatDay(idx, day)} className="rounded border-outline dark:border-gray-600 text-primary focus:ring-accent" />{day}</label>)}</div></div>
                  </div>
                )}
                {/* Descrição com menções */}
                <div>
                  <label className="font-roboto text-[10px] uppercase text-outline">Descrição / Ocorrências</label>
                  <div className="relative">
                    <textarea
                      ref={(el) => (textareaRefs.current[idx] = el)}
                      rows={3}
                      placeholder="Descreva a atividade. Caso queira mencionar alguém, use @nome (ex: @Gabriela)."
                      required
                      value={qa.description}
                      onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape" && showMentions) {
                          setShowMentions(false);
                          e.preventDefault();
                        }
                      }}
                      className="w-full bg-transparent border-b border-primary/20 focus:border-accent outline-none py-1 text-sm resize-none text-on-surface dark:text-white font-roboto"
                    />
                    {showMentions && mentionIndex === idx && mentionList.length > 0 && (
                      <div className="absolute bottom-full left-0 z-20 mb-2 w-72 max-w-full overflow-hidden rounded-2xl border border-surface-variant bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800 sm:w-80">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-variant bg-emerald-50 px-3 py-2 text-xs dark:border-gray-700 dark:bg-emerald-950/40"><span className="font-bold text-primary dark:text-emerald-200">Escolha uma pessoa</span><span className="rounded-full bg-white px-2 py-0.5 font-bold text-outline shadow-sm dark:bg-gray-700">{mentionList.length}</span></div>
                        <div className="max-h-72 overflow-y-auto py-1">
                        {mentionList.map((person) => {
                          const color = getUserColor(person.id);
                          return (
                            <button
                              key={person.id}
                              type="button"
                              onClick={() => handleMentionClick(person)}
                              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${color.bg} ${color.text} ${color.ring} ring-1`}>
                                {person.initials}
                              </span>
                              <span className={`text-sm font-medium ${color.text}`}>{person.name}</span>
                            </button>
                          );
                        })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <TeamMemberSelector people={persons.filter((person) => person.name !== selectedPerson)} selectedIds={qa.involvedIds || []} onChange={(ids) => updateQuickActivity(idx, "involvedIds", ids)} />

                {/* Destaque para Registro Fotográfico (modo rápido) */}
                <div className="mt-3 p-2 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5">
                  <label className="font-roboto text-label-sm text-primary dark:text-white font-semibold flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-[18px]">photo_camera</span>
                    Registro Fotográfico
                  </label>
                  <PhotoUpload
                    onUploadComplete={(newPhotos, metadata) => { updateQuickActivity(idx, "images", newPhotos); trackUploads("images", metadata); }}
                    existingPhotos={qa.images || []}
                  />
                </div>

                {/* Destaque para Registro Arquivos (modo rápido) */}
                <div className="mt-3 p-2 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50/30 dark:bg-blue-900/20">
                  <label className="font-roboto text-label-sm text-blue-700 dark:text-blue-300 font-semibold flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-blue-600 text-[18px]">folder</span>
                    Registro Arquivos (PDF, DOC, XLS, ZIP, TXT, etc.)
                  </label>
                  <FileUpload
                    onUploadComplete={(newFiles, metadata) => { updateQuickActivity(idx, "files", newFiles); trackUploads("files", metadata); }}
                    existingFiles={qa.files || []}
                  />
                </div>

                <div className="flex justify-end">
                  <button type="button" onClick={() => removeQuickActivity(idx)} disabled={quickActivities.length === 1} className="text-error/70 hover:text-error p-1 disabled:opacity-30">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addQuickActivity} className="bg-accent/10 text-primary dark:text-white font-roboto text-label-sm px-4 py-2 rounded-full flex items-center gap-2 hover:bg-accent/20 transition-all active:scale-95 min-h-[44px] shadow-sm">
              <span className="material-symbols-outlined text-[18px]">add</span> Adicionar atividade
            </button>
          </div>
        )}

        {message.text && (
          <div className={`p-4 rounded-xl ${message.type === "success" ? "bg-primary/10 text-primary dark:text-white" : "bg-error-container/20 text-error"}`}>
            <span className="font-roboto text-label-md">{message.text}</span>
            {message.action === "switch" && <button type="button" onClick={switchToQuickWithText} className="ml-4 px-4 py-2 rounded-full bg-accent text-primary font-roboto text-label-sm inline-block hover:bg-yellow-400 transition-all">Usar modo Rápido</button>}
            {message.type === "success" && <Link to="/" className="ml-4 px-4 py-2 rounded-full bg-accent text-primary font-roboto text-label-sm inline-block hover:bg-yellow-400 transition-all">Ir para Dashboard</Link>}
          </div>
        )}
        {message.type === "success" && lastInserted && (
          <div className="flex justify-end">
            <button type="button" onClick={() => { const text = formatAgendaForWhatsAppSimple(lastInserted); shareViaWhatsApp(text); }} className="bg-[#25D366] text-white font-roboto text-label-sm px-5 py-2 rounded-full flex items-center gap-2 hover:bg-[#128C7E] transition-all active:scale-95 min-h-[44px]">
              <span className="material-symbols-outlined text-[18px]">send</span> Enviar via WhatsApp
            </button>
          </div>
        )}
        <div className="flex justify-end pt-1">
          <button type="submit" disabled={loading} className="bg-accent text-primary font-bold font-roboto py-4 px-12 rounded-full flex items-center gap-3 hover:bg-yellow-400 transition-all active:scale-95 disabled:opacity-50 min-h-[48px]">
            {loading ? "Publicando..." : "Publicar Agenda"} <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </form>
      {vehicleModal && <VehicleBookingModal
        value={vehicleModal.value}
        vehicles={vehicles}
        people={persons}
        onChange={(value) => setVehicleModal((current) => ({ ...current, value }))}
        onCancel={() => setVehicleModal(null)}
        onConfirm={confirmVehicleModal}
      />}
    </div>
  );
}

function VehicleBookingModal({ value, vehicles, people, onChange, onCancel, onConfirm }) {
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === value.vehicle_id);
  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="vehicle-booking-title">
    <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl dark:bg-gray-900 sm:rounded-3xl">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-variant bg-white px-5 py-4 dark:border-white/10 dark:bg-gray-900"><div><h3 id="vehicle-booking-title" className="text-xl font-black text-primary dark:text-white">Agendar veículo</h3><p className="text-xs text-outline">Confirme a viagem para retornar ao lançamento da atividade.</p></div><button type="button" onClick={onCancel} className="rounded-full p-2 hover:bg-surface dark:hover:bg-white/10" aria-label="Fechar"><span className="material-symbols-outlined">close</span></button></header>
      <div className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-primary dark:text-white">Veículo<select required className="mt-1 w-full rounded-xl border border-surface-variant bg-surface px-3 py-2.5 dark:bg-gray-800" value={value.vehicle_id} onChange={(event) => onChange({ ...value, vehicle_id: event.target.value })}><option value="">Selecione</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name} · {vehicle.plate} ({vehicle.capacity} lugares)</option>)}</select></label>
          <div className="rounded-xl bg-blue-50 p-3 text-sm dark:bg-blue-950/30"><p className="font-bold text-primary dark:text-white">Passageiros selecionados: {value.passenger_ids.length}</p><p className="text-xs text-outline">Capacidade: {selectedVehicle?.capacity || "—"} lugares</p></div>
          <label className="text-sm font-bold text-primary dark:text-white">Saída<input required type="datetime-local" className="mt-1 w-full rounded-xl border border-surface-variant bg-surface px-3 py-2.5 dark:bg-gray-800" value={value.start_at} onChange={(event) => onChange({ ...value, start_at: event.target.value })} /></label>
          <label className="text-sm font-bold text-primary dark:text-white">Retorno<input required type="datetime-local" min={value.start_at} className="mt-1 w-full rounded-xl border border-surface-variant bg-surface px-3 py-2.5 dark:bg-gray-800" value={value.end_at} onChange={(event) => onChange({ ...value, end_at: event.target.value })} /></label>
          <label className="text-sm font-bold text-primary dark:text-white">Destino<input className="mt-1 w-full rounded-xl border border-surface-variant bg-surface px-3 py-2.5 dark:bg-gray-800" value={value.destination} onChange={(event) => onChange({ ...value, destination: event.target.value })} placeholder="Cidade ou local" /></label>
          <label className="text-sm font-bold text-primary dark:text-white">Observações<input className="mt-1 w-full rounded-xl border border-surface-variant bg-surface px-3 py-2.5 dark:bg-gray-800" value={value.notes} onChange={(event) => onChange({ ...value, notes: event.target.value })} placeholder="Informações para a viagem" /></label>
          <label className="text-sm font-bold text-primary dark:text-white">KM de partida<input min="0" step="1" type="number" className="mt-1 w-full rounded-xl border border-surface-variant bg-surface px-3 py-2.5 dark:bg-gray-800" value={value.start_odometer} onChange={(event) => onChange({ ...value, start_odometer: event.target.value })} placeholder="Ex.: 45230" /></label>
          <label className="text-sm font-bold text-primary dark:text-white">KM de chegada<input min={value.start_odometer || 0} step="1" type="number" className="mt-1 w-full rounded-xl border border-surface-variant bg-surface px-3 py-2.5 dark:bg-gray-800" value={value.end_odometer} onChange={(event) => onChange({ ...value, end_odometer: event.target.value })} placeholder="Ex.: 45310" /></label>
        </div>
        <label className="block text-sm font-bold text-primary dark:text-white">Ocorrência ou intercorrência<textarea rows="2" className="mt-1 w-full resize-none rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900 dark:bg-amber-950/20" value={value.completion_notes} onChange={(event) => onChange({ ...value, completion_notes: event.target.value })} placeholder="Registre aqui qualquer ocorrência durante o uso do veículo" /></label>
        <TeamMemberSelector people={people} selectedIds={value.passenger_ids} onChange={(passenger_ids) => onChange({ ...value, passenger_ids })} label="Quem estará no veículo?" />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className="rounded-full border border-surface-variant px-5 py-3 font-bold text-primary dark:text-white">Cancelar</button><button type="button" onClick={onConfirm} className="rounded-full bg-blue-700 px-5 py-3 font-bold text-white">Confirmar agendamento</button></div>
      </div>
    </div>
  </div>;
}
