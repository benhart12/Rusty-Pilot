// ============================================================
// RustyPilot Refresh — Tabs Component
//
// Accessible tab bar. Implements the ARIA tabs pattern:
//   role="tablist" > role="tab" + aria-selected
//   Left/Right arrow keys move focus between tabs.
//   Enter/Space selects the focused tab.
//
// Usage:
//   const [active, setActive] = useState("systems");
//
//   <Tabs
//     tabs={[
//       { id: "systems", label: "Systems" },
//       { id: "procedures", label: "Procedures" },
//       { id: "emergency", label: "Emergency" },
//     ]}
//     activeId={active}
//     onChange={setActive}
//   />
//
//   {active === "systems" && <SystemsPanel />}
// ============================================================

"use client";

import { useRef, KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface TabItem {
  id: string;
  label: string;
  /** Optionally disable a specific tab */
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  /** Additional classes on the tablist container */
  className?: string;
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export default function Tabs({ tabs, activeId, onChange, className }: TabsProps) {
  // Keep refs to each tab button so we can programmatically move focus
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = tabs.findIndex((t) => t.id === activeId);

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let targetIndex: number | null = null;

    if (e.key === "ArrowRight") {
      // Move to the next enabled tab, wrapping around
      let next = (index + 1) % tabs.length;
      while (tabs[next].disabled && next !== index) {
        next = (next + 1) % tabs.length;
      }
      targetIndex = next;
    }

    if (e.key === "ArrowLeft") {
      // Move to the previous enabled tab, wrapping around
      let prev = (index - 1 + tabs.length) % tabs.length;
      while (tabs[prev].disabled && prev !== index) {
        prev = (prev - 1 + tabs.length) % tabs.length;
      }
      targetIndex = prev;
    }

    if (e.key === "Home") {
      // Jump to first enabled tab
      targetIndex = tabs.findIndex((t) => !t.disabled);
    }

    if (e.key === "End") {
      // Jump to last enabled tab
      const lastEnabled = [...tabs].reverse().findIndex((t) => !t.disabled);
      targetIndex = lastEnabled !== -1 ? tabs.length - 1 - lastEnabled : null;
    }

    if (targetIndex !== null && targetIndex !== index) {
      e.preventDefault();
      tabRefs.current[targetIndex]?.focus();
      // Select on focus (automatic activation pattern — preferred for simple tab UIs)
      if (!tabs[targetIndex].disabled) {
        onChange(tabs[targetIndex].id);
      }
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Section tabs"
      className={cn(
        "flex items-end gap-0 border-b border-slate-200",
        className
      )}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeId;
        const isDisabled = tab.disabled ?? false;

        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            // tabIndex follows the roving tabindex pattern:
            // only the active tab is in the natural tab order.
            // Arrow keys handle intra-tab navigation.
            tabIndex={isActive ? 0 : -1}
            ref={(el) => { tabRefs.current[index] = el; }}
            onClick={() => !isDisabled && onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              // Base
              "relative px-4 py-2.5 text-sm font-medium",
              "select-none whitespace-nowrap",
              "transition-colors duration-150",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-0",
              "rounded-t-md",
              // Active state — bottom border as indicator
              isActive && [
                "text-sky-700",
                // The active underline is drawn with a pseudo-border trick:
                // a bottom border on the button that sits flush over the tablist border
                "border-b-2 border-b-sky-600",
                "mb-[-1px]", // pull down 1px to cover the tablist bottom border
              ],
              // Inactive
              !isActive && !isDisabled && "text-slate-500 hover:text-slate-800 hover:bg-slate-50",
              // Disabled
              isDisabled && "text-slate-300 cursor-not-allowed",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}