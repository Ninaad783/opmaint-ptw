import React from "react";
import {
  Clock,
  User,
  ShieldCheck,
  AlertTriangle,
  FileEdit,
  Flame,
  CheckCircle2,
  XCircle,
  Ban,
  ArrowRight,
} from "lucide-react";

export interface AuditLogItem {
  id: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  fieldName?: string | null;
  fromValue?: string | null;
  toValue?: string | null;
  comment?: string | null;
  timestamp: string | Date;
  user?: {
    id: string;
    name: string;
    role: string;
    badgeNumber?: string | null;
  } | null;
}

interface AuditTimelineProps {
  logs: AuditLogItem[];
}

export function AuditTimeline({ logs }: AuditTimelineProps) {
  if (!logs || logs.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-dashed rounded-xl text-slate-500 text-sm">
        No audit entries recorded yet.
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATED":
      case "SUBMITTED":
        return <FileEdit className="w-4 h-4 text-blue-600" />;
      case "APPROVED":
      case "EXTENSION_APPROVED":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case "ACTIVATED":
      case "RESUMED":
        return <Flame className="w-4 h-4 text-orange-600" />;
      case "SUSPENDED":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case "REJECTED":
        return <XCircle className="w-4 h-4 text-rose-600" />;
      case "CLOSED":
      case "CLOSED_VERIFIED":
        return <ShieldCheck className="w-4 h-4 text-cyan-600" />;
      case "CANCELLED":
        return <Ban className="w-4 h-4 text-slate-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b">
        <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
          <span>Immutable Regulatory Audit Trail</span>
          <span className="text-[11px] font-mono font-normal px-2 py-0.5 bg-slate-100 rounded text-slate-600">
            {logs.length} Logged Events
          </span>
        </h4>
        <span className="text-[11px] text-slate-500">
          OSHA & PESO Compliant Electronic Log
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {logs.map((log) => {
          const date = new Date(log.timestamp);
          const formattedDate = date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
          const formattedTime = date.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          return (
            <div key={log.id} className="relative group">
              {/* Dot icon */}
              <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                {getActionIcon(log.action)}
              </div>

              {/* Event card */}
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-1.5 hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 uppercase tracking-wider text-[11px]">
                      {log.action.replace("_", " ")}
                    </span>

                    {log.fromStatus && log.toStatus && log.fromStatus !== log.toStatus && (
                      <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                        <span className="font-semibold">{log.fromStatus}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="font-bold text-slate-900">{log.toStatus}</span>
                      </div>
                    )}
                  </div>

                  <span className="font-mono text-slate-400 text-[11px]">
                    {formattedDate} • {formattedTime}
                  </span>
                </div>

                {/* Actor Info */}
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-800">
                    {log.user?.name || "System Automation Engine"}
                  </span>
                  {log.user?.role && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                      {log.user.role} {log.user.badgeNumber && `#${log.user.badgeNumber}`}
                    </span>
                  )}
                </div>

                {/* Comment / Note */}
                {log.comment && (
                  <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 font-sans leading-relaxed">
                    {log.comment}
                  </p>
                )}

                {/* Field-level diff */}
                {log.fieldName && (
                  <div className="text-[11px] bg-slate-50 p-2 rounded border font-mono space-y-0.5">
                    <div className="text-slate-500 font-semibold">
                      Modified Field: <span className="text-slate-800">{log.fieldName}</span>
                    </div>
                    {log.fromValue && (
                      <div className="text-red-700 line-through">
                        - {log.fromValue}
                      </div>
                    )}
                    {log.toValue && (
                      <div className="text-emerald-700 font-bold">
                        + {log.toValue}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
