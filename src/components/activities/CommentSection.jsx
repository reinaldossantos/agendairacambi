import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { format } from "date-fns";
import { getUserColor } from "../../lib/colors";

export default function CommentSection({ activityId, logs, onNewComment }) {
  const { currentUser } = useCurrentUser();
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!currentUser) return alert("Selecione seu usuário no topo!");
    if (!newComment.trim()) return;
    setSending(true);
    const { error } = await supabase.from("activity_logs").insert({
      activity_id: activityId,
      person_id: currentUser.id,
      type: "comment",
      content: newComment,
    });
    if (error) console.error(error);
    else {
      setNewComment("");
      onNewComment();
    }
    setSending(false);
  };

  const currentColor = getUserColor(currentUser?.id);

  return (
    <section className="mt-12">
      <h3 className="font-space text-label-md text-outline dark:text-gray-400 uppercase tracking-widest mb-4">Comentários</h3>

      <div className="bg-surface dark:bg-gray-800 rounded-2xl p-5 mb-6 border border-surface-variant dark:border-gray-700">
        <label className="font-space text-label-sm text-outline dark:text-gray-400 mb-2 block">
          Deixe um comentário ou pergunta
        </label>
        <div className="flex gap-3">
          <div
            className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs ${currentColor.bg} ${currentColor.ring} ring-1`}
          >
            {currentUser?.initials || "?"}
          </div>
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full bg-white dark:bg-gray-900 border border-surface-variant dark:border-gray-700 rounded-xl p-3 font-worksans text-body-md text-on-surface dark:text-white focus:ring-1 focus:ring-accent focus:border-accent resize-none"
              rows={2}
              placeholder="Escreva aqui..."
            />
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
              className={`flex gap-4 p-4 rounded-2xl ${color.bg} bg-opacity-10 dark:bg-opacity-20 border border-surface-variant dark:border-gray-700`}
            >
              <div
                className={`w-8 h-8 rounded-full ${color.bg} flex-shrink-0 flex items-center justify-center ${color.ring} ring-1 font-bold text-xs`}
              >
                {log.person?.initials || "?"}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className={`font-space font-bold ${color.text}`}>{log.person?.name}</span>
                  <span className="text-[10px] text-outline">
                    {format(new Date(log.created_at), "dd/MM 'às' HH:mm")}
                  </span>
                </div>
                <p className="text-body-md text-on-surface dark:text-gray-300 whitespace-pre-wrap">
                  {log.content}
                </p>
              </div>
            </div>
          );
        })}
        {logs.length === 0 && (
          <p className="text-on-surface-variant dark:text-gray-400 text-body-md">Nenhum comentário ainda.</p>
        )}
      </div>
    </section>
  );
}