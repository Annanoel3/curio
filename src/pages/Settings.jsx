import React, { useEffect, useState } from "react";
import { Moon, Sun, Monitor, Trash2, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";

export const THEME_KEY = "curio-theme";

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

// Apply on module load so theme is set immediately
applyTheme(localStorage.getItem(THEME_KEY) || "system");

export default function Settings() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "system");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [requestType, setRequestType] = useState(null); // 'data' | 'account'
  const [requestMessage, setRequestMessage] = useState("");
  const [requestSending, setRequestSending] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-12">

      {/* Appearance */}
      <section>
        <h1 className="font-serif text-3xl font-medium mb-1">Settings</h1>
        <p className="text-muted-foreground text-sm mb-8">Manage your app preferences.</p>

        <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Appearance</h2>
        <div className="flex gap-3">
          {options.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border transition
                ${theme === value
                  ? "border-foreground bg-secondary"
                  : "border-border hover:border-foreground/30 hover:bg-secondary/50"
                }`}
            >
              <Icon className={`w-5 h-5 ${theme === value ? "text-foreground" : "text-muted-foreground"}`} />
              <span className={`text-xs font-medium ${theme === value ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <hr className="border-border" />

      {/* Legal Links */}
      <section>
        <h2 className="font-serif text-xl font-medium mb-4">Legal</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Review our policies and legal information.
        </p>
        <Link to="/legal">
          <Button variant="outline" className="w-full">
            Privacy Policy & Terms
          </Button>
        </Link>
      </section>

      <hr className="border-border" />

      {/* Data & Account Requests */}
      <section>
        <h2 className="font-serif text-xl font-medium mb-1">Data & Account Requests</h2>
        <p className="text-sm text-muted-foreground mb-6">
          You may request deletion of your data or your entire account at any time. We'll process your request within 30 days.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/delete-request" className="flex-1">
            <Button variant="outline" className="w-full">Request data deletion</Button>
          </Link>
          <Link to="/delete-request" className="flex-1">
            <Button variant="outline" className="w-full">Request account deletion</Button>
          </Link>
        </div>
      </section>

      <hr className="border-border" />

      {/* Delete Account */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className="w-4 h-4 text-destructive" />
          <h2 className="font-serif text-xl font-medium">Delete Account</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <Link to="/delete-request">
          <Button variant="destructive" size="sm">Delete my account</Button>
        </Link>
      </section>

      <div className="pb-8" />

      {/* Data/Account deletion request dialog */}
      <Dialog open={!!requestType} onOpenChange={(open) => { if (!open) setRequestType(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {requestType === "data" ? "Request Data Deletion" : "Request Account Deletion"}
            </DialogTitle>
          </DialogHeader>
          {requestSent ? (
            <p className="text-sm text-muted-foreground py-2">
              Your request has been sent. We'll get back to you within 30 days.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {requestType === "data"
                  ? "This will request removal of your personal data only, keeping your account active."
                  : "This will request full deletion of your account and all associated data."}
                {" "}Optionally add a note below.
              </p>
              <Textarea
                placeholder="Optional: add any details or context..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                className="mt-2 text-sm"
                rows={3}
              />
            </>
          )}
          <DialogFooter className="gap-2 mt-2">
            <Button variant="ghost" onClick={() => setRequestType(null)}>
              {requestSent ? "Close" : "Cancel"}
            </Button>
            {!requestSent && (
              <Button
                disabled={requestSending}
                onClick={async () => {
                  setRequestSending(true);
                  const user = await base44.auth.me();
                  const subject = requestType === "data"
                    ? "[DATA DELETION REQUEST] Curio"
                    : "[FULL ACCOUNT DELETION REQUEST] Curio";
                  const body = `Request type: ${requestType === "data" ? "Data Deletion Only" : "Full Account Deletion"}\nUser email: ${user?.email || "unknown"}\nUser name: ${user?.full_name || "unknown"}\n\nUser message:\n${requestMessage || "(none)"}`;
                  await base44.integrations.Core.SendEmail({ to: "mediocreatbestdev@outlook.com", subject, body });
                  setRequestSending(false);
                  setRequestSent(true);
                }}
              >
                <Send className="w-4 h-4" />
                {requestSending ? "Sending…" : "Send request"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Delete account?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete your account and all collections, items, and data. There is no way to recover this.
          </p>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await base44.integrations.Core.SendEmail({
                    to: "mediocreatbestdev@outlook.com",
                    subject: "Account Deletion Request",
                    body: `A user has requested account deletion. Please process this request.`,
                  });
                } finally {
                  setDeleting(false);
                  setShowDeleteConfirm(false);
                  base44.auth.logout();
                }
              }}
            >
              {deleting ? "Processing…" : "Yes, delete my account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}