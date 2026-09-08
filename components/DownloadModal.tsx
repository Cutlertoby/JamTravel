"use client";

import { useEffect, useState } from "react";
import { APP_PROMO } from "@/lib/types";

// QR download modal. Opens when any element with [data-open-download] is
// clicked — currently only the CTA at the bottom of article pages. Mounted
// once in the public layout.
export default function DownloadModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = (e.target as HTMLElement)?.closest("[data-open-download]");
      if (el) {
        e.preventDefault();
        setOpen(true);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <div
      className={`modal-overlay${open ? " active" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="modal" role="dialog" aria-modal="true">
        <button
          className="modal-close"
          aria-label="Close"
          onClick={() => setOpen(false)}
        >
          ×
        </button>
        <h2>Get the {APP_PROMO.name} app</h2>
        <div className="modal-stores">
          <div className="modal-store">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/qr-ios.webp" alt="iOS download QR code" />
            <a
              href={APP_PROMO.appStoreUrl}
              target="_blank"
              rel="noopener"
              className="btn-appstore"
            >
              App Store
            </a>
          </div>
          <div className="modal-store">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/qr-android.webp" alt="Android download QR code" />
            <a
              href={APP_PROMO.googlePlayUrl}
              target="_blank"
              rel="noopener"
              className="btn-googleplay"
            >
              Google Play
            </a>
          </div>
        </div>
        <p className="modal-hint">
          Scan the QR code or tap a button to download
        </p>
      </div>
    </div>
  );
}
