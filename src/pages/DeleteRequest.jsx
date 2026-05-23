import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";

export default function DeleteRequest() {
  const [requestType, setRequestType] = useState("account"); // 'data' | 'account'
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setSending(true);
    const user = await base44.auth.me();
    const subject = requestType === "data"
      ? "[DATA DELETION REQUEST] Curio"
      : "[FULL ACCOUNT DELETION REQUEST] Curio";
    const body = `Request type: ${requestType === "data" ? "Data Deletion Only" : "Full Account Deletion"}\nUser email: ${user?.email || "unknown"}\nUser name: ${user?.full_name || "unknown"}\n\nUser message:\n${message || "(none)"}`;
    await base44.integrations.Core.SendEmail({ to: "mediocreatbestdev@outlook.com", subject, body });
    setSending(false);
    setSent(true);
  };

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <Link to="/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ChevronLeft className="w-4 h-4" /> Back to settings
      </Link>

      <h1 className="font-serif text-3xl font-medium mb-2">Data & Account Deletion</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Submit a request to delete your data or your account. We'll process your request within 30 days.
      </p>

      {sent ? (
        <div className="rounded-xl border border-border bg-secondary/50 p-6 text-center space-y-2">
          <p className="font-medium">Request sent</p>
          <p className="text-sm text-muted-foreground">We've received your request and will follow up within 30 days.</p>
          <Link to="/settings">
            <Button variant="outline" className="mt-4">Back to settings</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Request type selection */}
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Request type</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setRequestType("data")}
                className={`text-left px-4 py-3 rounded-xl border transition ${requestType === "data" ? "border-foreground bg-secondary" : "border-border hover:border-foreground/30"}`}
              >
                <p className="font-medium text-sm">Data deletion only</p>
                <p className="text-xs text-muted-foreground mt-0.5">Remove your personal data while keeping your account active.</p>
              </button>
              <button
                onClick={() => setRequestType("account")}
                className={`text-left px-4 py-3 rounded-xl border transition ${requestType === "account" ? "border-foreground bg-secondary" : "border-border hover:border-foreground/30"}`}
              >
                <p className="font-medium text-sm">Full account deletion</p>
                <p className="text-xs text-muted-foreground mt-0.5">Permanently delete your account and all associated data.</p>
              </button>
            </div>
          </div>

          {/* Optional message */}
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Additional notes (optional)</p>
            <Textarea
              placeholder="Add any details or context..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="text-sm"
            />
          </div>

          <Button onClick={handleSubmit} disabled={sending} className="w-full gap-2">
            <Send className="w-4 h-4" />
            {sending ? "Sending…" : "Submit request"}
          </Button>
        </div>
      )}
    </div>
  );
}