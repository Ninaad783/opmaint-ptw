import React from "react";
import { PermitType, FieldDefinition } from "@/lib/permit-types/types";
import { getPermitTypeDefinition } from "@/lib/permit-types/registry";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

interface DynamicTypeFieldsProps {
  type: PermitType;
  values: Record<string, any>;
  onChange?: (name: string, value: any) => void;
  readOnly?: boolean;
}

export function DynamicTypeFields({
  type,
  values,
  onChange,
  readOnly = false,
}: DynamicTypeFieldsProps) {
  const typeDef = getPermitTypeDefinition(type);

  // If ReadOnly mode: render high-stakes safety inspection panel
  if (readOnly) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-orange-600">
              Type-Specific Safety Verification
            </span>
            <h3 className="font-extrabold text-base text-slate-900">{typeDef.title} Parameters</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-200 text-slate-700">
            {typeDef.shortCode} SPEC
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {typeDef.fields.map((field) => {
            const rawVal = values[field.name];
            let displayVal = rawVal;

            if (field.type === "boolean") {
              displayVal = rawVal ? "YES (Verified & Certified)" : "NO";
            } else if (field.type === "datetime-local" && rawVal) {
              displayVal = new Date(rawVal).toLocaleString();
            } else if (displayVal === undefined || displayVal === null || displayVal === "") {
              displayVal = "N/A";
            }

            // Highlighting gas readings with safety indicators
            const isGasLel = field.name.toLowerCase().includes("lel");
            const isGasO2 = field.name.toLowerCase().includes("o2");
            const isH2s = field.name.toLowerCase().includes("h2s");

            let statusColor = "bg-white border-slate-200 text-slate-900";
            if (isGasLel) {
              statusColor = Number(rawVal) <= 0 ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold" : "bg-red-50 border-red-300 text-red-950 font-bold";
            } else if (isGasO2) {
              const o2 = Number(rawVal);
              statusColor = (o2 >= 19.5 && o2 <= 23.5) ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold" : "bg-red-50 border-red-300 text-red-950 font-bold";
            } else if (isH2s) {
              statusColor = Number(rawVal) <= 0 ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold" : "bg-red-50 border-red-300 text-red-950 font-bold";
            }

            return (
              <div
                key={field.name}
                className={`p-3 rounded-lg border shadow-sm ${statusColor} ${
                  field.type === "textarea" ? "sm:col-span-2 md:col-span-3" : ""
                }`}
              >
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  {field.label}
                </div>
                <div className="text-sm font-semibold flex items-center justify-between">
                  <span className="font-mono text-base">{String(displayVal)}</span>
                  {field.unit && (
                    <span className="text-xs font-mono px-1.5 py-0.5 bg-slate-200/60 rounded text-slate-700">
                      {field.unit}
                    </span>
                  )}
                </div>
                {field.helpText && (
                  <p className="text-[10px] text-slate-500 mt-1 opacity-80">{field.helpText}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Interactive Form Mode
  return (
    <div className="space-y-4">
      <div className="border-b pb-2 mb-4">
        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <span>{typeDef.title} Parameters</span>
          <span className="text-[11px] font-normal text-slate-500">
            (Schema-driven type specific safety checks)
          </span>
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {typeDef.fields.map((field) => {
          const val = values[field.name] !== undefined ? values[field.name] : (field.defaultValue ?? "");

          if (field.type === "select") {
            return (
              <div key={field.name} className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={val}
                  onChange={(e) => onChange && onChange(field.name, e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none shadow-sm"
                  required={field.required}
                >
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {field.helpText && (
                  <p className="text-[11px] text-slate-500">{field.helpText}</p>
                )}
              </div>
            );
          }

          if (field.type === "boolean") {
            return (
              <div
                key={field.name}
                className="md:col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3"
              >
                <input
                  type="checkbox"
                  id={`field-${field.name}`}
                  checked={Boolean(val)}
                  onChange={(e) => onChange && onChange(field.name, e.target.checked)}
                  className="mt-1 w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                />
                <label htmlFor={`field-${field.name}`} className="text-xs cursor-pointer select-none">
                  <span className="font-bold text-slate-900 block">{field.label}</span>
                  {field.helpText && <span className="text-slate-500 text-[11px]">{field.helpText}</span>}
                </label>
              </div>
            );
          }

          if (field.type === "textarea") {
            return (
              <div key={field.name} className="md:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  rows={3}
                  value={val}
                  onChange={(e) => onChange && onChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:outline-none shadow-sm"
                  required={field.required}
                />
                {field.helpText && (
                  <p className="text-[11px] text-slate-500">{field.helpText}</p>
                )}
              </div>
            );
          }

          return (
            <div key={field.name} className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                {field.label} {field.required && <span className="text-red-500">*</span>}
                {field.unit && <span className="text-slate-500 font-normal ml-1">({field.unit})</span>}
              </label>
              <div className="relative">
                <input
                  type={field.type}
                  step={field.type === "number" ? "any" : undefined}
                  value={val}
                  onChange={(e) =>
                    onChange &&
                    onChange(
                      field.name,
                      field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value
                    )
                  }
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:outline-none shadow-sm font-sans"
                  required={field.required}
                />
                {field.unit && (
                  <span className="absolute right-3 top-2 text-xs font-mono text-slate-400 pointer-events-none">
                    {field.unit}
                  </span>
                )}
              </div>
              {field.helpText && (
                <p className="text-[11px] text-slate-500">{field.helpText}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
