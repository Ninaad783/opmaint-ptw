"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { StatusBadge } from "@/components/permits/StatusBadge";
import { CountdownTimer } from "@/components/permits/CountdownTimer";
import { ConflictAlertBanner } from "@/components/permits/ConflictAlertBanner";
import { SafetyConflict } from "@/lib/safety/conflicts";
import {
  Flame,
  Clock,
  ShieldCheck,
  AlertTriangle,
  PlusCircle,
  Search,
  Filter,
  ArrowRight,
  RefreshCw,
  Building,
  CheckCircle2,
} from "lucide-react";

export default function PermitsDashboardPage() {
  const { user } = useAuth();
  const [permits, setPermits] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    total: 0,
    active: 0,
    expiringSoon: 0,
    suspended: 0,
    pendingMyApproval: 0,
  });
  const [masterData, setMasterData] = useState<{
    plants: any[];
    areas: any[];
    equipment: any[];
  }>({ plants: [], areas: [], equipment: [] });
  const [conflicts, setConflicts] = useState<SafetyConflict[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [plantFilter, setPlantFilter] = useState("ALL");
  const [areaFilter, setAreaFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [myApprovalsOnly, setMyApprovalsOnly] = useState(false);

  // Fetch Master Data
  useEffect(() => {
    fetch("/api/master-data")
      .then((r) => r.json())
      .then((data) => {
        setMasterData(data);
      })
      .catch((e) => console.error("Error loading master data:", e));
  }, []);

  // Fetch Permits
  const fetchPermits = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (plantFilter !== "ALL") params.set("plantId", plantFilter);
      if (areaFilter !== "ALL") params.set("areaId", areaFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (myApprovalsOnly) params.set("myApprovalsOnly", "true");

      const res = await fetch(`/api/permits?${params.toString()}`);
      const data = await res.json();
      if (data.permits) {
        setPermits(data.permits);
        setMetrics(data.metrics);

        // Check for active conflicts among listed permits
        detectActiveConflicts(data.permits);
      }
    } catch (e) {
      console.error("Failed to fetch permits:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermits();
  }, [statusFilter, typeFilter, plantFilter, areaFilter, myApprovalsOnly, user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPermits();
  };

  const detectActiveConflicts = (allPermits: any[]) => {
    const activePermits = allPermits.filter((p) => p.status === "ACTIVE" || p.status === "APPROVED");
    const foundConflicts: SafetyConflict[] = [];

    // Check if hot work and confined space overlap in the same area
    for (let i = 0; i < activePermits.length; i++) {
      for (let j = i + 1; j < activePermits.length; j++) {
        const p1 = activePermits[i];
        const p2 = activePermits[j];

        if (p1.areaId === p2.areaId) {
          const isHW1 = p1.type === "HOT_WORK";
          const isCS2 = p2.type === "CONFINED_SPACE";
          const isCS1 = p1.type === "CONFINED_SPACE";
          const isHW2 = p2.type === "HOT_WORK";

          if ((isHW1 && isCS2) || (isCS1 && isHW2)) {
            foundConflicts.push({
              severity: "CRITICAL",
              category: "HOT_WORK_CONFINED_SPACE",
              headline: `CRITICAL SAFETY CONFLICT: Hot Work (${isHW1 ? p1.permitNumber : p2.permitNumber}) & Confined Space (${isCS1 ? p1.permitNumber : p2.permitNumber}) in ${p1.area.name}`,
              description: `Simultaneous open flame hot work and confined vessel operations in the same plant zone create an acute vapor cloud explosion and ignition risk.`,
              mitigationRequired: "Ensure atmospheric continuous gas sweeps and physically verify isolation boundary between the two job sites.",
              conflictingPermit: {
                id: p2.id,
                permitNumber: p2.permitNumber,
                title: p2.title,
                type: p2.type,
                status: p2.status,
                plantId: p2.plantId,
                plantName: p2.plant.name,
                areaId: p2.areaId,
                areaName: p2.area.name,
                plannedStartTime: p2.plannedStartTime,
                plannedEndTime: p2.plannedEndTime,
              },
            });
          }
        }
      }
    }
    setConflicts(foundConflicts);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Plant Safety & Permit to Work Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time authorization, expiry surveillance, and hazardous work oversight
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchPermits()}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Refresh permits"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-orange-600" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            href="/permits/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all hover:shadow"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Issue New Permit</span>
          </Link>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Active Now */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              Active Right Now
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {metrics.active}
            </div>
          </div>
        </div>

        {/* Card 2: Expiring in 2h (Crucial spec requirement!) */}
        <div
          className={`p-4 rounded-xl border shadow-sm flex items-center gap-3 transition-colors ${
            metrics.expiringSoon > 0
              ? "bg-amber-50 border-amber-300 animate-pulse-subtle"
              : "bg-white border-slate-200"
          }`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
              metrics.expiringSoon > 0
                ? "bg-amber-500 text-white border-amber-600 animate-bounce"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              Expiring in 2 Hours
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {metrics.expiringSoon}
            </div>
          </div>
        </div>

        {/* Card 3: Pending My Approval */}
        <div
          onClick={() => setMyApprovalsOnly(!myApprovalsOnly)}
          className={`cursor-pointer p-4 rounded-xl border shadow-sm flex items-center gap-3 transition-all ${
            myApprovalsOnly
              ? "bg-blue-50 border-blue-500 ring-2 ring-blue-300"
              : "bg-white border-slate-200 hover:border-blue-300"
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1">
              <span>My Approvals</span>
              {myApprovalsOnly && <span className="text-[10px] text-blue-600 font-extrabold">(Active)</span>}
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {metrics.pendingMyApproval}
            </div>
          </div>
        </div>

        {/* Card 4: Suspended / Alerts */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
              metrics.suspended > 0
                ? "bg-red-50 text-red-600 border-red-200"
                : "bg-slate-50 text-slate-400 border-slate-200"
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              Suspended (Hold)
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {metrics.suspended}
            </div>
          </div>
        </div>
      </div>

      {/* Safety Conflict Banner */}
      <ConflictAlertBanner conflicts={conflicts} />

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Permit # (e.g. PTW-HW), title, equipment tag, or contractor..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
            />
          </form>

          {/* "My approvals pending" toggle */}
          <button
            type="button"
            onClick={() => setMyApprovalsOnly(!myApprovalsOnly)}
            className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 shrink-0 ${
              myApprovalsOnly
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>My Approvals Pending ({metrics.pendingMyApproval})</span>
          </button>
        </div>

        {/* Dropdowns row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE (In Work)</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved (Ready)</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="CLOSED">Closed (Handed back)</option>
              <option value="CLOSED_VERIFIED">Closed & Verified</option>
              <option value="REJECTED">Rejected</option>
              <option value="EXPIRED">Expired</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Permit Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
            >
              <option value="ALL">All Types</option>
              <option value="HOT_WORK">🔥 Hot Work</option>
              <option value="CONFINED_SPACE">🛡️ Confined Space</option>
              <option value="WORKING_AT_HEIGHT">🪜 Working at Height</option>
              <option value="ELECTRICAL_LOTO">⚡ Electrical (LOTO)</option>
              <option value="EXCAVATION">🚜 Excavation</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Plant
            </label>
            <select
              value={plantFilter}
              onChange={(e) => {
                setPlantFilter(e.target.value);
                setAreaFilter("ALL");
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
            >
              <option value="ALL">All Plants</option>
              {masterData.plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Plant Area
            </label>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
            >
              <option value="ALL">All Areas</option>
              {masterData.areas
                .filter((a) => plantFilter === "ALL" || a.plantId === plantFilter)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Permits List Table / Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-600" />
            <p className="text-xs">Loading safety permits from database...</p>
          </div>
        ) : permits.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No safety permits match your filters</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your status, type, or area filter, or create a new permit.
            </p>
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setTypeFilter("ALL");
                setPlantFilter("ALL");
                setAreaFilter("ALL");
                setSearchQuery("");
                setMyApprovalsOnly(false);
              }}
              className="px-3 py-1.5 rounded bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {permits.map((permit) => {
              const now = new Date();
              const end = new Date(permit.plannedEndTime);
              const isExpiringSoon =
                permit.status === "ACTIVE" &&
                end > now &&
                end.getTime() - now.getTime() <= 2 * 3600000;

              return (
                <div
                  key={permit.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left Column: Number, Type, Title, Location */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/permits/${permit.id}`}
                        className="font-mono font-bold text-sm text-blue-700 hover:text-blue-900 hover:underline"
                      >
                        {permit.permitNumber}
                      </Link>

                      <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        {permit.type.replace("_", " ")}
                      </span>

                      <StatusBadge status={permit.status} size="sm" isExpiringSoon={isExpiringSoon} />
                    </div>

                    <Link
                      href={`/permits/${permit.id}`}
                      className="block font-bold text-slate-900 text-sm sm:text-base hover:text-orange-600 transition-colors truncate"
                    >
                      {permit.title}
                    </Link>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {permit.plant?.name} • {permit.area?.name}
                      </span>

                      {permit.equipment && (
                        <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                          Tag: {permit.equipment.tagNumber}
                        </span>
                      )}

                      <span>
                        Contractor: <strong className="text-slate-700">{permit.contractorName}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Middle/Right: Validity Window & Countdown Timer */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 shrink-0">
                    {permit.status === "ACTIVE" && (
                      <CountdownTimer
                        plannedEndTime={permit.plannedEndTime}
                        status={permit.status}
                        onExpire={() => fetchPermits()}
                      />
                    )}

                    <div className="text-right text-xs">
                      <div className="text-[11px] text-slate-400 uppercase font-bold">
                        Validity Window
                      </div>
                      <div className="font-mono text-slate-700 text-xs">
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

                    <Link
                      href={`/permits/${permit.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
