"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { StatusBadge } from "@/components/permits/StatusBadge";
import { CountdownTimer } from "@/components/permits/CountdownTimer";
import { QRCodeModal } from "@/components/permits/QRCodeModal";
import { DynamicTypeFields } from "@/components/permits/DynamicTypeFields";
import { AuditTimeline } from "@/components/permits/AuditTimeline";
import { ActionModal } from "@/components/permits/ActionModal";
import { StateAction } from "@/lib/state-machine";
import {
  ArrowLeft,
  QrCode,
  Printer,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Flame,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  PenTool,
  CheckCheck,
  Building,
  User,
  History,
  FileText,
  Activity,
  Plus,
} from "lucide-react";

export default function PermitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const permitId = params.id as string;

  const [permit, setPermit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"overview" | "approvals" | "audit" | "worklogs">("overview");

  // Modals
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    action: StateAction;
  }>({
    isOpen: false,
    action: "approve",
  });

  // Work log input state
  const [workSummary, setWorkSummary] = useState("");
  const [workWorkersCount, setWorkWorkersCount] = useState(2);
  const [submittingWorkLog, setSubmittingWorkLog] = useState(false);

  const fetchPermit = async () => {
    try {
      const res = await fetch(`/api/permits/${permitId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load permit.");
      setPermit(data.permit);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermit();
  }, [permitId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-2">
        <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs">Loading safety permit data...</p>
      </div>
    );
  }

  if (error || !permit) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 bg-white rounded-xl border border-red-200">
        <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
        <h3 className="font-bold text-slate-900">Permit Not Found or Access Denied</h3>
        <p className="text-xs text-slate-500">{error || "The requested permit could not be loaded."}</p>
        <Link
          href="/permits"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Dashboard
        </Link>
      </div>
    );
  }

  // Parse JSON fields
  const hazards: string[] = JSON.parse(permit.hazards || "[]");
  const ppeRequired: string[] = JSON.parse(permit.ppeRequired || "[]");
  const precautions: any[] = JSON.parse(permit.precautionsChecklist || "[]");
  const typeSpecificData: Record<string, any> = JSON.parse(permit.typeSpecificData || "{}");

  const now = new Date();
  const start = new Date(permit.plannedStartTime);
  const end = new Date(permit.plannedEndTime);
  const isExpiringSoon = permit.status === "ACTIVE" && end > now && end.getTime() - now.getTime() <= 2 * 3600000;
  const isPremature = start > now;

  // Determine allowed actions based on role and status
  const isRequester = user?.id === permit.requesterId;
  const isAreaOwner = user?.role === "AREA_OWNER" && user?.assignedAreaId === permit.areaId;
  const isSafetyOfficer = user?.role === "SAFETY_OFFICER";
  const isAdmin = user?.role === "ADMIN";

  // Check existing approval for user role
  const areaApproval = permit.approvals?.find((a: any) => a.role === "AREA_OWNER");
  const safetyApproval = permit.approvals?.find((a: any) => a.role === "SAFETY_OFFICER");

  const canApproveAsAreaOwner =
    permit.status === "PENDING_APPROVAL" &&
    isAreaOwner &&
    !isRequester && // Self approval blocked!
    areaApproval?.status === "PENDING";

  const canApproveAsSafetyOfficer =
    permit.status === "PENDING_APPROVAL" &&
    isSafetyOfficer &&
    !isRequester && // Self approval blocked!
    safetyApproval?.status === "PENDING";

  const canApproveAsAdmin = permit.status === "PENDING_APPROVAL" && isAdmin && !isRequester;

  const canActivate =
    permit.status === "APPROVED" &&
    (isRequester || isSafetyOfficer || isAdmin) &&
    !isPremature;

  const canSuspend = permit.status === "ACTIVE" && (isSafetyOfficer || isAdmin);
  const canResume = permit.status === "SUSPENDED" && (isSafetyOfficer || isAdmin);
  const canClose = permit.status === "ACTIVE" && (isRequester || isSafetyOfficer || isAdmin);
  const canVerify = permit.status === "CLOSED" && (isSafetyOfficer || isAdmin);
  const canRequestExtension = permit.status === "ACTIVE" && isRequester;
  const canApproveExtension =
    permit.status === "ACTIVE" &&
    permit.extensionStatus === "REQUESTED" &&
    (isSafetyOfficer || isAdmin);

  const canCancel =
    ["DRAFT", "PENDING_APPROVAL", "APPROVED", "ACTIVE", "SUSPENDED"].includes(permit.status) &&
    (isRequester || isSafetyOfficer || isAdmin);

  const handleActionSubmit = async (payload: any) => {
    const res = await fetch(`/api/permits/${permit.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: actionModal.action,
        ...payload,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Transition failed");
    }

    // Refresh permit data
    await fetchPermit();
  };

  const handleAddWorkLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workSummary.trim()) return;

    setSubmittingWorkLog(true);
    try {
      const res = await fetch(`/api/permits/${permit.id}/work-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: workSummary,
          workersPresent: Number(workWorkersCount),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to log work");
        return;
      }

      setWorkSummary("");
      await fetchPermit();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmittingWorkLog(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between text-xs">
        <Link
          href="/permits"
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Permits Dashboard
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setQrModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all"
          >
            <QrCode className="w-3.5 h-3.5 text-orange-600" />
            <span>Field QR Code</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Permit</span>
          </button>
        </div>
      </div>

      {/* Main Permit Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-base font-black text-blue-700">
                {permit.permitNumber}
              </span>
              <span className="px-2.5 py-0.5 rounded text-xs font-bold font-mono uppercase bg-slate-100 text-slate-700 border border-slate-200">
                {permit.type.replace("_", " ")}
              </span>
              <StatusBadge status={permit.status} size="md" isExpiringSoon={isExpiringSoon} />
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {permit.title}
            </h1>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                {permit.plant?.name} • {permit.area?.name}
              </span>

              {permit.equipment && (
                <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                  Tag: {permit.equipment.tagNumber} ({permit.equipment.name})
                </span>
              )}

              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Requester: <strong>{permit.requester?.name}</strong>
              </span>
            </div>
          </div>

          {/* Right Status Overview / Countdown Clock */}
          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            {permit.status === "ACTIVE" && (
              <CountdownTimer
                plannedEndTime={permit.plannedEndTime}
                status={permit.status}
                onExpire={() => fetchPermit()}
              />
            )}

            <div className="text-xs text-left md:text-right font-mono bg-slate-50 p-2.5 rounded-lg border">
              <div className="text-[10px] uppercase font-bold text-slate-400">Validity Window</div>
              <div className="font-semibold text-slate-800">
                {new Date(permit.plannedStartTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                -{" "}
                {new Date(permit.plannedEndTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "short",
                })}
              </div>
            </div>
          </div>
        </div>

        {/* High-Impact Alerts (Suspended Reason / Rejection Reason / Self-Approval Block Notice) */}
        {permit.suspensionReason && (
          <div className="p-3.5 bg-red-50 border border-red-300 rounded-lg text-xs text-red-950 font-semibold flex items-start gap-2.5">
            <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block uppercase tracking-wider text-red-800">
                Active Suspension Notice:
              </span>
              <p>{permit.suspensionReason}</p>
            </div>
          </div>
        )}

        {permit.rejectionReason && (
          <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-950 font-semibold flex items-start gap-2.5">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block uppercase tracking-wider text-rose-800">
                Safety Officer Rejection Reason:
              </span>
              <p>{permit.rejectionReason}</p>
            </div>
          </div>
        )}

        {/* Extension Request Banner */}
        {permit.extensionStatus === "REQUESTED" && (
          <div className="p-3.5 bg-purple-50 border border-purple-300 rounded-lg text-xs text-purple-950 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <span>
                <strong>Extension of +{permit.extensionHoursRequested || 2} Hours Requested:</strong>{" "}
                "{permit.extensionReason}"
              </span>
            </div>
            {canApproveExtension && (
              <button
                onClick={() =>
                  setActionModal({ isOpen: true, action: "approve_extension" })
                }
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold text-xs shadow-sm"
              >
                Approve Extension
              </button>
            )}
          </div>
        )}

        {/* Premature Start Time Warning */}
        {permit.status === "APPROVED" && isPremature && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>
              <strong>Start Time Guard:</strong> This permit is approved, but work cannot begin before{" "}
              {start.toLocaleString()}. Work activation will unlock at the scheduled start time.
            </span>
          </div>
        )}

        {/* Self Approval Prohibited Notice */}
        {permit.status === "PENDING_APPROVAL" && isRequester && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-500" />
            <span>
              <strong>Safety Guard Active:</strong> You are the requester of this permit. Self-approval is prohibited by plant safety policy. Waiting for Area Owner & Safety Officer sign-offs.
            </span>
          </div>
        )}

        {/* CONTEXTUAL ACTION BAR */}
        <div className="pt-2 flex flex-wrap items-center gap-2 border-t">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">
            Allowed Actions:
          </span>

          {/* 1. Area Owner Approval */}
          {canApproveAsAreaOwner && (
            <button
              onClick={() => setActionModal({ isOpen: true, action: "approve" })}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Area Owner Sign-Off</span>
            </button>
          )}

          {/* 2. Safety Officer Approval */}
          {canApproveAsSafetyOfficer && (
            <button
              onClick={() => setActionModal({ isOpen: true, action: "approve" })}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Safety Officer Authorization</span>
            </button>
          )}

          {/* 3. Admin Override Approval */}
          {canApproveAsAdmin && (
            <button
              onClick={() => setActionModal({ isOpen: true, action: "approve" })}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Override Approval</span>
            </button>
          )}

          {/* 4. Reject button */}
          {(canApproveAsAreaOwner || canApproveAsSafetyOfficer || canApproveAsAdmin) && (
            <button
              onClick={() => setActionModal({ isOpen: true, action: "reject" })}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition-all"
            >
              <XCircle className="w-3.5 h-3.5 inline mr-1" />
              <span>Reject Permit</span>
            </button>
          )}

          {/* 5. Activate button */}
          {canActivate && (
            <button
              onClick={() => setActionModal({ isOpen: true, action: "activate" })}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 animate-pulse"
            >
              <Flame className="w-4 h-4" />
              <span>Activate Permit (Start Work)</span>
            </button>
          )}

          {/* 6. Emergency Suspend */}
          {canSuspend && (
            <button
              onClick={() => setActionModal({ isOpen: true, action: "suspend" })}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Suspend Work (Emergency)</span>
            </button>
          )}

          {/* 7. Resume Work */}
          {canResume && (
            <button
              onClick={() => setActionModal({ isOpen: true, action: "resume" })}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Resume Work</span>
            </button>
          )}

          {/* 8. Close Permit */}
          {canClose && (
            <button
              onClick={() => setActionModal({ isOpen: true, action: "close" })}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Complete Work & Close</span>
            </button>
          )}

          {/* 9. Verify Closure */}
          {canVerify && (
            <button
              onClick={() => setActionModal({ isOpen: true, action: "verify" })}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-lg shadow-md flex items-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4" />
              <span>EHS Final Closure Verification</span>
            </button>
          )}

          {/* 10. Request Extension */}
          {canRequestExtension && permit.extensionStatus !== "REQUESTED" && (
            <button
              onClick={() => setActionModal({ isOpen: true, action: "request_extension" })}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              <span>Request Extension (+N hrs)</span>
            </button>
          )}

          {/* 11. Cancel */}
          {canCancel && (
            <button
              onClick={() => setActionModal({ isOpen: true, action: "cancel" })}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg"
            >
              Cancel Permit
            </button>
          )}
        </div>
      </div>

      {/* Tabs Row */}
      <div className="border-b border-slate-200 flex gap-4 text-xs font-bold">
        {[
          { id: "overview", label: "Job & Safety Specifications", icon: FileText },
          {
            id: "approvals",
            label: `Approval Trail (${permit.approvals?.length || 0})`,
            icon: ShieldCheck,
          },
          {
            id: "audit",
            label: `Audit Log (${permit.auditLogs?.length || 0})`,
            icon: History,
          },
          {
            id: "worklogs",
            label: `Active Work Logs (${permit.workLogs?.length || 0})`,
            icon: Activity,
          },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`pb-3 flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === id
                ? "border-orange-600 text-orange-600 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Work Description Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
              Scope of Hazardous Activity
            </h3>
            <p className="text-sm text-slate-800 leading-relaxed font-sans">
              {permit.description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Contractor</span>
                <span className="font-semibold text-slate-800">{permit.contractorName}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Crew Count</span>
                <span className="font-semibold text-slate-800">{permit.crewCount} Personnel</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Supervisor</span>
                <span className="font-semibold text-slate-800">{permit.supervisorName}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Supervisor Contact</span>
                <span className="font-mono text-slate-800 font-semibold">{permit.supervisorContact}</span>
              </div>
            </div>
          </div>

          {/* Type-Specific Safety Verification Panel (Schema-Driven) */}
          <DynamicTypeFields
            type={permit.type}
            values={typeSpecificData}
            readOnly={true}
          />

          {/* Hazards & PPE Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hazards Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <span>Identified Energy Hazards</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {hazards.length > 0 ? (
                  hazards.map((h) => (
                    <span
                      key={h}
                      className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 font-mono"
                    >
                      ⚠️ {h.replace(/_/g, " ")}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">None specified</span>
                )}
              </div>
            </div>

            {/* PPE Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Mandatory Protective Equipment (PPE)</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {ppeRequired.length > 0 ? (
                  ppeRequired.map((p) => (
                    <span
                      key={p}
                      className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-200 font-mono"
                    >
                      🛡️ {p.replace(/_/g, " ")}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">Standard plant PPE only</span>
                )}
              </div>
            </div>
          </div>

          {/* Pre-Job Precautions Checklist */}
          {precautions.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
                Pre-Job Precautions Checklist
              </h3>
              <div className="space-y-2">
                {precautions.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 text-xs text-slate-800 p-2 rounded bg-slate-50 border border-slate-100"
                  >
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        item.checked ? "text-emerald-600" : "text-slate-300"
                      }`}
                    />
                    <span className={item.checked ? "font-medium" : "text-slate-400 line-through"}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Handback / Completion & Verification Notes */}
          {(permit.completionNotes || permit.verificationNotes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {permit.completionNotes && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-xs space-y-1">
                  <span className="font-bold text-cyan-900 uppercase block">Requester Completion Notes:</span>
                  <p className="text-cyan-950 font-sans">{permit.completionNotes}</p>
                </div>
              )}
              {permit.verificationNotes && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs space-y-1">
                  <span className="font-bold text-emerald-900 uppercase block">Safety Officer Walk-down Notes:</span>
                  <p className="text-emerald-950 font-sans">{permit.verificationNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Approvals Trail with Digital Signatures */}
      {activeTab === "approvals" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {permit.approvals?.map((app: any) => {
              const isApproved = app.status === "APPROVED";
              const isRejected = app.status === "REJECTED";

              return (
                <div
                  key={app.id}
                  className={`p-5 rounded-xl border shadow-sm space-y-3 ${
                    isApproved
                      ? "bg-emerald-50/50 border-emerald-300 text-emerald-950"
                      : isRejected
                      ? "bg-rose-50 border-rose-300 text-rose-950"
                      : "bg-white border-slate-200 text-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                        Required Sign-off Role
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900">
                        {app.role.replace("_", " ")}
                      </h4>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-xs font-mono font-bold uppercase ${
                        isApproved
                          ? "bg-emerald-100 text-emerald-800"
                          : isRejected
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>

                  {app.approver && (
                    <div className="text-xs space-y-0.5">
                      <div className="font-semibold text-slate-900">
                        Signatory: {app.approver.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {app.decisionDate ? new Date(app.decisionDate).toLocaleString() : ""}
                      </div>
                    </div>
                  )}

                  {app.comment && (
                    <p className="text-xs bg-white/70 p-2 rounded border border-current/10 italic">
                      "{app.comment}"
                    </p>
                  )}

                  {/* Render Digital Canvas Signature */}
                  {app.signatureDataUrl && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase mb-1">
                        Captured Digital Signature
                      </span>
                      <div className="bg-white p-2 border rounded-md inline-block shadow-inner">
                        <img
                          src={app.signatureDataUrl}
                          alt="Digital Signature"
                          className="h-12 w-auto object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Immutable Audit Trail Timeline */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <AuditTimeline logs={permit.auditLogs} />
        </div>
      )}

      {/* Tab 4: Work Logs */}
      {activeTab === "worklogs" && (
        <div className="space-y-6">
          {/* Work Log Form: STRICT RULE - Only if ACTIVE! */}
          {permit.status === "ACTIVE" ? (
            <form
              onSubmit={handleAddWorkLog}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3"
            >
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-700">
                Log Active Shift Work Progress:
              </h4>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={workSummary}
                  onChange={(e) => setWorkSummary(e.target.value)}
                  placeholder="e.g. Cut 3 bolt heads, grinder spark containment curtain in place, fire watch alert..."
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  required
                />

                <input
                  type="number"
                  min={1}
                  max={20}
                  value={workWorkersCount}
                  onChange={(e) => setWorkWorkersCount(Number(e.target.value))}
                  className="w-24 px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                  title="Workers present on site"
                />

                <button
                  type="submit"
                  disabled={submittingWorkLog}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{submittingWorkLog ? "Logging..." : "Log Work"}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-slate-400" />
              <span>
                <strong>Industrial Rule:</strong> Work progress can ONLY be logged while a permit is in{" "}
                <strong>ACTIVE</strong> status. (Current status: {permit.status}).
              </span>
            </div>
          )}

          {/* Work Logs List */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
              Logged Shift Activities ({permit.workLogs?.length || 0})
            </h4>

            {permit.workLogs && permit.workLogs.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {permit.workLogs.map((log: any) => (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                    <div className="space-y-0.5">
                      <p className="font-medium text-slate-900 font-sans">{log.summary}</p>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>Logged by <strong>{log.user?.name}</strong></span>
                        <span>•</span>
                        <span>{log.workersPresent} crew members</span>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 shrink-0">
                      {new Date(log.loggedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                No work logs recorded yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR Code Inspection Modal */}
      <QRCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        permit={{
          id: permit.id,
          permitNumber: permit.permitNumber,
          title: permit.title,
          type: permit.type,
          status: permit.status,
          plantName: permit.plant?.name,
          areaName: permit.area?.name,
          plannedStartTime: permit.plannedStartTime,
          plannedEndTime: permit.plannedEndTime,
        }}
      />

      {/* Reusable Action Modal */}
      <ActionModal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ ...actionModal, isOpen: false })}
        action={actionModal.action}
        permitNumber={permit.permitNumber}
        permitTitle={permit.title}
        onSubmit={handleActionSubmit}
      />
    </div>
  );
}
