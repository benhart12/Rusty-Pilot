// ============================================================
// RustyPilot Refresh — Drill Session (/drill/session)
//
// Runs a 10-20 prompt drill session mixing flashcards, flow
// steps, MCQs, and branching scenarios from one or more modules.
//
// Query params:
//   ?planId=xxx   → drills from all modules in the plan
//   ?moduleId=xxx → drills from one module only
//
// Firestore writes (on completion):
//   - /users/{uid}/attempts/{id}         AttemptRecord
//   - /userProgress/{uid}/modules/{id}   updated mastery + lastTouchedAt
// ============================================================

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getModule, listModules } from "@/data/modules";
import { getStudyPlan } from "@/data/plans";
import { recordAttempt, setUserModuleProgress, getUserModuleProgress } from "@/data/progress";
import { ContentModule, DrillPrompt } from "@/types/domain";
import AppShell from "@/components/AppShell";
import Button from "@/components/ui/Button";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import MasteryBar from "@/components/MasteryBar";
import { cn } from "@/lib/cn";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const MIN_PROMPTS = 10;
const MAX_PROMPTS = 20;
const TARGET_BRANCH = 3; // aim for ~3 branching/MCQ questions per session

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ActivePrompt {
  prompt:   DrillPrompt;
  moduleId: string;
  moduleTitle: string;
}

type AnswerState =
  | { status: "correct" }
  | { status: "incorrect"; correctIndex?: number }
  | { status: "unsure" }
  | { status: "seen" }; // for flashcard / flowStep (no right/wrong)

interface AnsweredPrompt extends ActivePrompt {
  answer: AnswerState;
  userChoice?: number; // MCQ/branch chosen index
}

// ─────────────────────────────────────────────────────────────
// Prompt selection
// ─────────────────────────────────────────────────────────────

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function selectPrompts(modules: ContentModule[]): ActivePrompt[] {
  // Collect all prompts by type
  const byKind: Record<string, ActivePrompt[]> = {
    flashcard: [], flowStep: [], mcq: [], branch: [],
  };

  modules.forEach((mod) => {
    mod.drillPrompts.forEach((p) => {
      byKind[p.kind]?.push({ prompt: p, moduleId: mod.id, moduleTitle: mod.title });
    });
  });

  // Aim for ~3 MCQ/branch, fill rest with flashcard/flowStep
  const interactive = shuffled([...byKind.mcq, ...byKind.branch]).slice(0, TARGET_BRANCH);
  const passive = shuffled([...byKind.flashcard, ...byKind.flowStep]);

  const remaining = Math.min(MAX_PROMPTS - interactive.length, passive.length);
  const combined = shuffled([...interactive, ...passive.slice(0, remaining)]);

  // Ensure minimum
  if (combined.length < MIN_PROMPTS && passive.length > remaining) {
    const extra = passive.slice(remaining, remaining + (MIN_PROMPTS - combined.length));
    return shuffled([...combined, ...extra]);
  }

  return combined.slice(0, MAX_PROMPTS);
}

// ─────────────────────────────────────────────────────────────
// Score calculation
// ─────────────────────────────────────────────────────────────

function computeScore(answered: AnsweredPrompt[]): number {
  if (answered.length === 0) return 0;

  let points = 0;
  let maxPoints = 0;

  answered.forEach(({ prompt, answer }) => {
    if (prompt.kind === "mcq" || prompt.kind === "branch") {
      maxPoints += 10;
      if (answer.status === "correct") points += 10;
      else if (answer.status === "unsure") points += 2;
    } else {
      // flashcard / flowStep — self-assessed
      maxPoints += 5;
      if (answer.status === "seen") points += 5;
      else if (answer.status === "unsure") points += 2;
    }
  });

  return Math.round((points / maxPoints) * 100);
}

// ─────────────────────────────────────────────────────────────
// Prompt card renderers
// ─────────────────────────────────────────────────────────────

function PromptHeader({ moduleTitle, index, total }: {
  moduleTitle: string; index: number; total: number;
}) {
  const pct = Math.round(((index) / total) * 100);
  return (
    <div className="flex flex-col gap-2 mb-6">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-medium truncate max-w-[60%]">{moduleTitle}</span>
        <span className="tabular-nums">{index + 1} / {total}</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-sky-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function FlashCard({ prompt, onAnswer }: {
  prompt: Extract<DrillPrompt, { kind: "flashcard" }>;
  onAnswer: (a: AnswerState) => void;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div
        className={cn(
          "min-h-48 flex flex-col justify-center rounded-2xl border p-6 transition-colors duration-200",
          flipped ? "bg-sky-50 border-sky-200" : "bg-white border-slate-200"
        )}
      >
        {!flipped ? (
          <>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Question</p>
            <p className="text-slate-900 text-lg font-medium leading-snug">{prompt.front}</p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold text-sky-500 uppercase tracking-widest mb-3">Answer</p>
            <p className="text-slate-900 text-lg leading-relaxed">{prompt.back}</p>
          </>
        )}
      </div>

      {!flipped ? (
        <Button variant="secondary" size="lg" className="w-full" onClick={() => setFlipped(true)}>
          Reveal answer
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-center text-slate-400 mb-1">How well did you know this?</p>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="ghost" size="lg" onClick={() => onAnswer({ status: "unsure" })}>😕 Unsure</Button>
            <Button variant="ghost" size="lg" onClick={() => onAnswer({ status: "seen" })}>🤔 Got it</Button>
            <Button variant="primary" size="lg" onClick={() => onAnswer({ status: "seen" })}>✓ Knew it</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FlowStepCard({ prompt, onAnswer }: {
  prompt: Extract<DrillPrompt, { kind: "flowStep" }>;
  onAnswer: (a: AnswerState) => void;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className={cn(
        "min-h-48 flex flex-col justify-center rounded-2xl border p-6",
        revealed ? "bg-sky-50 border-sky-200" : "bg-white border-slate-200"
      )}>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Flow Step</p>
        <p className="text-slate-900 text-lg font-semibold leading-snug mb-3">{prompt.step}</p>
        {revealed && prompt.callout && (
          <p className="text-sm text-sky-700 bg-sky-100 rounded-lg px-3 py-2 leading-relaxed mt-2">
            <span className="font-medium">Remember: </span>{prompt.callout}
          </p>
        )}
      </div>

      {!revealed ? (
        <Button variant="secondary" size="lg" className="w-full" onClick={() => setRevealed(true)}>
          Show callout
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" size="lg" onClick={() => onAnswer({ status: "unsure" })}>😕 Needed the hint</Button>
          <Button variant="primary" size="lg" onClick={() => onAnswer({ status: "seen" })}>✓ Got it</Button>
        </div>
      )}
    </div>
  );
}

function MCQCard({ prompt, onAnswer }: {
  prompt: Extract<DrillPrompt, { kind: "mcq" }>;
  onAnswer: (a: AnswerState, choice?: number) => void;
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function select(i: number) {
    if (submitted) return;
    setChosen(i);
  }

  function submit() {
    if (chosen === null) return;
    setSubmitted(true);
  }

  const isCorrect = chosen === prompt.answerIndex;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Question</p>
        <p className="text-slate-900 text-base font-medium leading-snug">{prompt.question}</p>
      </div>

      <div className="flex flex-col gap-2">
        {prompt.choices.map((choice, i) => {
          const isSelected = chosen === i;
          const showCorrect = submitted && i === prompt.answerIndex;
          const showWrong   = submitted && isSelected && !isCorrect;
          return (
            <button
              key={i}
              type="button"
              disabled={submitted}
              onClick={() => select(i)}
              className={cn(
                "w-full text-left px-5 py-4 rounded-xl border text-sm font-medium transition-all duration-100 min-h-[52px]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                !submitted && !isSelected && "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50",
                !submitted && isSelected && "border-sky-400 bg-sky-50 text-sky-800",
                showCorrect && "border-emerald-400 bg-emerald-50 text-emerald-800",
                showWrong   && "border-red-300 bg-red-50 text-red-700"
              )}
              aria-pressed={isSelected}
            >
              <span className="flex items-center gap-3">
                <span className={cn(
                  "shrink-0 w-6 h-6 rounded-full border-2 text-xs flex items-center justify-center font-bold",
                  !submitted ? (isSelected ? "border-sky-500 bg-sky-500 text-white" : "border-slate-300") :
                  showCorrect ? "border-emerald-500 bg-emerald-500 text-white" :
                  showWrong   ? "border-red-400 bg-red-400 text-white" : "border-slate-200"
                )}>
                  {submitted ? (showCorrect ? "✓" : showWrong ? "✗" : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
                </span>
                {choice}
              </span>
            </button>
          );
        })}
      </div>

      {!submitted ? (
        <div className="flex gap-2">
          <Button variant="ghost" size="lg" className="flex-1" onClick={() => onAnswer({ status: "unsure" })}>
            Not sure
          </Button>
          <Button variant="primary" size="lg" className="flex-1" disabled={chosen === null} onClick={submit}>
            Submit
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className={cn("rounded-xl px-4 py-3 text-sm leading-relaxed",
            isCorrect ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-800"
          )}>
            <span className="font-semibold">{isCorrect ? "Correct! " : "Not quite. "}</span>
            {prompt.explanation}
          </div>
          <Button variant="primary" size="lg" className="w-full"
            onClick={() => onAnswer(
              isCorrect ? { status: "correct" } : { status: "incorrect", correctIndex: prompt.answerIndex },
              chosen ?? undefined
            )}>
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}

function BranchCard({ prompt, onAnswer }: {
  prompt: Extract<DrillPrompt, { kind: "branch" }>;
  onAnswer: (a: AnswerState, choice?: number) => void;
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const isCorrect = chosen === prompt.bestIndex;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-3">Scenario</p>
        <p className="text-slate-900 text-base font-medium leading-snug">{prompt.situation}</p>
      </div>

      <div className="flex flex-col gap-2">
        {prompt.options.map((option, i) => {
          const isSelected = chosen === i;
          const showBest  = submitted && i === prompt.bestIndex;
          const showWrong = submitted && isSelected && !isCorrect;
          return (
            <button key={i} type="button" disabled={submitted} onClick={() => setChosen(i)}
              className={cn(
                "w-full text-left px-5 py-4 rounded-xl border text-sm font-medium transition-all duration-100 min-h-[52px]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                !submitted && !isSelected && "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50",
                !submitted && isSelected && "border-amber-400 bg-amber-50 text-amber-800",
                showBest  && "border-emerald-400 bg-emerald-50 text-emerald-800",
                showWrong && "border-red-300 bg-red-50 text-red-700"
              )}
              aria-pressed={isSelected}
            >
              {option}
            </button>
          );
        })}
      </div>

      {!submitted ? (
        <div className="flex gap-2">
          <Button variant="ghost" size="lg" className="flex-1" onClick={() => onAnswer({ status: "unsure" })}>Not sure</Button>
          <Button variant="primary" size="lg" className="flex-1" disabled={chosen === null}
            onClick={() => setSubmitted(true)}>
            Submit
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className={cn("rounded-xl px-4 py-3 text-sm leading-relaxed",
            isCorrect ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-amber-50 border border-amber-200 text-amber-800"
          )}>
            <span className="font-semibold">{isCorrect ? "Best choice! " : "Not the best option. "}</span>
            {prompt.rationale}
          </div>
          <Button variant="primary" size="lg" className="w-full"
            onClick={() => onAnswer(
              isCorrect ? { status: "correct" } : { status: "incorrect" },
              chosen ?? undefined
            )}>
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Review screen
// ─────────────────────────────────────────────────────────────

function ReviewScreen({ answered, score, onDone, saving }: {
  answered: AnsweredPrompt[];
  score: number;
  onDone: () => void;
  saving: boolean;
}) {
  const correct = answered.filter(a => a.answer.status === "correct" || a.answer.status === "seen").length;
  const unsure  = answered.filter(a => a.answer.status === "unsure").length;
  const wrong   = answered.filter(a => a.answer.status === "incorrect").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Score summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Session Score</p>
        <p className="text-6xl font-bold text-slate-900 tabular-nums mb-2">{score}</p>
        <div className="max-w-xs mx-auto mb-4">
          <MasteryBar value={score} showLabel />
        </div>
        <div className="flex justify-center gap-6 text-sm">
          <span className="text-emerald-600 font-medium">✓ {correct} correct</span>
          <span className="text-amber-600 font-medium">? {unsure} unsure</span>
          {wrong > 0 && <span className="text-red-500 font-medium">✗ {wrong} incorrect</span>}
        </div>
      </div>

      {/* Per-prompt review */}
      <section aria-labelledby="review-heading">
        <h2 id="review-heading" className="text-sm font-semibold text-slate-700 mb-3">Review answers</h2>
        <div className="flex flex-col gap-2">
          {answered.map(({ prompt, answer, moduleTitle }, i) => {
            const isGood = answer.status === "correct" || answer.status === "seen";
            const isBad  = answer.status === "incorrect";
            return (
              <div key={i} className={cn(
                "flex items-start gap-3 px-4 py-3 rounded-xl border text-sm",
                isGood ? "border-emerald-100 bg-emerald-50" :
                isBad  ? "border-red-100 bg-red-50" :
                "border-amber-100 bg-amber-50"
              )}>
                <span className="text-lg shrink-0">
                  {isGood ? "✓" : isBad ? "✗" : "?"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 leading-snug">
                    {prompt.kind === "flashcard" ? prompt.front :
                     prompt.kind === "flowStep"  ? prompt.step :
                     prompt.kind === "mcq"       ? prompt.question :
                     prompt.situation}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{moduleTitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Button variant="primary" size="lg" className="w-full" onClick={onDone} disabled={saving}>
        {saving ? "Saving…" : "Done →"}
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Inner page
// ─────────────────────────────────────────────────────────────

function DrillSessionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useRequireAuth();

  const planId    = searchParams.get("planId");
  const moduleId  = searchParams.get("moduleId");

  const [prompts, setPrompts]       = useState<ActivePrompt[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answered, setAnswered]         = useState<AnsweredPrompt[]>([]);
  const [sessionDone, setSessionDone]   = useState(false);
  const [saving, setSaving]             = useState(false);

  // Load prompts
  useEffect(() => {
    if (!user || authLoading) return;
    async function load() {
      setLoading(true);
      try {
        let modules: ContentModule[] = [];

        if (moduleId) {
          const mod = await getModule(moduleId);
          if (mod) modules = [mod];
        } else if (planId) {
          const plan = await getStudyPlan(user!.uid, planId);
          if (plan) {
            const moduleIds = plan.sections
              .flatMap((s) => s.items)
              .filter((item) => item.kind === "module")
              .map((item) => (item as { moduleId: string }).moduleId);
            const unique = [...new Set(moduleIds)];
            const mods = await Promise.all(unique.map((id) => getModule(id)));
            modules = mods.filter(Boolean) as ContentModule[];
          }
        } else {
          // Fallback: load any available modules
          modules = await listModules({ limit: 3 });
        }

        const selected = selectPrompts(modules);
        if (selected.length === 0) {
          setError("No drill prompts found. Make sure the module has prompts configured.");
        } else {
          setPrompts(selected);
        }
      } catch (err) {
        setError(`Failed to load drill: ${(err as Error).message}`);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, authLoading, moduleId, planId]);

  function handleAnswer(answer: AnswerState, choice?: number) {
    const current = prompts[currentIndex];
    const record: AnsweredPrompt = { ...current, answer, userChoice: choice };
    const newAnswered = [...answered, record];
    setAnswered(newAnswered);

    if (currentIndex + 1 >= prompts.length) {
      setSessionDone(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  async function handleDone() {
    if (!user) return;
    setSaving(true);

    const score = computeScore(answered);
    const now = new Date().toISOString();

    // Group answered by moduleId to update each module's progress
    const byModule = new Map<string, AnsweredPrompt[]>();
    answered.forEach((a) => {
      const list = byModule.get(a.moduleId) ?? [];
      list.push(a);
      byModule.set(a.moduleId, list);
    });

    try {
      // Write attempt record
      await recordAttempt(user.uid, {
        id:          "",
        moduleId:    moduleId ?? (planId ? `plan:${planId}` : "mixed"),
        score,
        answeredAt:  now,
        durationSec: 0,
        prompts:     answered.map((a) => ({
          kind:      a.prompt.kind,
          correct:   a.answer.status === "correct" || a.answer.status === "seen",
        })),
      });

      // Update progress per module
      for (const [mid, records] of byModule.entries()) {
        const existing = await getUserModuleProgress(user.uid, mid);
        const prevMastery = existing?.mastery ?? 0;
        const prevAttempts = existing?.attemptCount ?? 0;

        // Weighted rolling average: new mastery = 70% old + 30% session score
        const sessionScore = computeScore(records);
        const newMastery = prevAttempts === 0
          ? sessionScore
          : Math.round(prevMastery * 0.7 + sessionScore * 0.3);

        await setUserModuleProgress(user.uid, mid, {
          mastery:        Math.min(100, Math.max(0, newMastery)),
          attemptCount:   prevAttempts + 1,
          lastTouchedAt:  now,
          lastScore:      sessionScore,
        });
      }

      // Navigate to dashboard or module
      if (moduleId) {
        router.push(`/modules/${encodeURIComponent(moduleId)}`);
      } else {
        router.push(ROUTES_DASHBOARD);
      }
    } catch (err) {
      console.error("Failed to save session:", err);
      // Navigate anyway — don't block the user
      router.push(moduleId ? `/modules/${encodeURIComponent(moduleId)}` : ROUTES_DASHBOARD);
    }
  }

  const ROUTES_DASHBOARD = "/dashboard";
  const current = prompts[currentIndex];
  const score = sessionDone ? computeScore(answered) : 0;

  if (authLoading || loading) {
    return (
      <AppShell user={user ?? null}>
        <div className="max-w-lg mx-auto pt-6 flex flex-col gap-4">
          <LoadingState lines={2} />
          <LoadingState lines={5} />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell user={user ?? null}>
        <div className="max-w-lg mx-auto pt-8">
          <EmptyState title="Couldn't start drill" description={error}
            actionLabel="Back to modules" onAction={() => router.push("/modules")} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell user={user ?? null}>
      <div className="max-w-lg mx-auto flex flex-col gap-4">

        {!sessionDone && current ? (
          <>
            <PromptHeader moduleTitle={current.moduleTitle} index={currentIndex} total={prompts.length} />

            {current.prompt.kind === "flashcard" && (
              <FlashCard prompt={current.prompt as Extract<DrillPrompt, { kind: "flashcard" }>}
                onAnswer={handleAnswer} />
            )}
            {current.prompt.kind === "flowStep" && (
              <FlowStepCard prompt={current.prompt as Extract<DrillPrompt, { kind: "flowStep" }>}
                onAnswer={handleAnswer} />
            )}
            {current.prompt.kind === "mcq" && (
              <MCQCard prompt={current.prompt as Extract<DrillPrompt, { kind: "mcq" }>}
                onAnswer={handleAnswer} />
            )}
            {current.prompt.kind === "branch" && (
              <BranchCard prompt={current.prompt as Extract<DrillPrompt, { kind: "branch" }>}
                onAnswer={handleAnswer} />
            )}

            {/* Quit link */}
            <button type="button" onClick={() => router.back()}
              className="text-xs text-center text-slate-400 hover:text-slate-600 transition-colors py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded">
              Quit session
            </button>
          </>
        ) : sessionDone ? (
          <ReviewScreen answered={answered} score={score} onDone={handleDone} saving={saving} />
        ) : null}

      </div>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────

export default function DrillSessionPage() {
  return (
    <Suspense fallback={
      <AppShell user={null}>
        <div className="max-w-lg mx-auto pt-6"><LoadingState lines={4} /></div>
      </AppShell>
    }>
      <DrillSessionInner />
    </Suspense>
  );
}