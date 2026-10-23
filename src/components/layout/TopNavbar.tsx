import React from 'react';
import { Search, Bell, HelpCircle } from 'lucide-react';
import {  type TabType } from '../../shared/contracts';

interface TopNavbarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

const TABS: { id: TabType; label: string }[] = [
  { id: 'OVERVIEW', label: 'Overview' },
  { id: 'INVOICES', label: 'Invoices' },
  { id: 'SMART_SCAN', label: 'Smart Scan' },
  { id: 'MILESTONES', label: 'Milestones' },
  { id: 'PROTECTION', label: 'Protection' },
];

export const TopNavbar: React.FC<TopNavbarProps> = ({ activeTab, onSelectTab }) => {
  return (
    <header className="w-full flex items-center justify-between py-4 px-6 md:px-8 bg-[#141418] border-b border-white/[0.04]">
      {/* Left: Brand Logo Capsule */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 px-4 py-2 bg-[#1E1E26] rounded-full border border-white/5 shadow-sm">
          <div className="w-3.5 h-3.5 rounded-full bg-[#8B7CFF] shadow-[0_0_12px_rgba(139,124,255,0.4)]" />
          <span className="text-white font-semibold text-sm tracking-tight">PayPulse</span>
        </div>
      </div>
      {/* Center: 5-Tab Hybrid Navigation Pill */}
      <nav className="flex items-center bg-[#1E1E26] p-1.5 rounded-full border border-white/5">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`px-4 py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-[#2F2C44] text-white shadow-sm border border-[#48426D]/50'
                  : 'text-[#8E8EA0] hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
      {/* Right: Utility Icons & User Profile Pill */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1 bg-[#1E1E26] p-1 rounded-full border border-white/5">
          <button 
            aria-label="Search" 
            className="p-2 text-[#8E8EA0] hover:text-white rounded-full hover:bg-white/[0.04] transition cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>
          <button 
            aria-label="Notifications" 
            className="p-2 text-[#8E8EA0] hover:text-white rounded-full hover:bg-white/[0.04] transition cursor-pointer relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#8B7CFF] rounded-full" />
          </button>
          <button 
            aria-label="Help" 
            className="p-2 text-[#8E8EA0] hover:text-white rounded-full hover:bg-white/[0.04] transition cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
        {/* Profile Pill */}
        <div className="flex items-center gap-2.5 pl-2 pr-4 py-1.5 bg-[#1E1E26] rounded-full border border-white/5 cursor-pointer hover:border-white/10 transition">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#8B7CFF] to-[#5CE1E6] flex items-center justify-center text-xs font-bold text-white shadow-sm">
            OS
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-medium text-white leading-tight">Oripio Studio</span>
            <span className="text-[10px] text-[#8E8EA0] leading-tight">oripiostudio@gmail.com</span>
          </div>
        </div>
      </div>
    </header>
  );
};


