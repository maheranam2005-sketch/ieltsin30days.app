import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";

export default function PerformancePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState([]);
  const [speaking, setSpeaking] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        const { data: writingData, error: wErr } = await supabase
          .from("writing_evaluations")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (wErr) throw wErr;

        const { data: speakingData, error: sErr } = await supabase
          .from("speaking_evaluations")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (sErr) throw sErr;

        setWriting(writingData || []);
        setSpeaking(speakingData || []);
      } catch (e) {
        setError(e.message || "Failed to load performance data.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  return (
    <div className="min-h-screen bg-[#f4f6fb] p-8 text-gray-900">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Performance
            </h1>
            <p className="mt-2 text-sm font-medium text-gray-500">
              Your latest AI feedback history (last 10 entries each).
            </p>
          </div>

          <button
            onClick={() => navigate("/home")}
            className="rounded-xl bg-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-600"
          >
            Back to Home
          </button>
        </div>

        {loading && (
          <div className="rounded-3xl bg-white p-8 shadow-md">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
              <span className="text-sm font-medium text-gray-600">
                Loading your performance...
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 font-medium text-red-600 shadow-md">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Writing Panel */}
            <div className="rounded-3xl bg-white p-8 shadow-md">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold">
                    Writing Performance
                  </h2>
                  <p className="mt-1 text-xs text-gray-400">
                    Most recent writing evaluations
                  </p>
                </div>

                <span className="rounded-full bg-red-100 px-3 py-1 text-[11px] font-bold text-red-500">
                  IELTS WRITING
                </span>
              </div>

              {writing.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No writing evaluations yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {writing.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-gray-50 p-5 shadow-sm"
                    >
                      <div className="mb-3 flex items-center justify-between gap-4">
                        <span className="rounded-lg bg-white px-3 py-1 text-xs font-bold shadow-sm">
                          Band: {item.band_score ?? "-"}
                        </span>
                        <span className="text-xs text-gray-400">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString()
                            : ""}
                        </span>
                      </div>

                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                        {item.feedback_summary ??
                          item.feedback_summary_bn ??
                          "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Speaking Panel */}
            <div className="rounded-3xl bg-white p-8 shadow-md">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold">
                    Speaking Performance
                  </h2>
                  <p className="mt-1 text-xs text-gray-400">
                    Most recent speaking evaluations
                  </p>
                </div>

                <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-600">
                  IELTS SPEAKING
                </span>
              </div>

              {speaking.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No speaking evaluations yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {speaking.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-gray-50 p-5 shadow-sm"
                    >
                      <div className="mb-3 flex items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-white px-3 py-1 text-xs font-bold shadow-sm">
                            Band: {item.band_score ?? "-"}
                          </span>
                          <span className="rounded-lg bg-white px-3 py-1 text-xs font-semibold shadow-sm">
                            Fluency: {item.fluency_score ?? "-"}
                          </span>
                          <span className="rounded-lg bg-white px-3 py-1 text-xs font-semibold shadow-sm">
                            Vocab: {item.vocab_score ?? "-"}
                          </span>
                        </div>

                        <span className="text-xs text-gray-400">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString()
                            : ""}
                        </span>
                      </div>

                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                        {item.feedback_summary_bn ?? "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}