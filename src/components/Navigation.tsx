import React from 'react';
import { Home, Dumbbell, Activity, CalendarDays, Settings } from 'lucide-react';

export type TabType = 'home' | 'workout' | 'cardio' | 'history' | 'settings';

interface NavigationProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  hasActiveWorkout: boolean;
  hapticsEnabled?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onChangeTab,
  hasActiveWorkout,
  hapticsEnabled = true,
}) => {
  const tabs = [
    { id: 'home' as TabType, label: 'ホーム', icon: Home, activeColor: 'text-brand-neon' },
    { 
      id: 'workout' as TabType, 
      label: '筋トレ', 
      icon: Dumbbell, 
      activeColor: 'text-brand-neon',
      badge: hasActiveWorkout 
    },
    { id: 'cardio' as TabType, label: '有酸素', icon: Activity, activeColor: 'text-amber-400' },
    { id: 'history' as TabType, label: '履歴', icon: CalendarDays, activeColor: 'text-blue-400' },
    { id: 'settings' as TabType, label: '設定', icon: Settings, activeColor: 'text-slate-200' },
  ];

  const handleTabClick = (tabId: TabType) => {
    // 触感フィードバック (Web Vibration API)
    if (hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(10); } catch (_) {}
    }
    onChangeTab(tabId);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-dark-900/90 backdrop-blur-xl border-t border-dark-800/80 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 active:scale-95 ${
                isActive ? `${tab.activeColor} font-bold` : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-neon rounded-full animate-pulse shadow-sm shadow-brand-neon" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight font-medium">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
