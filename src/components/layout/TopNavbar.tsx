import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  HelpCircle,
  CheckCheck,
  Sparkles,
  RotateCcw,
  ArrowUpRight,
  Settings,
} from 'lucide-react';
import { type TabType } from '../../shared/contracts';
import {
  useAccountSettings,
  useNotifications,
  useMarkNotificationsRead,
  useResetWorkspaceDemo,
} from '../../api/hooks';

interface TopNavbarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenSearch?: () => void;
}

const TABS: { id: TabType; label: string }[] = [
  { id: 'OVERVIEW', label: 'Overview' },
  { id: 'INVOICES', label: 'Invoices' },
  { id: 'SMART_SCAN', label: 'Smart Scan' },
  { id: 'MILESTONES', label: 'Milestones' },
  { id: 'PROTECTION', label: 'Protection' },
];

export const TopNavbar: React.FC<TopNavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenSearch,
}) => {
  const { data: settings } = useAccountSettings();
  const { data: notifications = [] } = useNotifications();
  const markReadMutation = useMarkNotificationsRead();
  const resetDemoMutation = useResetWorkspaceDemo();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
        setIsHelpOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchClick = () => {
    setIsNotifOpen(false);
    setIsHelpOpen(false);
    if (onOpenSearch) {
      onOpenSearch();
    } else {
      window.dispatchEvent(new CustomEvent('paypulse:open-search'));
    }
  };

  return (
    <header className="w-full flex items-center justify-between py-4 px-6 md:px-8 bg-[#141418] border-b border-white/[0.04] relative z-40">
      {/* Left: Brand Logo Capsule (Option A — Pulse Shield Monogram) */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onSelectTab('OVERVIEW')}
          className="flex items-center gap-2.5 pl-2.5 pr-4 py-1.5 bg-[#1E1E26] hover:bg-[#262630] rounded-full border border-white/5 hover:border-white/10 shadow-sm transition cursor-pointer group"
          title="PayPulse Home"
        >
          <div className="w-7 h-7 rounded-xl bg-[#262630] border border-white/10 flex items-center justify-center shadow-[0_0_14px_rgba(139,124,255,0.28)] group-hover:shadow-[0_0_18px_rgba(92,225,230,0.35)] transition">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="paypulseShieldGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#8B7CFF" />
                  <stop offset="100%" stopColor="#5CE1E6" />
                </linearGradient>
              </defs>
              <path
                d="M12 2.25L4.5 5.4V11.25C4.5 16.35 7.7 20.95 12 22.25C16.3 20.95 19.5 16.35 19.5 11.25V5.4L12 2.25Z"
                stroke="url(#paypulseShieldGrad)"
                strokeWidth="1.8"
                fill="rgba(139, 124, 255, 0.12)"
              />
              <path
                d="M7.5 12.5H9.6L11 9.5L13 14.5L14.4 11.5H16.5"
                stroke="#5CE1E6"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="6.3" r="1.25" fill="#FFC439" />
            </svg>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-white font-semibold text-sm tracking-tight">PayPulse</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
          </div>
        </button>
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
      <div className="flex items-center gap-2.5" ref={dropdownRef}>
        <div className="flex items-center gap-1 bg-[#1E1E26] p-1 rounded-full border border-white/5 relative">
          {/* 1. Global Search Button */}
          <button
            onClick={handleSearchClick}
            aria-label="Search workspace"
            title="Search invoices, milestones, disputes & actions (Ctrl+K)"
            className="p-2 text-[#8E8EA0] hover:text-white rounded-full hover:bg-white/[0.06] transition cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* 2. Notifications Bell Button */}
          <button
            onClick={() => {
              setIsNotifOpen((prev) => !prev);
              setIsHelpOpen(false);
            }}
            aria-label="Notifications"
            title="Notifications"
            className={`p-2 rounded-full transition cursor-pointer relative ${
              isNotifOpen
                ? 'bg-[#2F2C44] text-white'
                : 'text-[#8E8EA0] hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-1 bg-[#8B7CFF] text-[9px] font-bold text-white rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* 3. Help & Guide Button */}
          <button
            onClick={() => {
              setIsHelpOpen((prev) => !prev);
              setIsNotifOpen(false);
            }}
            aria-label="Help & Shortcuts"
            title="Workspace Guide & Shortcuts"
            className={`p-2 rounded-full transition cursor-pointer ${
              isHelpOpen
                ? 'bg-[#2F2C44] text-white'
                : 'text-[#8E8EA0] hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Notifications Dropdown Popover */}
          {isNotifOpen && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 bg-[#1E1E26] rounded-[20px] border border-white/10 shadow-2xl p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">Activity & Alerts</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8B7CFF]/15 text-[#8B7CFF] font-medium">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markReadMutation.mutate()}
                    className="text-[11px] text-[#8E8EA0] hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-[#34D399]" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-white/5 my-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-[#8E8EA0] py-6 text-center">
                    No notifications yet
                  </p>
                ) : (
                  notifications.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.targetTab);
                        setIsNotifOpen(false);
                      }}
                      className="w-full py-3 px-2 hover:bg-white/[0.03] rounded-xl text-left transition flex items-start justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            item.isRead ? 'bg-white/15' : 'bg-[#8B7CFF]'
                          }`}
                        />
                        <div>
                          <p className="text-xs font-semibold text-white">{item.title}</p>
                          <p className="text-[11px] text-[#8E8EA0] mt-0.5 leading-relaxed">
                            {item.message}
                          </p>
                        </div>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#8E8EA0] shrink-0 mt-0.5" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Help & Quick Guide Popover */}
          {isHelpOpen && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 bg-[#1E1E26] rounded-[20px] border border-white/10 shadow-2xl p-5 z-50 flex flex-col gap-3.5">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#8B7CFF]" />
                  <span className="text-xs font-semibold text-white">PayPulse Quick Guide</span>
                </div>
                <kbd className="px-2 py-0.5 text-[10px] rounded bg-[#141418] text-[#8E8EA0] border border-white/5 font-mono">
                  Ctrl+K
                </kbd>
              </div>

              <div className="flex flex-col gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#141418] border border-white/5">
                  <p className="font-semibold text-white">1. 3-Step Escrow Invoices & Milestones</p>
                  <p className="text-[11px] text-[#8E8EA0] mt-0.5">
                    Split project invoices into 30% / 40% / 30% stages and release tranches as work is approved.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#141418] border border-white/5">
                  <p className="font-semibold text-white">2. Smart Scan Vision AI</p>
                  <p className="text-[11px] text-[#8E8EA0] mt-0.5">
                    Upload receipts or waybills to extract line items and review before creating an invoice.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#141418] border border-white/5">
                  <p className="font-semibold text-white">3. Autonomous Dispute Protection</p>
                  <p className="text-[11px] text-[#8E8EA0] mt-0.5">
                    Auto-defend buyer claims by matching carrier tracking numbers to open disputes.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    onSelectTab('SETTINGS');
                    setIsHelpOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#262630] hover:bg-[#2F2C44] text-xs text-white transition cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-[#8B7CFF]" />
                  <span>Open Settings</span>
                </button>

                <button
                  onClick={() => {
                    resetDemoMutation.mutate();
                    setIsHelpOpen(false);
                  }}
                  disabled={resetDemoMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#141418] hover:bg-[#262630] text-[11px] text-[#8E8EA0] hover:text-white border border-white/5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{resetDemoMutation.isPending ? 'Resetting...' : 'Reset Demo Data'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Profile Pill (Backed by SQLite account_settings) */}
        <button
          onClick={() => onSelectTab('SETTINGS')}
          title="Open Account & Workspace Settings"
          className={`flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-full border cursor-pointer transition ${
            activeTab === 'SETTINGS'
              ? 'bg-[#2F2C44] border-[#8B7CFF]/50'
              : 'bg-[#1E1E26] border-white/5 hover:border-white/15'
          }`}
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#8B7CFF] to-[#5CE1E6] flex items-center justify-center text-xs font-bold text-white shadow-sm">
            {settings?.initials || 'OS'}
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-medium text-white leading-tight">
              {settings?.businessName || 'Oripio Studio'}
            </span>
            <span className="text-[10px] text-[#8E8EA0] leading-tight">
              {settings?.email || 'oripiostudio@gmail.com'}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};