import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const ACCEPTED = ".csv,.xlsx,.xls,.pdf,.txt,.json";

export default function BulkAddDialog({ open, onOpenChange, collectionId, collectionType, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null); // number of items created

  const reset = () => { setFile(null); setDone(null); };

  const handleClose = (val) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke("bulkAddItems", {
        file_url,
        collection_id: collectionId,
        collection_type: collectionType,
      });
      const count = res.data?.created || 0;
      setDone(count);
      toast.success(`Added ${count} item${count !== 1 ? "s" : ""}`);
      onSuccess();
    } catch (e) {
      toast.error("Bulk add failed — please check your file format");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => { if (loading) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Bulk add items</DialogTitle>
        </DialogHeader>

        {done !== null ? (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="font-medium text-lg">{done} item{done !== 1 ? "s" : ""} added!</p>
            <p className="text-sm text-muted-foreground">They've been added to your collection.</p>
            <Button onClick={() => handleClose(false)} className="mt-2">Done</Button>
          </div>
        ) : (
          <>
            <div className="py-2 space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a spreadsheet, PDF, or text file listing your items. We'll extract titles, values, notes, and tags automatically.
              </p>

              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 hover:border-foreground/40 hover:bg-secondary/40 transition cursor-pointer"
                onClick={() => document.getElementById("bulk-file-input").click()}
              >
                {file ? (
                  <>
                    <FileText className="w-8 h-8 text-accent" />
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    >
                      Change file
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drag & drop or <span className="text-foreground underline">browse</span>
                    </p>
                    <p className="text-xs text-muted-foreground">CSV, Excel, PDF, TXT, JSON</p>
                  </>
                )}
                <input
                  id="bulk-file-input"
                  type="file"
                  accept={ACCEPTED}
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Tips for best results:</p>
                <p>• CSV/Excel: columns like Name, Value, Notes, Tags, Qty</p>
                <p>• PDF/text: any list format works — AI will parse it</p>
                <p>• Values should be numbers (e.g. 12.50, not "$12.50")</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => handleClose(false)} disabled={loading}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!file || loading} className="gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <><Upload className="w-4 h-4" /> Import items</>}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}