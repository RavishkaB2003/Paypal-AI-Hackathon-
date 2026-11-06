import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  Check,
  RotateCcw,
  LogOut,
  Save,
  Sparkles,
} from 'lucide-react';
import {
  useAccountSettings,
  useUpdateSettings,
  usePayPalStatus,
  useResetWorkspaceDemo,
} from '../../api/hooks';

interface SettingsViewProps {
  onNotify?: (msg: string) => void;
  onSignOut?: () => void;
}

const ALL_BENTO_WIDGETS = [
  { id: 'BALANCE', label: 'Total Balance & Wallet' },
  { id: 'CASHFLOW', label: 'Transactions Overview (Spline Chart)' },
  { id: 'CARDS', label: 'Your Cards & Daily Limit' },
  { id: 'MILESTONES', label: 'Active Milestones Progress' },
  { id: 'EXPENSES', label: 'All Expenses Breakdown (Donut)' },
  { id: 'TRANSACTIONS', label: 'Recent Transactions Feed' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  onNotify,
  onSignOut,
}) => {
  const { data: settings } = useAccountSettings();
  const { data: paypalStatus } = usePayPalStatus();
  const updateSettingsMutation = useUpdateSettings();
  const resetDemoMutation = useResetWorkspaceDemo();

  const [businessName, setBusinessName] = useState('Oripio Studio');
  const [email, setEmail] = useState('oripiostudio@gmail.com');
  const [initials, setInitials] = useState('OS');
  const [currency, setCurrency] = useState('USD');
  const [autoDefenseEnabled, setAutoDefenseEnabled] = useState(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [defaultEscrowSplit, setDefaultEscrowSplit] = useState('30/40/30');
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>([
    'BALANCE',
    'CASHFLOW',
    'CARDS',
    'MILESTONES',
    'EXPENSES',
    'TRANSACTIONS',
  ]);

  useEffect(() => {
    if (settings) {
      setBusinessName(settings.businessName);
      setEmail(settings.email);
      setInitials(settings.initials);
      setCurrency(settings.currency);
      setAutoDefenseEnabled(settings.autoDefenseEnabled);
      setEmailAlertsEnabled(settings.emailAlertsEnabled);
      setDefaultEscrowSplit(settings.defaultEscrowSplit);
      setVisibleWidgets(settings.visibleWidgets);
    }
  }, [settings]);

  const handleToggleWidget = (widgetId: string) => {
    setVisibleWidgets((prev) =>
      prev.includes(widgetId)
        ? prev.length > 1
          ? prev.filter((id) => id !== widgetId)
          : prev
        : [...prev, widgetId]
    );
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(
      {
        businessName: businessName.trim(),
        email: email.trim(),
        initials: initials.trim().toUpperCase().slice(0, 2),
        currency,
        autoDefenseEnabled,
        emailAlertsEnabled,
        defaultEscrowSplit,
        visibleWidgets,
      },
      {
        onSuccess: () => {
          onNotify?.('Merchant profile & workspace settings saved to database!');
        },
      }
    );
  };

  const handleResetDemo = () => {
    resetDemoMutation.mutate(undefined, {
      onSuccess: () => {
        onNotify?.('All workspace database tables reset to initial seed state.');
      },
    });
  };

  return (
    <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Merchant Profile & Branding (6 cols) */}
      <div className="lg:col-span-6 bg-[#1E1E26] rounded-[24px] p-7 border border-white/5 shadow-sm flex flex-col justify-between gap-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <div className="w-10 h-10 rounded-2xl bg-[#8B7CFF]/15 flex items-center justify-center text-[#8B7CFF]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Merchant Profile & Account</h2>
              <p className="text-xs text-[#8E8EA0]">
                Updates your profile pill and default invoice sender details across PayPulse
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                Business / Studio Name
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#141418] rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-[#8B7CFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                Avatar Initials
              </label>
              <input
                type="text"
                maxLength={2}
                required
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 bg-[#141418] rounded-xl border border-white/10 text-xs font-bold text-white uppercase focus:outline-none focus:border-[#8B7CFF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                Merchant Billing Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#141418] rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-[#8B7CFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                Primary Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#141418] rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-[#8B7CFF]"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          {/* Overview Bento Widget Visibility Toggles */}
          <div className="pt-2">
            <span className="text-xs font-semibold text-white block mb-2">
              Visible Dashboard Bento Widgets
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_BENTO_WIDGETS.map((w) => {
                const isSelected = visibleWidgets.includes(w.id);
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleToggleWidget(w.id)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#141418] border-[#8B7CFF]/40 text-white'
                        : 'bg-[#141418]/40 border-white/5 text-[#8E8EA0]'
                    }`}
                  >
                    <span className="truncate pr-2">{w.label}</span>
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-[#8B7CFF] text-white' : 'bg-[#262630]'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (onSignOut) {
                onSignOut();
              } else {
                window.dispatchEvent(new CustomEvent('paypulse:sign-out'));
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#262630] hover:bg-[#F472B6]/15 text-[#F472B6] text-xs font-medium border border-white/5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock Session / Sign Out</span>
          </button>

          <button
            type="submit"
            disabled={updateSettingsMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white text-xs font-semibold transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Right Column: Protection Rules & Workspace Data Controls (6 cols) */}
      <div className="lg:col-span-6 flex flex-col gap-6">
        <div className="bg-[#1E1E26] rounded-[24px] p-7 border border-white/5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <div className="w-10 h-10 rounded-2xl bg-[#34D399]/15 flex items-center justify-center text-[#34D399]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Autonomous Protection & Escrow Rules
              </h2>
              <p className="text-xs text-[#8E8EA0]">
                Configure how PayPulse handles buyer claims and milestone payment splits
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAutoDefenseEnabled(!autoDefenseEnabled)}
            className="w-full p-4 rounded-2xl bg-[#141418] border border-white/5 flex items-center justify-between text-left cursor-pointer hover:border-white/15 transition"
          >
            <div>
              <p className="text-xs font-semibold text-white">
                Autonomous Dispute Auto-Defender
              </p>
              <p className="text-[11px] text-[#8E8EA0] mt-0.5">
                Automatically cross-reference open claims with synced carrier waybills
              </p>
            </div>
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                autoDefenseEnabled
                  ? 'bg-[#34D399] border-[#34D399] text-black'
                  : 'bg-[#262630] border-white/15 text-transparent'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setEmailAlertsEnabled(!emailAlertsEnabled)}
            className="w-full p-4 rounded-2xl bg-[#141418] border border-white/5 flex items-center justify-between text-left cursor-pointer hover:border-white/15 transition"
          >
            <div>
              <p className="text-xs font-semibold text-white">
                Real-Time Milestone & Settlement Alerts
              </p>
              <p className="text-[11px] text-[#8E8EA0] mt-0.5">
                Notify in the top bar whenever a tranche is released or an invoice settles
              </p>
            </div>
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                emailAlertsEnabled
                  ? 'bg-[#8B7CFF] border-[#8B7CFF] text-white'
                  : 'bg-[#262630] border-white/15 text-transparent'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
            </div>
          </button>

          <div>
            <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
              Default Milestone Split Ratio
            </label>
            <select
              value={defaultEscrowSplit}
              onChange={(e) => setDefaultEscrowSplit(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#141418] rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-[#8B7CFF]"
            >
              <option value="30/40/30">30% Kickoff / 40% Midpoint / 30% Final Handoff (Recommended)</option>
              <option value="50/25/25">50% Upfront / 25% Review / 25% Delivery</option>
              <option value="20/40/40">20% Discovery / 40% Build / 40% Launch</option>
            </select>
          </div>
        </div>

        {/* PayPal Connection & Demo Reset Card */}
        <div className="bg-[#1E1E26] rounded-[24px] p-7 border border-white/5 shadow-sm flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#FFC439]" />
              <span className="text-sm font-semibold text-white">
                PayPal Gateway & Database Controls
              </span>
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/20 font-medium">
              {paypalStatus?.liveConnected ? 'Connected' : 'Active'}
            </span>
          </div>

          <p className="text-xs text-[#8E8EA0]">
            {paypalStatus?.message ||
              'All balances, invoices, milestones, and disputes are persisted in your local SQLite database.'}
          </p>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-[#8E8EA0]">
              Need a fresh state for testing?
            </span>
            <button
              type="button"
              onClick={handleResetDemo}
              disabled={resetDemoMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#262630] hover:bg-[#2F2C44] text-xs font-medium text-white border border-white/5 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#8B7CFF]" />
              <span>
                {resetDemoMutation.isPending
                  ? 'Resetting Database...'
                  : 'Reset Database to Initial Seed'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};