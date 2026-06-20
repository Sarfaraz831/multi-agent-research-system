import { useRef, useState } from "react";
import {
  Search,
  BookOpen,
  PenLine,
  ClipboardCheck,
  Loader2,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Radio,
} from "lucide-react";

// Point this at wherever api_server.py is running.
const API_BASE = "https://multi-agent-research-system-5rd4.onrender.com";

const STAGES = [
  {
    key: "search",
    label: "Search Agent",
    eyebrow: "01 — DISCOVER",
    description: "Scanning the web for current, reliable sources.",
    icon: Search,
  },
  {
    key: "reader",
    label: "Reader Agent",
    eyebrow: "02 — EXTRACT",
    description: "Opening the best source and scraping it for depth.",
    icon: BookOpen,
  },
  {
    key: "writer",
    label: "Writer",
    eyebrow: "03 — DRAFT",
    description: "Synthesizing research into a written report.",
    icon: PenLine,
  },
  {
    key: "critic",
    label: "Critic",
    eyebrow: "04 — REVIEW",
    description: "Checking the report for gaps, bias, and weak claims.",
    icon: ClipboardCheck,
  },
];

const emptyStageData = () =>
  Object.fromEntries(STAGES.map((s) => [s.key, { status: "pending", output: null }]));

function StatusDot({ status }) {
  if (status === "done") {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/40">
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400 ring-1 ring-amber-400/50">
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400 ring-1 ring-red-500/40">
        <AlertTriangle className="h-4 w-4" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-600 ring-1 ring-zinc-700">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
    </span>
  );
}

function OutputPanel({ text, emphasized }) {
  const [expanded, setExpanded] = useState(emphasized);
  if (!text) return null;
  const isLong = text.length > 420;
  const shown = expanded || !isLong ? text : text.slice(0, 420) + "…";

  return (
    <div className="mt-3">
      <pre
        className={
          emphasized
            ? "whitespace-pre-wrap break-words font-serif text-[15px] leading-relaxed text-zinc-100"
            : "whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-zinc-400"
        }
      >
        {shown}
      </pre>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide text-zinc-500 hover:text-amber-400"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Show full output <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

function StageBadge({ status }) {
  const map = {
    pending: ["PENDING", "text-zinc-600"],
    active: ["RUNNING", "text-amber-400"],
    done: ["DONE", "text-emerald-400"],
    error: ["FAILED", "text-red-400"],
  };
  const [label, cls] = map[status] ?? map.pending;
  return <span className={`font-mono text-[11px] tracking-widest ${cls}`}>{label}</span>;
}

export default function ResearchPipelineUI() {
  const [topic, setTopic] = useState("");
  const [runState, setRunState] = useState("idle"); // idle | running | done | error
  const [stageData, setStageData] = useState(emptyStageData);
  const [errorMsg, setErrorMsg] = useState("");
  const esRef = useRef(null);

  const startRun = (e) => {
    e.preventDefault();
    const cleanTopic = topic.trim();
    if (!cleanTopic || runState === "running") return;

    if (esRef.current) esRef.current.close();
    setStageData(emptyStageData());
    setErrorMsg("");
    setRunState("running");

    const es = new EventSource(`${API_BASE}/api/research/stream?topic=${encodeURIComponent(cleanTopic)}`);
    esRef.current = es;

    es.addEventListener("stage", (evt) => {
      const payload = JSON.parse(evt.data);
      setStageData((prev) => ({
        ...prev,
        [payload.stage]: {
          status: payload.status,
          output: payload.output ?? prev[payload.stage]?.output ?? null,
        },
      }));
    });

    es.addEventListener("complete", () => {
      setRunState("done");
      es.close();
    });

    es.addEventListener("pipeline_error", (evt) => {
      const payload = JSON.parse(evt.data);
      setErrorMsg(payload.message || "The pipeline failed.");
      setRunState("error");
      es.close();
    });

    es.onerror = () => {
      setRunState((prev) => {
        if (prev === "done") return prev;
        setErrorMsg((m) => m || "Lost connection to the research server. Is api_server.py running?");
        return "error";
      });
      es.close();
    };
  };

  const connectionLabel =
    runState === "running" ? "LIVE" : runState === "done" ? "COMPLETE" : runState === "error" ? "ERROR" : "IDLE";
  const connectionColor =
    runState === "running"
      ? "text-amber-400"
      : runState === "done"
      ? "text-emerald-400"
      : runState === "error"
      ? "text-red-400"
      : "text-zinc-600";

  return (
    <div className="min-h-screen w-full bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">Multi-agent system</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">Research Pipeline</h1>
          </div>
          <div className={`flex items-center gap-1.5 font-mono text-[11px] tracking-widest ${connectionColor}`}>
            <Radio className={`h-3.5 w-3.5 ${runState === "running" ? "animate-pulse" : ""}`} />
            {connectionLabel}
          </div>
        </div>

        {/* Topic form */}
        <form onSubmit={startRun} className="mb-10 flex gap-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a topic to research…"
            disabled={runState === "running"}
            className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={runState === "running" || !topic.trim()}
            className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
          >
            {runState === "running" ? "Running…" : "Run"}
          </button>
        </form>

        {errorMsg && (
          <div className="mb-8 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Pipeline rail */}
        <div>
          {STAGES.map((stage, idx) => {
            const data = stageData[stage.key];
            const isLast = idx === STAGES.length - 1;
            const Icon = stage.icon;
            return (
              <div key={stage.key} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <StatusDot status={data.status} />
                  {!isLast && (
                    <div
                      className={`w-px flex-1 ${data.status === "done" ? "bg-emerald-500/60" : "bg-zinc-800"}`}
                      style={{ minHeight: "1.75rem" }}
                    />
                  )}
                </div>
                <div className="flex-1 pb-9">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="font-mono text-[11px] tracking-widest text-zinc-500">{stage.eyebrow}</span>
                    </div>
                    <StageBadge status={data.status} />
                  </div>
                  <h2 className="mt-1 text-sm font-medium text-zinc-100">{stage.label}</h2>
                  <p className="text-xs text-zinc-500">{stage.description}</p>
                  <OutputPanel text={data.output} emphasized={stage.key === "writer"} />
                </div>
              </div>
            );
          })}
        </div>

        {runState === "idle" && (
          <p className="mt-2 font-mono text-[11px] text-zinc-700">
            Backend expected at {API_BASE} — start it with: uvicorn api_server:app --reload --port 8000
          </p>
        )}
      </div>
    </div>
  );
}
