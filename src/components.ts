import { Component } from "./dsl";
import { watch, type Ref } from "./state";

/**
 * A reusable stats card component
 */
export function StatsCard(config: {
  count: Ref<number>;
  label: string;
  gradient: string;
  textColor: string;
}) {
  return Component((ui) => {
    ui.Div({ className: `bg-gradient-to-br ${config.gradient} rounded-xl p-4 text-center` }, (ui) => {
      ui.Text({
        value: config.count,
        formatter: (v) => String(v),
        className: `text-3xl font-bold ${config.textColor}`
      })
      ui.Text({
        value: config.label,
        className: `text-sm ${config.textColor} font-medium`
      })
    })
  });
}

/**
 * Filter buttons component for selecting different views
 */
export function FilterButtons<T extends string>(config: {
  current: Ref<T>;
  filters: readonly T[];
  onChange: (filter: T) => void;
}) {
  return Component((ui) => {
    ui.Div({ className: "flex gap-2" }, (ui) => {
      config.filters.forEach(filterType => {
        ui.Button({
          text: filterType.charAt(0).toUpperCase() + filterType.slice(1),
          className: watch(config.current, (current) =>
            current === filterType
              ? "px-4 py-2 bg-purple-600 text-white rounded-lg font-medium transition-all"
              : "px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all"
          ) as Ref<string>,
          on: { click: () => config.onChange(filterType) }
        })
      })
    })
  });
}

/**
 * Empty state component with different messages
 */
export function EmptyState(message: string) {
  return Component((ui) => {
    ui.Div({ className: "text-center py-16" }, (ui) => {
      ui.Text({
        value: message,
        className: "text-2xl text-gray-400 font-medium"
      })
    })
  });
}
