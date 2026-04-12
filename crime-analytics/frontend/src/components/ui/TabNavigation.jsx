import { useState } from "react";

export default function TabNavigation({ tabs, activeTab, onTabChange }) {
  return (
    <div className="flex gap-1 bg-white/5 rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === tab.key
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
