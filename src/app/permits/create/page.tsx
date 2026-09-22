"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PermitType } from "@/lib/permit-types/types";
import { PERMIT_TYPE_REGISTRY, getPermitTypeDefinition } from "@/lib/permit-types/registry";
import { DynamicTypeFields } from "@/components/permits/DynamicTypeFields";
import { ConflictAlertBanner } from "@/components/permits/ConflictAlertBanner";
import { SafetyConflict } from "@/lib/safety/conflicts";
import {
  Flame,
  ShieldAlert,
  ArrowUpCircle,
  Zap,
  Tractor,
  ArrowRight,
  ArrowLeft,
  Save,
  Send,
  Building,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export default function CreatePermitPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Master Data
  const [plants, setPlants] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);

  // Form State
  const [permitType, setPermitType] = useState<PermitType>("HOT_WORK");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [plantId, setPlantId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [contractorName, setContractorName] = useState("");
  const [crewCount, setCrewCount] = useState(2);
  const [supervisorName, setSupervisorName] = useState(user?.name || "Rajesh Kumar");
  const [supervisorContact, setSupervisorContact] = useState("+91 98401 23456");

  // Dates (default start now + 1h, end now + 5h)
  const defaultStart = new Date(Date.now() + 3600000).toISOString().slice(0, 16);
  const defaultEnd = new Date(Date.now() + 18000000).toISOString().slice(0, 16);
  const [plannedStartTime, setPlannedStartTime] = useState(defaultStart);
  const [plannedEndTime, setPlannedEndTime] = useState(defaultEnd);

  // Hazards & PPE
  const [selectedHazards, setSelectedHazards] = useState<string[]>([]);
  const [selectedPPE, setSelectedPPE] = useState<string[]>([]);
  const [precautionsChecklist, setPrecautionsChecklist] = useState<any[]>([]);

  // Type Specific Data
  const [typeData, setTypeData] = useState<Record<string, any>>({});

  // Safety Conflicts
  const [conflicts, setConflicts] = useState<SafetyConflict[]>([]);

  // Load master data
  useEffect(() => {
    fetch("/api/master-data")
      .then((r) => r.json())
      .then((data) => {
        setPlants(data.plants || []);
        setAreas(data.areas || []);
        setEquipmentList(data.equipment || []);
        if (data.plants?.length > 0) setPlantId(data.plants[0].id);
      })
      .catch((e) => console.error("Error loading master data:", e));
  }, []);

  // Update area when plant changes
  useEffect(() => {
    const availableAreas = areas.filter((a) => a.plantId === plantId);
    if (availableAreas.length > 0) {
      setAreaId(availableAreas[0].id);
    } else {
      setAreaId("");
    }
  }, [plantId, areas]);

  // Update default hazards, PPE, precautions when permit type changes
  useEffect(() => {
    const def = getPermitTypeDefinition(permitType);
    setSelectedHazards(def.defaultHazards.map((h) => h.id));
    setSelectedPPE(def.defaultPPE.filter((p) => p.isMandatory).map((p) => p.id));
    setPrecautionsChecklist(def.precautions.map((p) => ({ ...p, checked: true })));

    // Set initial default values for type fields
    const initialValues: Record<string, any> = {};
    def.fields.forEach((f) => {
      if (f.defaultValue !== undefined) initialValues[f.name] = f.defaultValue;
    });
    setTypeData(initialValues);
  }, [permitType]);

  // Real-time conflict check
  useEffect(() => {
    if (!plantId || !areaId || !plannedStartTime || !plannedEndTime) return;

    fetch("/api/conflicts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: permitType,
        plantId,
        areaId,
        equipmentId: equipmentId || null,
        plannedStartTime,
        plannedEndTime,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.conflicts) setConflicts(data.conflicts);
      })
      .catch((e) => console.error("Conflict check error:", e));
  }, [permitType, plantId, areaId, equipmentId, plannedStartTime, plannedEndTime]);

  const handleTypeDataChange = (name: string, value: any) => {
    setTypeData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveOrSubmit = async (submitDirectly: boolean) => {
    setError(null);
    setLoading(true);

    try {
      if (!title.trim()) throw new Error("Permit Title is required.");
      if (!description.trim()) throw new Error("Work description is required.");
      if (!plantId || !areaId) throw new Error("Plant and Area are required.");
      if (!contractorName.trim()) throw new Error("Contractor name is required.");

      const payload = {
        title,
        description,
        type: permitType,
        plantId,
        areaId,
        equipmentId: equipmentId || undefined,
        contractorName,
        crewCount: Number(crewCount),
        supervisorName,
        supervisorContact,
        plannedStartTime,
        plannedEndTime,
        hazards: selectedHazards,
        ppeRequired: selectedPPE,
        precautionsChecklist,
        typeSpecificData: typeData,
        submitDirectly,
      };

      const res = await fetch("/api/permits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to create permit.");
      }

      router.push(`/permits/${result.permit.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const typeIcons: Record<PermitType, any> = {
    HOT_WORK: Flame,
    CONFINED_SPACE: ShieldAlert,
    WORKING_AT_HEIGHT: ArrowUpCircle,
    ELECTRICAL_LOTO: Zap,
    EXCAVATION: Tractor,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Issue Hazardous Work Permit
          </h1>
          <p className="text-xs text-slate-500">
            Multi-step schema-driven form adapting dynamically to safety specifications
          </p>
        </div>

        <button
          onClick={() => router.push("/permits")}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel
        </button>
      </div>

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
        {[
          { num: 1, label: "Core Scope & Location" },
          { num: 2, label: "Hazards & PPE" },
          { num: 3, label: "Safety Specifications" },
          { num: 4, label: "Precautions & Sign-off" },
        ].map((s) => (
          <div
            key={s.num}
            onClick={() => setStep(s.num)}
            className={`cursor-pointer p-2.5 rounded-lg border transition-all ${
              step === s.num
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : step > s.num
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : "bg-white text-slate-400 border-slate-200"
            }`}
          >
            <div className="font-mono text-[10px] uppercase">Step {s.num}</div>
            <div className="truncate text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-xl text-red-950 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Real-time Conflict Alert */}
      <ConflictAlertBanner conflicts={conflicts} />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* ================= STEP 1: Core Info ================= */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Permit Type Selector */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                1. Select Permit Type:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {Object.values(PERMIT_TYPE_REGISTRY).map((item) => {
                  const Icon = typeIcons[item.type];
                  const isSelected = permitType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setPermitType(item.type)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-24 ${
                        isSelected
                          ? "bg-orange-50 border-orange-500 ring-2 ring-orange-400 text-orange-950 font-bold shadow-sm"
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? "text-orange-600" : "text-slate-400"}`} />
                      <div>
                        <div className="text-xs font-extrabold leading-tight">{item.title}</div>
                        <div className="text-[10px] font-mono opacity-70 uppercase tracking-wider">
                          {item.shortCode}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Permit Title / Job Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Weld Support Bracket onto Piperack Line PR-12"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Detailed Work Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe exact physical activities, equipment involved, tools to be used, and exact work steps..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Location Hierarchy: Plant -> Area -> Equipment */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Plant Facility <span className="text-red-500">*</span>
                </label>
                <select
                  value={plantId}
                  onChange={(e) => setPlantId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  required
                >
                  {plants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Plant Area / Unit <span className="text-red-500">*</span>
                </label>
                <select
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  required
                >
                  {areas
                    .filter((a) => a.plantId === plantId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.code})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Specific Equipment / Asset Tag
                </label>
                <select
                  value={equipmentId}
                  onChange={(e) => setEquipmentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">-- No specific equipment / general area --</option>
                  {equipmentList
                    .filter((eq) => eq.areaId === areaId)
                    .map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.name} ({eq.tagNumber})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Contractor & Crew Details */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t">
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Contractor / Internal Team <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  placeholder="e.g. Apex Industrial Mechanical Services"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Crew Count (Workers)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={crewCount}
                  onChange={(e) => setCrewCount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Supervisor Contact Phone
                </label>
                <input
                  type="text"
                  value={supervisorContact}
                  onChange={(e) => setSupervisorContact(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                />
              </div>
            </div>

            {/* Validity Window (Planned Start and End) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t bg-slate-50 p-4 rounded-xl">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Planned Start Datetime <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={plannedStartTime}
                  onChange={(e) => setPlannedStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                  required
                />
                <p className="text-[10px] text-slate-500">
                  Work cannot go active prior to this time.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Planned End Datetime (Auto-Expiry Deadline) <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={plannedEndTime}
                  onChange={(e) => setPlannedEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                  required
                />
                <p className="text-[10px] text-slate-500">
                  Permit auto-expires immediately once this time passes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: Hazards & PPE ================= */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider mb-2">
                Identified Hazards & Energy Risks
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Select all hazards present at the job site or created by the activity:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {getPermitTypeDefinition(permitType).defaultHazards.map((h) => {
                  const checked = selectedHazards.includes(h.id);
                  return (
                    <label
                      key={h.id}
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        checked
                          ? "bg-amber-50/70 border-amber-400 text-amber-950 font-medium shadow-sm"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedHazards([...selectedHazards, h.id]);
                          else setSelectedHazards(selectedHazards.filter((x) => x !== h.id));
                        }}
                        className="mt-1 w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                      />
                      <div>
                        <div className="text-xs font-bold leading-tight">{h.label}</div>
                        <div className="text-[11px] text-slate-500">{h.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-6 border-t">
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider mb-2">
                Mandatory & Recommended Personal Protective Equipment (PPE)
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Personnel must not access the work zone without donning all checked PPE:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {getPermitTypeDefinition(permitType).defaultPPE.map((p) => {
                  const checked = selectedPPE.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        checked
                          ? "bg-blue-50/70 border-blue-400 text-blue-950 font-medium shadow-sm"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedPPE([...selectedPPE, p.id]);
                          else setSelectedPPE(selectedPPE.filter((x) => x !== p.id));
                        }}
                        className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                          <span>{p.label}</span>
                          {p.isMandatory && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-red-100 text-red-700">
                              Mandatory
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase font-mono">{p.category}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: Type Specific Dynamic Fields ================= */}
        {step === 3 && (
          <div className="space-y-4">
            <DynamicTypeFields
              type={permitType}
              values={typeData}
              onChange={handleTypeDataChange}
              readOnly={false}
            />
          </div>
        )}

        {/* ================= STEP 4: Review, Precautions, & Sign-off ================= */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider mb-2">
                Pre-Job Safety Precautions Checklist
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Confirm all pre-work safety measures have been implemented prior to submitting for Area Owner sign-off:
              </p>

              <div className="space-y-2">
                {precautionsChecklist.map((item, idx) => (
                  <label
                    key={item.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3 cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => {
                        const copy = [...precautionsChecklist];
                        copy[idx].checked = e.target.checked;
                        setPrecautionsChecklist(copy);
                      }}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span className="font-medium text-slate-800">{item.text}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Summary Box */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
              <h4 className="font-extrabold text-slate-900 uppercase">Approval Route Summary:</h4>
              <p className="text-slate-600">
                1. <strong>Area Owner ({areas.find((a) => a.id === areaId)?.name || "Area Lead"})</strong> must verify site isolation.
                <br />
                2. <strong>Plant Safety Officer (EHS)</strong> must verify gas tests, rescue provisions, and grant final authorization.
              </p>
            </div>
          </div>
        )}

        {/* Form Footer Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {/* Save as Draft (Any step!) */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSaveOrSubmit(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Save className="w-4 h-4 text-slate-500" />
              <span>Save Draft</span>
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSaveOrSubmit(true)}
                className="px-6 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-black flex items-center gap-2 transition-all shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? "Submitting..." : "Submit for Approval"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
