"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { BrandLogo } from "./brand";
import {
  beginLoading,
  loadingSnapshot,
  serverLoadingSnapshot,
  subscribeLoading,
} from "@/lib/loading-state";
import { brandSlogan } from "@/lib/content";

export function BrandIntro() {
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setFinished(true), 3000);
    return () => clearTimeout(timer);
  }, []);
  if (finished) return null;
  return (
    <div
      className="nex-intro"
      role="status"
      aria-label="Willkommen bei NEX Consulting. Startanimation."
    >
      <div className="nex-intro-orbit" aria-hidden="true" />
      <div className="nex-intro-content">
        <span className="nex-load-eyebrow">WELCOME TO WHAT’S NEXT</span>
        <div className="nex-intro-logo">
          <BrandLogo eager />
        </div>
        <p className="nex-intro-slogan">{brandSlogan}</p>
        <div className="nex-load-track" aria-hidden="true">
          <span />
        </div>
        <span className="nex-load-caption">
          Ihr nächster Schritt beginnt hier.
        </span>
      </div>
    </div>
  );
}
export function GlobalLoading() {
  const visible = useSyncExternalStore(
    subscribeLoading,
    loadingSnapshot,
    serverLoadingSnapshot,
  );
  if (!visible) return null;
  return (
    <div
      className="nex-load-toast"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <BrandLogo eager />
      <span className="nex-load-caption">Wird geladen …</span>
      <div className="nex-load-track" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
export function RouteLoading() {
  useEffect(() => beginLoading(), []);
  return <span className="nex-route-loading" aria-hidden="true" />;
}
