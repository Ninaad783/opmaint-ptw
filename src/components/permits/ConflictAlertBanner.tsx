import React from "react";
import { SafetyConflict } from "@/lib/safety/conflicts";
import { AlertTriangle, Flame, ShieldAlert, AlertOctagon } from "lucide-react";
import Link from "next/link";

interface ConflictAlertBannerProps {
  conflicts: SafetyConflict[];
  onDismiss?: () => void;
}

export function ConflictAlertBanner({ conflicts }: ConflictAlertBannerProps) {
  if (!conflicts || conflicts.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {conflicts.map((conflict, idx) => {
        const isCritical = conflict.severity === "CRITICAL";
        const isHigh = conflict.severity === "HIGH";

        return (
          <div
            key={idx}
            className={`p-4 rounded-xl border shadow-md transition-all ${
              isCritical
                ? "bg-red-50/95 border-red-500 text-red-950 animate-pulse-subtle"
                : isHigh
                ? "bg-amber-50/95 border-amber-500 text-amber-950"
                : "bg-yellow-50 border-yellow-400 text-yellow-950"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                  isCritical ? "bg-red-600 text-white" : "bg-amber-600 text-white"
                }`}
              >
                {isCritical ? (
                  <Flame className="w-5 h-5 animate-bounce" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider font-mono ${
                      isCritical
                        ? "bg-red-700 text-white"
                        : "bg-amber-700 text-white"
                    }`}
                  >
                    {conflict.severity} SAFETY CONFLICT DETECTED
                  </span>
                  <h4 className="font-extrabold text-sm sm:text-base leading-tight">
                    {conflict.headline}
                  </h4>
                </div>

                <p className="text-xs sm:text-sm opacity-90 leading-relaxed font-sans">
                  {conflict.description}
                </p>

                <div className="mt-2 pt-2 border-t border-current/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="font-semibold flex items-center gap-1.5">
                    <span className="underline">Required Mitigation:</span>
                    <span>{conflict.mitigationRequired}</span>
                  </div>

                  {conflict.conflictingPermit && (
                    <Link
                      href={`/permits/${conflict.conflictingPermit.id}`}
                      target="_blank"
                      className="font-mono underline text-xs font-bold hover:opacity-80"
                    >
                      View Overlapping Permit ({conflict.conflictingPermit.permitNumber}) ↗
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
