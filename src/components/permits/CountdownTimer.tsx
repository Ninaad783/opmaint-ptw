"use client";

import React, { useEffect, useState } from "react";
import { Clock, AlertTriangle, AlertCircle } from "lucide-react";

interface CountdownTimerProps {
  plannedEndTime: string | Date;
  status: string;
  onExpire?: () => void;
}

export function CountdownTimer({ plannedEndTime, status, onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
    isExpired: boolean;
  }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalMs: 0,
    isExpired: false,
  });

  useEffect(() => {
    const calculateTime = () => {
      const target = new Date(plannedEndTime).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalMs: 0,
          isExpired: true,
        });
        if (onExpire) onExpire();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        hours,
        minutes,
        seconds,
        totalMs: diff,
        isExpired: false,
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [plannedEndTime, onExpire]);

  if (status !== "ACTIVE" && status !== "SUSPENDED") {
    return null;
  }

  if (timeLeft.isExpired) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-100 border border-red-300 text-red-900 font-mono text-xs font-bold">
        <AlertCircle className="w-4 h-4 text-red-600 animate-bounce" />
        <span>VALIDITY LAPSED (EXPIRED)</span>
      </div>
    );
  }

  // Under 2 hours = Expiring Soon!
  const isExpiringSoon = timeLeft.totalMs <= 2 * 60 * 60 * 1000;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs font-semibold shadow-sm transition-all ${
        isExpiringSoon
          ? "bg-amber-100 border-amber-400 text-amber-950 animate-pulse"
          : "bg-slate-100 border-slate-300 text-slate-800"
      }`}
    >
      <Clock className={`w-4 h-4 ${isExpiringSoon ? "text-amber-700" : "text-slate-600"}`} />
      <div>
        <span className="text-[10px] uppercase font-bold tracking-wider block leading-none text-slate-500">
          {isExpiringSoon ? "EXPIRING SOON" : "TIME REMAINING"}
        </span>
        <span className="text-sm font-extrabold tracking-tight">
          {String(timeLeft.hours).padStart(2, "0")}h :{" "}
          {String(timeLeft.minutes).padStart(2, "0")}m :{" "}
          {String(timeLeft.seconds).padStart(2, "0")}s
        </span>
      </div>
    </div>
  );
}
