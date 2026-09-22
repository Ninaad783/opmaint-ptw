"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { UserRole } from "@/lib/permit-types/types";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  badgeNumber?: string;
  department?: string;
  assignedAreaId?: string | null;
  assignedAreaName?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  highContrast: boolean;
  toggleHighContrast: () => void;
  switchRole: (role: UserRole) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  highContrast: false,
  toggleHighContrast: () => {},
  switchRole: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [highContrast, setHighContrast] = useState(false);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      }
    } catch (e) {
      console.error("Failed to load user:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const switchRole = async (role: UserRole) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/demo-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error("Role switch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleHighContrast = () => {
    setHighContrast((prev) => !prev);
  };

  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  }, [highContrast]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        highContrast,
        toggleHighContrast,
        switchRole,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
