"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/lib/permit-types/types";
import {
  ShieldAlert,
  HardHat,
  Factory,
  UserCheck,
  Shield,
  Sun,
  Moon,
  PlusCircle,
  FileText,
  AlertTriangle,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { user, switchRole, highContrast, toggleHighContrast } = useAuth();

  const roleConfigs: {
    role: UserRole;
    label: string;
    icon: any;
    color: string;
    description: string;
  }[] = [
    {
      role: "REQUESTER",
      label: "Requester (Tech)",
      icon: HardHat,
      color: "bg-amber-600 hover:bg-amber-700 text-white",
      description: "Creates permits, closes own work, cannot approve",
    },
    {
      role: "AREA_OWNER",
      label: "Area Owner (Suresh)",
      icon: Factory,
      color: "bg-blue-600 hover:bg-blue-700 text-white",
      description: "Approves Boiler House permits only",
    },
    {
      role: "SAFETY_OFFICER",
      label: "Safety Officer (Ananya)",
      icon: Shield,
      color: "bg-emerald-600 hover:bg-emerald-700 text-white",
      description: "Plant EHS approval, instant suspend, closure verification",
    },
    {
      role: "ADMIN",
      label: "Admin (Full Access)",
      icon: UserCheck,
      color: "bg-purple-600 hover:bg-purple-700 text-white",
      description: "Full overrides & config",
    },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900 text-white shadow-md border-b border-slate-800">
      {/* Top Banner: Quick Demo Role Switcher */}
      <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-semibold bg-orange-600 text-white tracking-wider">
            DEMO EVALUATION SWITCHER
          </span>
          <span className="hidden sm:inline text-slate-400">
            Switch role instantly to test server-side permissions:
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {roleConfigs.map(({ role, label, icon: Icon, color, description }) => {
            const isActive = user?.role === role;
            return (
              <button
                key={role}
                onClick={() => switchRole(role)}
                title={description}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  isActive
                    ? "ring-2 ring-orange-400 font-bold shadow-md " + color
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
                {isActive && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Main Title */}
          <div className="flex items-center gap-4">
            <Link href="/permits" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center text-white font-black text-xl shadow-lg group-hover:bg-orange-500 transition-colors">
                OP
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight text-white">
                    opmaint
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    CMMS PTW
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Permit to Work & High-Risk Safety Module
                </p>
              </div>
            </Link>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-1 ml-6">
              <Link
                href="/permits"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  pathname === "/permits" || pathname === "/"
                    ? "bg-slate-800 text-white border-b-2 border-orange-500"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <FileText className="w-4 h-4" />
                Permits Dashboard
              </Link>

              <Link
                href="/permits/create"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  pathname === "/permits/create"
                    ? "bg-slate-800 text-white border-b-2 border-orange-500"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <PlusCircle className="w-4 h-4 text-orange-400" />
                Issue New Permit
              </Link>
            </nav>
          </div>

          {/* Right Action Bar: Current User Profile + High Contrast Mode */}
          <div className="flex items-center gap-3">
            {/* Glove & Sunlight High-Contrast Toggle */}
            <button
              onClick={toggleHighContrast}
              title="Toggle High-Contrast Sunlight & Glove Mode for field technicians"
              className={`p-2 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-semibold ${
                highContrast
                  ? "bg-yellow-400 text-black border-yellow-500 shadow-md font-bold"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <Sun className="w-4 h-4" />
              <span className="hidden sm:inline">
                {highContrast ? "Sunlight ON" : "Field Mode"}
              </span>
            </button>

            {/* Logged in User Badge */}
            {user ? (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-white flex items-center justify-end gap-1.5">
                    <span>{user.name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-orange-400 border border-slate-700">
                      {user.badgeNumber || user.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {user.department || user.role}
                    {user.assignedAreaName && ` (${user.assignedAreaName})`}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-full bg-slate-700 border-2 border-orange-500/80 flex items-center justify-center font-bold text-sm text-white">
                  {user.name.charAt(0)}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400">Loading user...</div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
