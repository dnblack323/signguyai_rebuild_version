import React from "react";
import {
  CalendarDays,
  Calculator,
  CarFront,
  CheckSquare,
  FileCheck2,
  FilePlus2,
  FileText,
  FolderOpen,
  Mail,
  ReceiptText,
  Send,
  ShoppingBag,
  Stethoscope,
  Upload,
  UserPlus,
  UserRound,
  WandSparkles,
} from "lucide-react";

const dashboardGroups = [
  {
    label: "Create",
    actions: [
      ["New Order", ShoppingBag, "operations", "orders"],
      ["New Quote", FilePlus2, "operations", "quotes"],
      ["New Customer", UserPlus, "operations", "customers"],
      ["Calculator", Calculator, "tools", "calculators"],
    ],
  },
  {
    label: "Customer",
    actions: [
      ["Send Proof", Send, "operations", "asset-library"],
      ["Request Approval", FileCheck2, "operations", "asset-library"],
      ["Send Document", FileText, "operations", "asset-library"],
      ["New Invoice", ReceiptText, "business-management", "billing"],
    ],
  },
  {
    label: "Workflow",
    actions: [
      ["Send Message", Mail, "team", "messaging"],
      ["Production Tracking", CheckSquare, "team", "production-tracking"],
      ["Schedule Install", CalendarDays, "operations", "production"],
      ["Team Schedule", CalendarDays, "team", "team-schedule"],
    ],
  },
];

const moduleGroups = [
  {
    label: "Actions",
    actions: [
      ["New Record", FilePlus2],
      ["Send", Send],
      ["New Task", CheckSquare],
      ["Schedule", CalendarDays],
    ],
  },
];

const wrapGroups = [
  {
    label: "Wrap Projects",
    actions: [
      ["New Wrap Project", CarFront],
      ["Projects", FolderOpen],
      ["Customer Portal", UserRound],
    ],
  },
  {
    label: "Design",
    actions: [
      ["Generate Concepts", WandSparkles],
      ["Upload Files", Upload],
      ["Work Order", FileText],
    ],
  },
  {
    label: "Production",
    actions: [
      ["Schedule Install", CalendarDays],
      ["Diagnostics", Stethoscope],
    ],
  },
];

export function AppRibbon({ isDashboard, module, onNavigate, onAction }) {
  const groups = module === "wraps" ? wrapGroups : isDashboard ? dashboardGroups : moduleGroups;

  return (
    <section className="app-ribbon" aria-label="Page actions">
      <div className="ribbon-scroll">
        {groups.map((group, groupIndex) => (
          <div className="ribbon-section" key={group.label}>
            {groupIndex > 0 && <span className="ribbon-divider" />}
            <div className="ribbon-group">
              <div className="ribbon-actions">
                {group.actions.map(([label, Icon, targetWorkspace, targetModule]) => (
                  <button
                    className="ribbon-button"
                    key={label}
                    onClick={() => targetWorkspace ? onNavigate(targetWorkspace, targetModule) : onAction(module === "wraps" ? label : `${label} selected`)}
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <span className="ribbon-group-label">{group.label}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
