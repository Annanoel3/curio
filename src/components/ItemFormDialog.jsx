import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ImageUpload from "@/components/ImageUpload";
import TagInput from "@/components/TagInput";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const empty = {
  title: "",
  notes: "",
  tags: [],
  image_url: "",
  estimated_value: "",
  value_low: null,
  value_high: null,
  ai_appraisal_notes: "",
};

// phase: null | 'condition' | 'identifying' | 'questions' | 'appraising'
export default function ItemFormDialog({ open, onOpenChange, onSubmit, initial, collectionType }) {
  const [data, setData] = useState(empty);
  const [phase, setPhase] = useState(null);
  const [appraisalStatus, setAppraisalStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [identifiedItem, setIdentifiedItem] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);

  const appraising = phase === 'appraising';

  const APPRAISE_STEPS = ["Searching eBay & Mercari…", "Checking sold listings…", "Estimating value…", "Adding details…"];

  useEffect(() => {
    if (phase !== 'appraising') { setAppraisalStatus(""); setProgress(0); return; }
    let i = 0;
    setAppraisalStatus(APPRAISE_STEPS[0]);
    setProgress(10);
    const interval = setInterval(() => {
      i = Math.min(i + 1, APPRAISE_STEPS.length - 1);
      setAppraisalStatus(APPRAISE_STEPS[i]);
      setProgress(10 + (i / (APPRAISE_STEPS.length - 1)) * 80);
    }, 2600);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (open) {
      setData(initial || empty);
      setPhase(null);
      setIdentifiedItem("");
      setQuestions([]);
      setAnswers({});
    }
  }, [open, initial]);

  const handleAppraisalClick = async () => {
    if (!data.image_url && !data.title.trim()) {
      toast.error("Add a photo or title first");
      return;
    }
    setPhase('identifying');
    try {
      const res = await base44.functions.invoke("identifyItem", {
        image_url: data.image_url || undefined,
        text_query: data.image_url ? undefined : data.title,
        collection_type: collectionType,
      });
      const result = res.data;
      setIdentifiedItem(result?.identified_item || "");
      setQuestions(result?.questions || []);
      setAnswers({});
      setProgress(100);
      setPhase('questions');
    } catch (e) {
      runAppraisal("", [], "");
    }
  };

  const handleAnswersSubmit = () => {
    const conditionAnswers = questions.map(q => ({
      question: q.question,
      answer: answers[q.id] ?? "Not answered",
    }));
    runAppraisal("", conditionAnswers, identifiedItem);
  };

  const runAppraisal = async (selectedCondition, conditionAnswers = [], identified = "") => {
    setPhase('appraising');
    try {
      const res = await base44.functions.invoke("appraiseItem", {
        image_url: data.image_url || undefined,
        text_query: data.image_url ? undefined : data.title,
        collection_type: collectionType,
        condition: selectedCondition,
        condition_answers: conditionAnswers,
        identified_item: identified,
      });
      const a = res.data?.appraisal;
      if (!a) throw new Error("No appraisal returned");
      setData((prev) => ({
        ...prev,
        title: prev.title || a.title || "",
        notes: prev.notes || a.notes || "",
        tags: prev.tags?.length ? prev.tags : (a.tags || []),
        estimated_value: a.estimated_value ?? prev.estimated_value,
        value_low: a.value_low ?? null,
        value_high: a.value_high ?? null,
        ai_appraisal_notes: a.appraisal_reasoning || "",
      }));
      setProgress(100);
      toast.success("AI appraisal complete");
    } catch (e) {
      toast.error("Appraisal failed");
    } finally {
      setPhase(null);
    }
  };

  const handleSubmit = async () => {
    if (!data.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...data,
        estimated_value: data.estimated_value === "" ? null : Number(data.estimated_value),
      };
      await onSubmit(payload);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {initial ? "Edit item" : "Add item"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-[200px_1fr] gap-6 py-2">
          <div>
            <ImageUpload
              value={data.image_url}
              onChange={(url) => setData({ ...data, image_url: url })}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAppraisalClick}
              disabled={phase === 'identifying' || phase === 'appraising'}
              className="w-full mt-3 gap-1.5"
            >
              {(phase === 'identifying' || phase === 'appraising') ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-accent" />
              )}
              AI Appraise
            </Button>

            {/* Phase: Identifying — simple status text only, no progress bar */}
            {phase === 'identifying' && (
              <p className="text-[11px] text-muted-foreground text-center mt-2 animate-pulse">
                Identifying item…
              </p>
            )}

            {/* Phase: Appraising — progress bar + status + slow warning */}
            {phase === 'appraising' && (
              <div className="mt-3">
                <Progress value={progress} className="h-1.5" />
                <p className="text-[11px] text-muted-foreground text-center mt-1.5 animate-pulse">
                  {appraisalStatus}
                </p>
                <p className="text-[10px] text-muted-foreground/70 text-center mt-1">
                  This may take a minute or two…
                </p>
              </div>
            )}

            {/* Phase: Item-specific questions */}
            {phase === 'questions' && questions.length > 0 && (
              <div className="mt-3 p-3 rounded-xl border border-border bg-card shadow-sm space-y-3">
                {identifiedItem && (
                  <p className="text-[11px] text-muted-foreground text-center italic">"{identifiedItem}"</p>
                )}
                {questions.map((q) => (
                  <div key={q.id}>
                    <p className="text-xs font-medium mb-1.5">{q.question}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(q.type === 'yesno' ? ['Yes', 'No'] : q.options || []).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          className={`text-xs px-3 py-1 rounded-full border transition ${
                            answers[q.id] === opt
                              ? 'bg-foreground text-background border-foreground'
                              : 'border-border hover:border-foreground/40 hover:bg-secondary'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAnswersSubmit}
                  className="w-full mt-1 gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Get Appraisal
                </Button>
              </div>
            )}


          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Title
              </Label>
              <Input
                value={data.title}
                onChange={(e) => setData({ ...data, title: e.target.value })}
                placeholder="1967 Hot Wheels Redline Camaro"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Tags
              </Label>
              <TagInput
                tags={data.tags || []}
                onChange={(tags) => setData({ ...data, tags })}
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Notes
              </Label>
              <Textarea
                value={data.notes}
                onChange={(e) => setData({ ...data, notes: e.target.value })}
                rows={4}
                placeholder="Condition, story, provenance…"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Estimated value (USD) <span className="normal-case tracking-normal">— optional</span>
              </Label>
              <Input
                type="number"
                value={data.estimated_value ?? ""}
                onChange={(e) => setData({ ...data, estimated_value: e.target.value })}
                placeholder="AI will fill this if left blank"
              />
              {(data.value_low || data.value_high) && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  AI range: ${data.value_low?.toLocaleString()} – ${data.value_high?.toLocaleString()}
                </p>
              )}
            </div>

            {data.ai_appraisal_notes && (
              <div className="p-3 rounded-lg bg-secondary/60 text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground flex items-center gap-1 mb-1">
                  <Sparkles className="w-3 h-3 text-accent" /> AI reasoning
                </span>
                {data.ai_appraisal_notes}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !data.title.trim()}>
            {saving ? "Saving…" : initial ? "Save" : "Add item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}