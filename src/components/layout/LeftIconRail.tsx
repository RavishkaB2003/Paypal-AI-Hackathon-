import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  ScanLine,
  Milestone,
  ShieldCheck,
  Settings,
  LogOut,
} from 'lucide-react';
import { type TabType } from '../../shared';

interface LeftIconRailProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onSignOut?: () => void;
}

export const LeftIconRail: React.FC<LeftIconRailProps> = ({
  activeTab,
  onSelectTab,
  onSignOut,
}) => {
  const navItems: { id: TabType; icon: React.FC<{ className?: string }>; label: string }[] = [
    { id: 'OVERVIEW', icon: LayoutDashboard, label: 'Overview' },
    { id: 'INVOICES', icon: Receipt, label: 'Invoices' },
    { id: 'SMART_SCAN', icon: ScanLine, label: 'Smart Scan' },
    { id: 'MILESTONES', icon: Milestone, label: 'Milestones' },
    { id: 'PROTECTION', icon: ShieldCheck, label: 'Protection' },
  ];

  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut();
    } else {
      window.dispatchEvent(new CustomEvent('paypulse:sign-out'));
    }
  };

  return (
    <aside className="hidden md:flex flex-col items-center justify-between w-16 py-6 bg-[#1E1E26] rounded-[32px] border border-white/5 shadow-xl my-6 ml-6 h-[calc(100vh-120px)] sticky top-6 shrink-0">
      {/* Top Nav Items */}
      <div className="flex flex-col items-center gap-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={item.label}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-[#8B7CFF] text-white shadow-[0_0_16px_rgba(139,124,255,0.4)]'
                  : 'text-[#8E8EA0] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>

      {/* Bottom Utility Items: Settings & Sign Out */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => onSelectTab('SETTINGS')}
          title="Workspace Settings"
          aria-label="Workspace Settings"
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
            activeTab === 'SETTINGS'
              ? 'bg-[#8B7CFF] text-white shadow-[0_0_16px_rgba(139,124,255,0.4)]'
              : 'text-[#8E8EA0] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Settings className="w-5 h-5" />
        </button>
        <button
          onClick={handleSignOut}
          title="Lock Session / Sign Out"
          aria-label="Sign Out"
          className="w-10 h-10 rounded-full flex items-center justify-center text-[#8E8EA0] hover:text-[#F472B6] hover:bg-[#F472B6]/10 transition cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
};