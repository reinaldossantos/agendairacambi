import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { format } from "date-fns";
import { getUserColor } from "../../lib/colors";

export default function CommentSection({ activityId, logs, onNewComment }) {
  const { currentUser } = useCurrentUser();
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionList, setMentionList] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const textareaRef = useRef(null);
  const [persons, setPersons] = useState([]);

  useEffect(() => {
    supabase
      .from("persons")
      .select("id, name, initials")
      .order("name")
      .then(({ data }) => setPersons(data || []));
  }, []);

  const handleTextChange = (e) => {
    const value = e.target.value;
    setNewComment(value);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const match = textBeforeCursor.match(/@(\w*)$/);

    if (match) {
      const query = match[1].toLowerCase();
      setMentionQuery(query);
      const filtered = persons.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.initials?.toLowerCase().includes(query)
      );
      setMentionList(filtered.slice(0, 5));
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionClick = (person) => {
    const cursorPos = textareaRef.current.selectionStart;
    const textBefore = newComment.substring(0, cursorPos);
    const textAfter = newComment.substring(cursorPos);
    const lastAtIndex = textBefore.lastIndexOf("@");
    const newText = textBefore.substring(0, lastAtIndex) + `@${person.name} `;
    setNewComment(newText + textAfter);
    setShowMentions(false);
    setTimeout(() => {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(newText.length, newText.length);
    }, 0);
  };

  const handleSend = async () => {
    if (!currentUser) return alert("Selecione seu nome no topo!");
    if (!newComment.trim()) return;
    setSending(true);

    const { error } = await supabase.from("activity_logs").insert({
      activity_id: activityId,
      person_id: currentUser.id,
      type: "comment",
      content: newComment,
    });

    if (error) {
      console.error(error);
    } else {
      // Notifica menções
      const mentionRegex = /@(\w+)/g;
      let match;
      while ((match = mentionRegex.exec(newComment)) !== null) {
        const mentionedName = match[1];
        const person = persons.find(
          (p) => p.name === mentionedName || p.initials === mentionedName
        );
        if (person && person.id !== currentUser.id) {
          await supabase.from("activity_logs").insert({
            activity_id: activityId,
            person_id: person.id,
            type: "mention",
            content: `${currentUser.name} mencionou você em um comentário.`,
          });
        }
      }
      setNewComment("");
      onNewComment();
    }
    setSending(false);
  };

  const currentColor = getUserColor(currentUser?.id);

  const highlightMentions = (text) => {
    if (!text) return text;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const name = part.substring(1);
        const person = persons.find((p) => p.name === name);
        return (
          <span key={i} className="text-blue-600 dark:text-blue-400 font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <section className="mt-12">
      <h3 className="font-roboto text-label-md text-outline dark:text-gray-400 uppercase tracking-widest mb-4">
        Comentários
      </h3>

      <div className="bg-surface dark:bg-white/5 rounded-2xl p-5 mb-6 border border-surface-variant dark:border-white/10">
        <label className="font-roboto text-label-sm text-outline dark:text-gray-400 mb-2 block">
          Deixe um comentário ou pergunta (use @ para mencionar)
        </label>
        <div className="flex gap-3">
          <div
            className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs ${currentColor.bg} ${currentColor.ring} ring-1`}
          >
            {currentUser?.initials || "?"}
          </div>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={handleTextChange}
              className="w-full bg-white dark:bg-gray-900 border border-surface-variant dark:border-gray-700 rounded-xl p-3 font-worksans text-body-md text-on-surface dark:text-white focus:ring-1 focus:ring-accent focus:border-accent resize-none"
              rows={2}
              placeholder="Escreva aqui... Use @nome para mencionar alguém."
            />
            {showMentions && mentionList.length > 0 && (
              <div className="absolute bottom-full left-0 mb-1 w-56 bg-white dark:bg-gray-800 border border-surface-variant dark:border-gray-700 rounded-xl shadow-lg z-10 py-1">
                {mentionList.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => handleMentionClick(person)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentColor.bg} ${currentColor.text}`}
                    >
                      {person.initials}
                    </span>
                    <span className="text-sm text-on-surface dark:text-gray-200">
                      {person.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2 flex justify-end">
              <button
                onClick={handleSend}
                disabled={sending}
                className="px-5 py-2 bg-accent text-primary rounded-full text-label-sm font-semibold hover:bg-yellow-400 transition-colors active:scale-95 min-h-[44px] flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                Enviar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {logs.map((log) => {
          const color = getUserColor(log.person?.id);
          return (
            <div
              key={log.id}
              className={`flex gap-4 p-4 rounded-2xl ${color.bg} bg-opacity-10 dark:bg-opacity-20 border border-surface-variant dark:border-white/10`}
            >
              <div
                className={`w-8 h-8 rounded-full ${color.bg} flex-shrink-0 flex items-center justify-center ${color.ring} ring-1 font-bold text-xs`}
              >
                {log.person?.initials || "?"}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className={`font-space font-bold ${color.text}`}>
                    {log.person?.name}
                  </span>
                  <span className="text-[10px] text-outline">
                    {format(new Date(log.created_at), "dd/MM 'às' HH:mm")}
                  </span>
                </div>
                <p className="text-body-md text-on-surface dark:text-gray-300 whitespace-pre-wrap">
                  {highlightMentions(log.content)}
                </p>
              </div>
            </div>
          );
        })}
        {logs.length === 0 && (
          <p className="text-on-surface-variant dark:text-gray-400 text-body-md">
            Nenhum comentário ainda.
          </p>
        )}
      </div>
    </section>
  );
}