import React from "react";
import { PermitStatus } from "@/lib/permit-types/types";
import {
  Clock,
  CheckCircle2,
  AlertOctagon,
  Flame,
  XCircle,
  Hourglass,
  CheckCheck,
  Ban,
  FileEdit,
} from "lucide-react";

interface StatusBadgeProps {
  status: PermitStatus;
  size?: "sm" | "md" | "lg";
  isExpiringSoon?: boolean;
}

export function StatusBadge({ status, size = "md", isExpiringSoon = false }: StatusBadgeProps) {
  const configs: Record<
    PermitStatus,
    { label: string; bg: string; text: string; border: string; icon: any; pulse?: boolean }
  > = {
    DRAFT: {
      label: "DRAFT",
      bg: "bg-slate-100",
      text: "text-slate-700",
      border: "border-slate-300",
      icon: FileEdit,
    },
    PENDING_APPROVAL: {
      label: "PENDING APPROVAL",
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-300",
      icon: Clock,
      pulse: true,
    },
    APPROVED: {
      label: "APPROVED (READY)",
      bg: "bg-blue-50",
      text: "text-blue-800",
      border: "border-blue-300",
      icon: CheckCircle2,
    },
    ACTIVE: {
      label: isExpiringSoon ? "ACTIVE (EXPIRING SOON)" : "ACTIVE / IN WORK",
      bg: isExpiringSoon ? "bg-orange-100" : "bg-emerald-50",
      text: isExpiringSoon ? "text-orange-900" : "text-emerald-800",
      border: isExpiringSoon ? "border-orange-400" : "border-emerald-300",
      icon: Flame,
      pulse: isExpiringSoon,
    },
    SUSPENDED: {
      label: "SUSPENDED (HOLD)",
      bg: "bg-red-50",
      text: "text-red-800",
      border: "border-red-400",
      icon: AlertOctagon,
      pulse: true,
    },
    REJECTED: {
      label: "REJECTED",
      bg: "bg-rose-100",
      text: "text-rose-900",
      border: "border-rose-300",
      icon: XCircle,
    },
    EXPIRED: {
      label: "EXPIRED",
      bg: "bg-zinc-100",
      text: "text-zinc-700",
      border: "border-zinc-300",
      icon: Hourglass,
    },
    CLOSED: {
      label: "CLOSED (PENDING VERIFY)",
      bg: "bg-cyan-50",
      text: "text-cyan-800",
      border: "border-cyan-300",
      icon: CheckCircle2,
    },
    CLOSED_VERIFIED: {
      label: "CLOSED & VERIFIED",
      bg: "bg-emerald-100",
      text: "text-emerald-900",
      border: "border-emerald-400",
      icon: CheckCheck,
    },
    CANCELLED: {
      label: "CANCELLED",
      bg: "bg-slate-200",
      text: "text-slate-600",
      border: "border-slate-300",
      icon: Ban,
    },
  };

  const current = configs[status] || configs.DRAFT;
  const Icon = current.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3.5 py-1.5 text-sm gap-2 font-bold",
  };

  return (
    <span
      className={`inline-flex items-center font-mono font-semibold rounded-md border shadow-sm uppercase tracking-wide transition-all ${
        sizeClasses[size]
      } ${current.bg} ${current.text} ${current.border} ${
        current.pulse ? "animate-pulse" : ""
      }`}
    >
      <Icon className={size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5"} />
      <span>{current.label}</span>
    </span>
  );
}
