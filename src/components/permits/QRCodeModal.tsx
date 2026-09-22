"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, X, Printer, CheckCircle } from "lucide-react";
import { PermitStatus, PermitType } from "@/lib/permit-types/types";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  permit: {
    id: string;
    permitNumber: string;
    title: string;
    type: PermitType;
    status: PermitStatus;
    plantName?: string;
    areaName?: string;
    plannedStartTime: string | Date;
    plannedEndTime: string | Date;
  };
}

export function QRCodeModal({ isOpen, onClose, permit }: QRCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;

    // Generate link that a mobile walk-around inspector scans
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : "https://opmaint.com";
    const inspectionUrl = `${currentOrigin}/permits/${permit.id}`;

    QRCode.toDataURL(inspectionUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR Code generation error:", err));
  }, [isOpen, permit]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-orange-600" />
            <h3 className="font-bold text-slate-900 text-base">Safety Field Walk-Around QR Code</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center space-y-4">
          <div className="p-4 bg-slate-50 border rounded-lg inline-block shadow-inner">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code for permit ${permit.permitNumber}`}
                className="w-56 h-56 mx-auto"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-sm">
                Generating QR...
              </div>
            )}
          </div>

          <div className="text-left bg-slate-50 p-3.5 rounded-lg border text-xs space-y-1.5">
            <div className="flex justify-between font-mono">
              <span className="text-slate-500">Permit #:</span>
              <span className="font-bold text-slate-900">{permit.permitNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="font-semibold uppercase text-emerald-700">{permit.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Location:</span>
              <span className="text-slate-800 font-medium">{permit.areaName || "Plant Area"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Valid Until:</span>
              <span className="font-mono text-slate-800">
                {new Date(permit.plannedEndTime).toLocaleString()}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Safety officers or plant supervisors on walk-around inspection can scan this QR code with their mobile camera to verify live permit status.
          </p>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handlePrint}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" /> Print Permit Tag
            </button>
            <button
              onClick={onClose}
              className="py-2 px-4 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
