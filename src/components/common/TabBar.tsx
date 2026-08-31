import React from 'react';
import { PieChart, TrendingUp, History, Settings2 } from 'lucide-react';

export type TabType = 'portfolio' | 'markets' | 'history' | 'settings';

interface TabBarProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  openPositionsCount: number;
}

export const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  onChangeTab,
  openPositionsCount,
}) => {
  const tabs = [
    {
      id: 'portfolio' as TabType,
      label: 'Portafolio',
      icon: PieChart,
      badge: openPositionsCount > 0 ? openPositionsCount : null,
    },
    {
      id: 'markets' as TabType,
      label: 'Mercados',
      icon: TrendingUp,
    },
    {
      id: 'history' as TabType,
      label: 'Historial',
      icon: History,
    },
    {
      id: 'settings' as TabType,
      label: 'Ajustes',
      icon: Settings2,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 w-full pb-safe ios-glass-bar border-t border-black/5 dark:border-white/10 transition-colors duration-200">
      <div className="max-w-md mx-auto h-14 flex items-center justify-around px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`flex-1 py-1.5 flex flex-col items-center justify-center relative ios-active transition-colors ${
                isActive
                  ? 'text-ios-blue dark:text-ios-blue font-semibold'
                  : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 font-normal'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-150 ${isActive ? 'scale-110' : ''}`} />
                {tab.badge !== null && tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-ios-blue text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
