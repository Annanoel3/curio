import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Plus, X } from "lucide-react";
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
  quantity: 1,
  status: "owned",
};

async function compressImage(file, maxDim = 1200, quality = 0.75) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
        else { width = Math.round(width * maxDim / height); height = maxDim; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: "image/jpeg" })), "image/jpeg", quality);
    };
    img.src = url;
  });
}

async function uploadFile(file) {
  const compressed = await compressImage(file);
  const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
  return file_url;
}

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
  const [needsManualTitle, setNeedsManualTitle] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [extraIdentifyImages, setExtraIdentifyImages] = useState([]);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [customSizeInput, setCustomSizeInput] = useState({});  // { [questionId]: string }
  const [userNotes, setUserNotes] = useState("");
  const [correctedTitle, setCorrectedTitle] = useState("");
  const [resellerLinks, setRessellerLinks] = useState([]);

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
      setNeedsManualTitle(false);
      setManualTitle("");
      setExtraIdentifyImages([]);
      setCustomSizeInput({});
      setUserNotes("");
      setCorrectedTitle("");
      setRessellerLinks([]);
    }
  }, [open, initial]);

  const handleAppraisalClick = async () => {
    // If user has corrected the item name, use that directly
    if (correctedTitle.trim()) {
      setPhase('appraising');
      try {
        const a = await runAppraise({
          phase: 'appraise',
          text_query: correctedTitle.trim(),
          collection_type: collectionType,
          condition_answers: [],
          identified_item: correctedTitle.trim(),
        });
        setData((prev) => ({
          ...prev,
          title: a.title || correctedTitle.trim(),
          notes: prev.notes || a.notes || "",
          tags: prev.tags?.length ? prev.tags : (a.tags || []),
          estimated_value: a.estimated_value ?? prev.estimated_value,
          value_low: a.value_low ?? null,
          value_high: a.value_high ?? null,
          ai_appraisal_notes: a.appraisal_reasoning || "",
        }));
        setIdentifiedItem(correctedTitle.trim());
        setCorrectedTitle("");
        
        // Generate reseller links
        const searchTerm = encodeURIComponent(a.title || correctedTitle.trim());
        setRessellerLinks([
          { name: 'The RealReal', url: `https://www.therealreal.com/shop/all?q=${searchTerm}` },
          { name: 'Poshmark', url: `https://poshmark.com/search?query=${searchTerm}` },
          { name: 'Mercari', url: `https://www.mercari.com/search?keyword=${searchTerm}` },
          { name: 'eBay', url: `https://www.ebay.com/sch/i.html?_nkw=${searchTerm}` },
        ]);
        
        toast.success("Updated appraisal with correct item");
      } catch (e) {
        toast.error("Re-appraisal failed");
      } finally {
        setPhase(null);
      }
      return;
    }

    const allImages = [data.image_url, ...extraIdentifyImages].filter(Boolean);
    if (!allImages.length && !data.title.trim()) {
      toast.error("Add a photo or title first");
      return;
    }
    setPhase('identifying');
    try {
      const res = await base44.functions.invoke("identifyAndAppraiseComplete", {
        phase: 'identify',
        image_urls: allImages.length ? allImages : undefined,
        text_query: !allImages.length ? data.title : (data.title.trim() || undefined),
        collection_type: collectionType,
        user_notes: userNotes.trim() || undefined,
      });
      const result = res.data;
      const confidence = result?.confidence || 'high';

      if ((confidence === 'low' || confidence === 'unknown') && !data.title.trim()) {
        setIdentifiedItem(result?.identified_item || "");
        setQuestions(result?.questions || []);
        setAnswers({});
        setManualTitle("");
        setNeedsManualTitle(true);
        setPhase('questions');
        return;
      }

      setIdentifiedItem(result?.identified_item || "");
      setQuestions(result?.questions || []);
      setAnswers({});
      setPhase('questions');
    } catch (e) {
      toast.error("Identification failed — please try again");
      setPhase(null);
    }
  };

  const runAppraise = async (payload) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await base44.functions.invoke("identifyAndAppraiseComplete", payload);
        const a = res.data?.appraisal;
        if (!a) throw new Error("No appraisal returned");
        return a;
      } catch (e) {
        if (attempt === 2) throw e;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  };

  const handleManualTitleSubmit = async () => {
    if (!manualTitle.trim()) return;
    setData(prev => ({ ...prev, title: manualTitle.trim() }));
    setNeedsManualTitle(false);
    setPhase('appraising');
    try {
      const a = await runAppraise({
        phase: 'appraise',
        text_query: manualTitle.trim(),
        collection_type: collectionType,
        condition_answers: [],
        identified_item: manualTitle.trim(),
      });
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
      toast.success("AI appraisal complete");
    } catch (e) {
      toast.error("Appraisal failed");
    } finally {
      setPhase(null);
    }
  };

  const handleAnswersSubmit = async () => {
    const finalAnswers = {};
    for (const q of questions) {
      const ans = answers[q.id];
      if (ans === "Other / I'll measure") {
        const typed = customSizeInput[q.id]?.trim();
        finalAnswers[q.id] = typed || "Not answered";
      } else {
        finalAnswers[q.id] = ans ?? "Not answered";
      }
    }

    const sizeQ = questions.find(q => q.id === 'size' || q.question.toLowerCase().includes('height') || q.question.toLowerCase().includes('size'));
    const hadOtherSize = sizeQ && answers[sizeQ.id] === "Other / I'll measure" && customSizeInput[sizeQ.id]?.trim();

    const conditionAnswers = questions.map(q => ({
      question: q.question,
      answer: finalAnswers[q.id],
    }));

    setPhase('appraising');
    try {
      const a = await runAppraise({
        phase: 'appraise',
        text_query: !identifiedItem ? data.title : undefined,
        collection_type: collectionType,
        condition_answers: conditionAnswers,
        identified_item: identifiedItem,
        known_size: hadOtherSize ? customSizeInput[sizeQ.id].trim() : undefined,
        user_notes: userNotes.trim() || undefined,
      });
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
      
      // Generate reseller links
      const searchTerm = encodeURIComponent(a.title || identifiedItem || data.title);
      setRessellerLinks([
        { name: 'The RealReal', url: `https://www.therealreal.com/shop/all?q=${searchTerm}` },
        { name: 'Poshmark', url: `https://poshmark.com/search?query=${searchTerm}` },
        { name: 'Mercari', url: `https://www.mercari.com/search?keyword=${searchTerm}` },
        { name: 'eBay', url: `https://www.ebay.com/sch/i.html?_nkw=${searchTerm}` },
      ]);
      
      toast.success("AI appraisal complete");
    } catch (e) {
      toast.error("Appraisal failed — please try again");
    } finally {
      setPhase(null);
    }
  };

  const handleCorrectItem = async () => {
    if (!correctedTitle.trim()) return;
    setPhase('appraising');
    try {
      const a = await runAppraise({
        phase: 'appraise',
        text_query: correctedTitle.trim(),
        collection_type: collectionType,
        condition_answers: [],
        identified_item: correctedTitle.trim(),
      });
      setData((prev) => ({
        ...prev,
        title: a.title || correctedTitle.trim(),
        notes: prev.notes || a.notes || "",
        tags: prev.tags?.length ? prev.tags : (a.tags || []),
        estimated_value: a.estimated_value ?? prev.estimated_value,
        value_low: a.value_low ?? null,
        value_high: a.value_high ?? null,
        ai_appraisal_notes: a.appraisal_reasoning || "",
      }));
      setIdentifiedItem(correctedTitle.trim());
      setCorrectedTitle("");
      
      // Generate reseller links
      const searchTerm = encodeURIComponent(a.title || correctedTitle.trim());
      setRessellerLinks([
        { name: 'The RealReal', url: `https://www.therealreal.com/shop/all?q=${searchTerm}` },
        { name: 'Poshmark', url: `https://poshmark.com/search?query=${searchTerm}` },
        { name: 'Mercari', url: `https://www.mercari.com/search?keyword=${searchTerm}` },
        { name: 'eBay', url: `https://www.ebay.com/sch/i.html?_nkw=${searchTerm}` },
      ]);
      
      toast.success("Updated appraisal with correct item");
    } catch (e) {
      toast.error("Re-appraisal failed");
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
    <Dialog open={open} onOpenChange={(val) => { if (val === false && phase !== null) return; onOpenChange(val); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
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
            {/* Extra images for identification */}
            <div className="mt-2">
              <p className="text-[10px] text-muted-foreground mb-1.5">Add more photos (front/back etc.)</p>
              <div className="flex flex-wrap gap-1.5">
                {extraIdentifyImages.map((url, i) => (
                  <div key={url} className="relative w-12 h-12 rounded-lg overflow-hidden border border-border flex-shrink-0">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setExtraIdentifyImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-0 right-0 w-4 h-4 bg-background/90 flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
                <label className="w-12 h-12 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-foreground/40 hover:bg-secondary transition flex-shrink-0">
                  {uploadingExtra ? (
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingExtra}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingExtra(true);
                      try {
                        const url = await uploadFile(file);
                        setExtraIdentifyImages(prev => [...prev, url]);
                      } finally {
                        setUploadingExtra(false);
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
              </div>
            </div>

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
              Fill out with AI
            </Button>

            {/* Phase: Identifying — simple status text only, no progress bar */}
            {phase === 'identifying' && (
              <div className="mt-2 text-center">
                <p className="text-[11px] text-muted-foreground animate-pulse">
                  Identifying item…
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  This may take a minute or two…
                </p>
              </div>
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

            {/* Phase: Needs manual title — AI couldn't identify */}
            {phase === 'questions' && needsManualTitle && (
              <div className="mt-3 p-3 rounded-xl border border-accent/40 bg-accent/5 shadow-sm space-y-3">
                <p className="text-xs font-medium text-foreground text-center">Help us identify this item</p>
                <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                  We couldn't identify this automatically. What is it?
                </p>
                <Input
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. 1967 Hot Wheels Redline…"
                  className="text-xs h-8"
                  onKeyDown={(e) => e.key === 'Enter' && handleManualTitleSubmit()}
                  autoFocus
                />
                <p className="text-[9px] text-muted-foreground leading-relaxed">
                  What's the brand? The model or series name? The year or edition? Any of these help.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleManualTitleSubmit}
                  disabled={!manualTitle.trim()}
                  className="w-full gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Continue with Appraisal
                </Button>
              </div>
            )}

            {/* Phase: Correct identified item */}
            {phase === 'questions' && !needsManualTitle && questions.length > 0 && identifiedItem && !correctedTitle && (
              <div className="mt-3 p-3 rounded-xl border border-accent/40 bg-accent/5 shadow-sm space-y-3">
                <p className="text-xs font-medium text-foreground text-center">Is the item name correct?</p>
                <p className="text-[11px] text-muted-foreground text-center italic">"{identifiedItem}"</p>
                <div className="flex gap-2">
                  <Input
                    value={correctedTitle}
                    onChange={(e) => setCorrectedTitle(e.target.value)}
                    placeholder="Correct item name (e.g. Louis Vuitton Graceful MM 2019)…"
                    className="text-xs h-8"
                    onKeyDown={(e) => e.key === 'Enter' && handleCorrectItem()}
                  />
                  <button
                    type="button"
                    onClick={handleCorrectItem}
                    disabled={!correctedTitle.trim() || phase === 'appraising'}
                    className="px-3 py-2 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 transition"
                  >
                    ✓
                  </button>
                </div>
              </div>
            )}

            {/* Phase: Item-specific questions */}
            {phase === 'questions' && !needsManualTitle && questions.length > 0 && correctedTitle && (
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
                    {/* If user picked "Other / I'll measure" for a size question, show a text input */}
                    {answers[q.id] === "Other / I'll measure" && (
                      <div className="mt-2">
                        <Input
                          value={customSizeInput[q.id] || ""}
                          onChange={(e) => setCustomSizeInput(prev => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder='e.g. 10 inches'
                          className="text-xs h-8"
                          autoFocus
                        />
                        <p className="text-[9px] text-muted-foreground mt-1">We'll re-identify the exact model using this size.</p>
                      </div>
                    )}
                  </div>
                ))}
                <div>
                  <p className="text-xs font-medium mb-1.5">Anything special about this item?</p>
                  <textarea
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    placeholder="e.g. has 5 tines, missing original box, signed on base…"
                    className="w-full text-xs rounded-md border border-input bg-transparent px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                    rows={2}
                  />
                </div>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Quantity
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={data.quantity ?? 1}
                  onChange={(e) => setData({ ...data, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Status
                </Label>
                <div className="flex gap-2">
                  {["owned", "sold"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setData({ ...data, status: s })}
                      className={`flex-1 text-xs py-2 rounded-lg border transition capitalize ${
                        data.status === s
                          ? "bg-foreground text-background border-foreground"
                          : "border-border hover:border-foreground/40 hover:bg-secondary"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {data.ai_appraisal_notes && (
              <div className="p-3 rounded-lg bg-secondary/60 text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground flex items-center gap-1 mb-1">
                  <Sparkles className="w-3 h-3 text-accent" /> AI reasoning
                </span>
                {data.ai_appraisal_notes}
              </div>
            )}

            {resellerLinks.length > 0 && (
              <div className="p-3 rounded-lg bg-secondary/40 text-xs space-y-2">
                <p className="font-medium text-foreground mb-2">Compare prices:</p>
                <div className="flex flex-wrap gap-2">
                  {resellerLinks.map((link) => (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-md border border-border hover:border-accent hover:bg-accent/10 transition text-muted-foreground hover:text-foreground"
                    >
                      {link.name} ↗
                    </a>
                  ))}
                </div>
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