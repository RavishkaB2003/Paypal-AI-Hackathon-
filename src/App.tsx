import { useState } from 'react';
import { Plus } from 'lucide-react';
import { type TabType } from './shared';
import { TopNavbar } from './components/layout/TopNavbar';
import { LeftIconRail } from './components/layout/LeftIconRail';
import { TotalBalanceCard } from './components/dashboard/TotalBalanceCard';
import { TransactionsOverviewCard } from './components/dashboard/TransactionOverviewCard';
import { YourCardsCard } from './components/dashboard/YourCardsCard';
import { ActiveMilestonesCard } from './components/dashboard/ActiveMilestonesCard';
import { ExpensesDonutCard } from './components/dashboard/ExpensesDonutCard';
import { RecentTransactionsCard } from './components/dashboard/RecentTransactionsCard';
import { InvoicesView } from './components/views/InvoicesView';
import { SmartScanView } from './components/views/SmartScanView';
import { MilestonesView } from './components/views/MilestonesView';
import { ProtectionView } from './components/views/ProtectionView';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');

  return (
    <div className="min-h-screen bg-[#141418] text-white flex flex-col font-sans">
      {/* Top Navbar */}
      <TopNavbar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Body with Floating Icon Rail + Bento Workspace */}
      <div className="flex-1 w-full flex max-w-[1600px] mx-auto">
        {/* Floating Capsule Icon Rail on the Far Left */}
        <LeftIconRail activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Dynamic Tab Content Area */}
        <main className="flex-1 px-6 md:px-8 py-6 flex flex-col">
          {/* Header Row: Title & "+ Add widget" Action */}
          <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
                {activeTab === 'OVERVIEW' && 'Dashboard'}
                {activeTab === 'INVOICES' && 'Invoices'}
                {activeTab === 'SMART_SCAN' && 'Receipt & Document Scanner'}
                {activeTab === 'MILESTONES' && 'Project Milestones'}
                {activeTab === 'PROTECTION' && 'Disputes & Protection'}
              </h1>
              <p className="text-xs md:text-sm text-[#8E8EA0] mt-1">
                {activeTab === 'OVERVIEW' && 'Manage your payments and transactions in one click'}
                {activeTab === 'INVOICES' && 'Create, send, and track client invoices and payment splits'}
                {activeTab === 'SMART_SCAN' && 'Upload receipts, bills, or delivery slips to auto-fill payment details'}
                {activeTab === 'MILESTONES' && 'Break client projects into payment steps and release funds as work gets approved'}
                {activeTab === 'PROTECTION' && 'Manage buyer claims, delivery records, and PayPal dispute cases'}
              </p>
            </div>

            <button
              onClick={() => alert('Smart Workspace Assistant will be connected in Micro-Step 3.2!')}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1E1E26] hover:bg-[#2F2C44] text-white text-xs md:text-sm font-medium rounded-full border border-white/5 hover:border-white/10 transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#8B7CFF]" />
              <span>Add widget</span>
            </button>
          </div>

          {/* Active Tab Container: All 5 Dedicated Workflows */}
          <div className="flex-1">
            {/* Tab 1: Overview Finity Bento Grid */}
            {activeTab === 'OVERVIEW' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <TotalBalanceCard />
                <TransactionsOverviewCard />
                <YourCardsCard />
                <ActiveMilestonesCard />
                <ExpensesDonutCard />
                <RecentTransactionsCard />
              </div>
            )}

            {/* Tab 2: Invoices AG Grid View */}
            {activeTab === 'INVOICES' && <InvoicesView />}

            {/* Tab 3: Smart Scan Vision View */}
            {activeTab === 'SMART_SCAN' && <SmartScanView />}

            {/* Tab 4: Milestones Escrow Pipeline View */}
            {activeTab === 'MILESTONES' && <MilestonesView />}

            {/* Tab 5: Payment Protection & Evidence View */}
            {activeTab === 'PROTECTION' && <ProtectionView />}
          </div>
        </main>
      </div>
    </div>
  );
}