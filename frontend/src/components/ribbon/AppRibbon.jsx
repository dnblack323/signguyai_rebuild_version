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
      ["Pricing Calc", Calculator, "business", "pricing-calculator"],
    ],
  },
  {
    label: "Customer",
    actions: [
      ["Send Proof", Send, "operations", "approvals"],
      ["Request Approval", FileCheck2, "operations", "approvals"],
      ["Send Document", FileText, "operations", "artwork"],
      ["New Invoice", ReceiptText, "business", "invoices"],
    ],
  },
  {
    label: "Workflow",
    actions: [
      ["Send Email", Mail, "productivity", "messages"],
      ["New Task", CheckSquare, "productivity", "tasks"],
      ["Schedule Install", CalendarDays, "operations", "production"],
      ["Open Calendar", CalendarDays, "productivity", "calendar"],
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
