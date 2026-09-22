import { z } from "zod";

export type PermitType = 
  | "HOT_WORK" 
  | "CONFINED_SPACE" 
  | "WORKING_AT_HEIGHT" 
  | "ELECTRICAL_LOTO" 
  | "EXCAVATION";

export type PermitStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "ACTIVE"
  | "SUSPENDED"
  | "REJECTED"
  | "EXPIRED"
  | "CLOSED"
  | "CLOSED_VERIFIED"
  | "CANCELLED";

export type UserRole = "REQUESTER" | "AREA_OWNER" | "SAFETY_OFFICER" | "ADMIN";

export interface FieldDefinition {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "boolean" | "textarea" | "datetime-local" | "table";
  unit?: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  defaultValue?: any;
  validationRule?: (val: any) => string | null; // return error message if invalid
}

export interface HazardItem {
  id: string;
  label: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface PPEItem {
  id: string;
  label: string;
  category: "HEAD" | "EYES_FACE" | "RESPIRATORY" | "BODY" | "HANDS" | "FEET" | "FALL_PROTECTION";
  isMandatory?: boolean;
}

export interface PrecautionItem {
  id: string;
  text: string;
  defaultChecked?: boolean;
}

export interface PermitTypeDefinition {
  type: PermitType;
  title: string;
  shortCode: string;
  color: string;
  iconName: string;
  description: string;
  highRiskCategory: boolean;
  fields: FieldDefinition[];
  defaultHazards: HazardItem[];
  defaultPPE: PPEItem[];
  precautions: PrecautionItem[];
  zodSchema: z.ZodObject<any>;
}
