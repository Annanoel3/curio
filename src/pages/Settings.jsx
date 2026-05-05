import React, { useEffect, useState } from "react";
import { Moon, Sun, Monitor, Shield, Copyright, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

      {/* Privacy Policy */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-accent" />
          <h2 className="font-serif text-xl font-medium">Privacy Policy</h2>
        </div>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
          <p><strong className="text-foreground">Effective Date: April 20, 2025</strong></p>

          <p>Curio ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use the Curio collectibles management application.</p>

          <div>
            <p className="font-medium text-foreground mb-1">Information We Collect</p>
            <p>We collect information you provide directly, including your name, email address, and the content you add to your collections (item titles, descriptions, photos, and estimated values). We also collect usage data such as log information, device identifiers, and interaction data to improve the service.</p>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">How We Use Your Information</p>
            <ul className="list-disc list-inside space-y-1">
              <li>To provide and maintain the Curio service</li>
              <li>To personalize your experience and collections</li>
              <li>To process AI-powered appraisals using item photos and descriptions</li>
              <li>To send service-related communications</li>
              <li>To improve app performance and fix bugs</li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">Photos and Item Data</p>
            <p>Photos you upload are stored securely and used solely to power the AI appraisal feature and display your collection. We do not sell, license, or share your item photos or collection data with third parties for marketing purposes.</p>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">AI Appraisals</p>
            <p>When you request an AI appraisal, your item image or description is sent to a third-party AI provider for processing. This data is used only to generate your appraisal and is not stored or used to train AI models beyond what the provider's terms allow.</p>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">Data Sharing</p>
            <p>We do not sell your personal data. We may share data with trusted service providers who assist in operating our platform, subject to confidentiality agreements. We may disclose information if required by law.</p>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">Public Collections</p>
            <p>If you choose to make a collection public using the share feature, that collection's contents will be visible to anyone with the share link. You can revoke public access at any time from the collection settings.</p>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">Data Retention & Deletion</p>
            <p>Your data is retained as long as your account is active. You may delete individual items, collections, or your entire account at any time. Upon account deletion, your data is permanently removed from our systems within 30 days.</p>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">Security</p>
            <p>We implement industry-standard security measures to protect your data, including encrypted data transmission and secure storage. No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">Children's Privacy</p>
            <p>Curio is not directed at children under 13. We do not knowingly collect personal information from children under 13. If we become aware that a child has provided us with personal data, we will delete it promptly.</p>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">Changes to This Policy</p>
            <p>We may update this Privacy Policy periodically. We will notify you of significant changes via email or in-app notice. Continued use of Curio after changes constitutes acceptance of the updated policy.</p>
          </div>

          <p>If you have questions about this policy, contact us at <a href="mailto:mediocreatbestdev@outlook.com" className="text-foreground underline">mediocreatbestdev@outlook.com</a>.</p>
        </div>
      </section>

      <hr className="border-border" />

      {/* Copyright */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Copyright className="w-4 h-4 text-accent" />
          <h2 className="font-serif text-xl font-medium">Copyright & Intellectual Property</h2>
        </div>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
          <p><strong className="text-foreground">© {new Date().getFullYear()} Curio. All rights reserved.</strong></p>

          <p>The Curio application, including its design, code, branding, and user interface, is the intellectual property of Curio and is protected by applicable copyright, trademark, and intellectual property laws.</p>

          <div>
            <p className="font-medium text-foreground mb-1">Your Content</p>
            <p>You retain full ownership of all content you upload to Curio, including photos and item descriptions. By using the app, you grant Curio a limited, non-exclusive license to store, display, and process your content solely for the purpose of providing the service to you.</p>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">Third-Party Content</p>
            <p>Collectible item names, brand names, trademarks, and product identifiers referenced within Curio are the property of their respective owners (e.g., Hot Wheels® is a registered trademark of Mattel, Inc.). Curio is not affiliated with, endorsed by, or sponsored by any collectible manufacturer or brand. References are made solely for identification and appraisal purposes.</p>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">Restrictions</p>
            <p>You may not copy, reproduce, distribute, modify, or create derivative works from any part of the Curio application without prior written consent. Unauthorized use of Curio's proprietary materials may violate copyright, trademark, and other applicable laws.</p>
          </div>

          <p>For licensing inquiries, contact <a href="mailto:mediocreatbestdev@outlook.com" className="text-foreground underline">mediocreatbestdev@outlook.com</a>.</p>
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
        <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
          Delete my account
        </Button>
      </section>

      <div className="pb-8" />

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