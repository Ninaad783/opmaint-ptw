"use client";

import React, { useState } from "react";
import { StateAction } from "@/lib/state-machine";
import { SignaturePad } from "./SignaturePad";
import {
  X,
  ShieldCheck,
  AlertOctagon,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  CheckCheck,
} from "lucide-react";

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: StateAction;
  permitNumber: string;
  permitTitle: string;
  onSubmit: (payload: {
    comment?: string;
    reason?: string;
    signatureDataUrl?: string;
    completionNotes?: string;
    verificationNotes?: string;
    extensionHours?: number;
  }) => Promise<void>;
}

export function ActionModal({
  isOpen,
  onClose,
  action,
  permitNumber,
  permitTitle,
  onSubmit,
}: ActionModalProps) {
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [extensionHours, setExtensionHours] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getActionConfig = () => {
    switch (action) {
      case "approve":
        return {
          title: "Authorize & Sign Off Permit",
          btnText: "Confirm Sign-Off & Approval",
          btnColor: "bg-emerald-600 hover:bg-emerald-700",
          icon: ShieldCheck,
          requiresSignature: true,
        };
      case "reject":
        return {
          title: "Reject Safety Permit",
          btnText: "Reject Permit (Mandatory Reason)",
          btnColor: "bg-rose-600 hover:bg-rose-700",
          icon: XCircle,
          requiresReason: true,
        };
      case "activate":
        return {
          title: "Commence Hazardous Work (Activate Permit)",
          btnText: "Activate Permit & Begin Work",
          btnColor: "bg-orange-600 hover:bg-orange-700",
          icon: Flame,
        };
      case "suspend":
        return {
          title: "Emergency Suspend Active Permit",
          btnText: "Immediately Suspend Work",
          btnColor: "bg-red-600 hover:bg-red-700",
          icon: AlertOctagon,
          requiresReason: true,
        };
      case "resume":
        return {
          title: "Resume Suspended Permit",
          btnText: "Authorize Resumption of Work",
          btnColor: "bg-blue-600 hover:bg-blue-700",
          icon: CheckCircle2,
        };
      case "close":
        return {
          title: "Close Permit & Hand Back Site",
          btnText: "Submit Closure Handback",
          btnColor: "bg-cyan-600 hover:bg-cyan-700",
          icon: CheckCircle2,
          requiresCompletionNotes: true,
        };
      case "verify":
        return {
          title: "Safety Officer Final Closure Verification",
          btnText: "Verify & Archive Permit",
          btnColor: "bg-emerald-700 hover:bg-emerald-800",
          icon: CheckCheck,
          requiresVerificationNotes: true,
        };
      case "request_extension":
        return {
          title: "Request Permit Validity Extension",
          btnText: "Submit Extension for Safety Review",
          btnColor: "bg-purple-600 hover:bg-purple-700",
          icon: Clock,
          isExtension: true,
        };
      default:
        return {
          title: "Confirm Action",
          btnText: "Confirm",
          btnColor: "bg-slate-800",
          icon: ShieldCheck,
        };
    }
  };

  const config = getActionConfig();
  const Icon = config.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (config.requiresReason && (!reason || reason.trim().length < 5)) {
      setError("A specific mandatory reason (minimum 5 characters) must be provided.");
      return;
    }

    if (config.requiresCompletionNotes && (!completionNotes || completionNotes.trim().length < 5)) {
      setError("Completion notes confirming housekeeping and tool clearance are mandatory.");
      return;
    }

    if (config.requiresVerificationNotes && (!verificationNotes || verificationNotes.trim().length < 5)) {
      setError("Safety Officer verification walk-down notes are mandatory.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        comment,
        reason,
        signatureDataUrl,
        completionNotes,
        verificationNotes,
        extensionHours,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to execute action.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Icon className="w-5 h-5 text-orange-400" />
            <div>
              <h3 className="font-extrabold text-base leading-tight">{config.title}</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {permitNumber} • {permitTitle.slice(0, 32)}...
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {error && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-red-900 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          {/* Action-Specific Inputs */}

          {/* 1. Approval with Signature Pad */}
          {action === "approve" && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                <span className="font-bold block">Safety Verification Declaration:</span>
                <p>
                  By signing below, I certify that I have reviewed the job scope, isolation points, atmospheric tests, and necessary precautions.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Approval Notes / Conditions (Optional):
                </label>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="e.g. Line verified isolated and tagged. Continuous gas monitor active."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <SignaturePad onSave={(dataUrl) => setSignatureDataUrl(dataUrl)} />
            </div>
          )}

          {/* 2. Reject */}
          {action === "reject" && (
            <div className="space-y-3">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900">
                <span className="font-bold block">Mandatory Rejection Rule:</span>
                Permit will be moved to permanent REJECTED status. Explain the exact safety non-compliance.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mandatory Rejection Reason: <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. High combustible hydrocarbon accumulation in sump. Flammables must be degreased before hot work can proceed."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          )}

          {/* 3. Emergency Suspend */}
          {action === "suspend" && (
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 font-semibold">
                🚨 Work will immediately halt on site. Reason will be logged to all supervisors.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Suspension: <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Area gas detector alarmed at 10% LEL / Sudden lightning and rain storm / Shift handover."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          )}

          {/* 4. Resumption */}
          {action === "resume" && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                Verify that hazardous condition has been cleared and area is safe to resume work.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Resumption Re-inspection Notes:
                </label>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="e.g. Sump drained, gas re-tested 0% LEL, clearance granted."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* 5. Requester Close */}
          {action === "close" && (
            <div className="space-y-3">
              <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg text-xs text-cyan-900">
                <span className="font-bold block">Closure Handback Checklist:</span>
                Confirm work is finished, tools/scrap cleared, and area left clean and safe.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Work Completion Notes: <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Welding bracket completed and cooled. Housekeeping completed, fire watch finished 30-min watch. Tools packed."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          )}

          {/* 6. Safety Officer Verification */}
          {action === "verify" && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                <span className="font-bold block">EHS Physical Walk-Down Verification:</span>
                Verify site is free of fire/chemical hazard, all LOTO locks removed, and equipment handed back to operations.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Verification & Inspection Walk-down Notes: <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="e.g. Physical inspection completed: area clean, drains uncovered, zero embers, locks removed. Permit officially verified."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          )}

          {/* 7. Extension Request */}
          {action === "request_extension" && (
            <div className="space-y-3">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900">
                <span className="font-bold block">Validity Window Extension:</span>
                Permit extensions are capped between 1 and 4 hours. Requires re-approval by Plant Safety Officer.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Additional Hours Requested:
                </label>
                <select
                  value={extensionHours}
                  onChange={(e) => setExtensionHours(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value={1}>+1 Hour (Short cooldown)</option>
                  <option value={2}>+2 Hours (Standard inspection)</option>
                  <option value={3}>+3 Hours (Complex overhaul)</option>
                  <option value={4}>+4 Hours (Maximum allowable extension)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Justification / Reason for Extension: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Extra weld passes required on nozzle N2; welding crew remaining on site."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  required
                />
              </div>
            </div>
          )}

          {/* 8. Activate Confirmation */}
          {action === "activate" && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-950 space-y-2">
              <p className="font-bold">
                ⚠️ Confirm that pre-job safety briefing has taken place and workers are equipped with required PPE.
              </p>
              <p>
                Work logging will be enabled once this permit transitions to ACTIVE.
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 text-xs font-bold text-white rounded-lg transition-all shadow-md flex items-center gap-2 ${
                config.btnColor
              } ${submitting ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <Icon className="w-4 h-4" />
              <span>{submitting ? "Processing..." : config.btnText}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
