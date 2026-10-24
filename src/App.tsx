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
                {activeTab === 'INVOICES' && 'Invoices & Split Settlements'}
                {activeTab === 'SMART_SCAN' && 'Smart Scan & Document Proofs'}
                {activeTab === 'MILESTONES' && 'Milestone Escrow Pipelines'}
                {activeTab === 'PROTECTION' && 'Payment Protection & Evidence'}
              </h1>
              <p className="text-xs md:text-sm text-[#8E8EA0] mt-1">
                {activeTab === 'OVERVIEW' && 'Manage your payments and transactions in one click'}
                {activeTab === 'INVOICES' && 'Issue, track, and collect client invoices with automated escrow splits'}
                {activeTab === 'SMART_SCAN' && 'Upload receipts and invoices to automatically extract data and seal cryptographic proof'}
                {activeTab === 'MILESTONES' && 'Protect delivery milestones with structured 30/40/30 release tranches'}
                {activeTab === 'PROTECTION' && 'Shield your business with cryptographic evidence bundles submitted to PayPal Resolution'}
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

          {/* Active Tab Container: Full 6-Card Finity Bento Grid */}
          <div className="flex-1">
            {activeTab === 'OVERVIEW' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Column 1 - Top: Total Balance */}
                <TotalBalanceCard />

                {/* Column 2 - Top: Transactions Overview (AG Charts v14) */}
                <TransactionsOverviewCard />

                {/* Column 3 - Top: Your Cards & Limits */}
                <YourCardsCard />

                {/* Column 1 - Bottom: Active Milestones */}
                <ActiveMilestonesCard />

                {/* Column 2 - Bottom: All Expenses (AG Charts v14 Donut) */}
                <ExpensesDonutCard />

                {/* Column 3 - Bottom: Recent Transactions */}
                <RecentTransactionsCard />
              </div>
            )}

            {activeTab !== 'OVERVIEW' && (
              <div className="bg-[#1E1E26] rounded-[24px] p-[32px] border border-white/5 min-h-[400px] flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-12 h-12 rounded-full bg-[#2F2C44] flex items-center justify-center text-[#8B7CFF] mb-3">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  {activeTab} Workspace
                </h3>
                <p className="text-xs text-[#8E8EA0] max-w-md">
                  This dedicated workspace will be populated in upcoming micro-steps with AG Grid, Multimodal Vision dropzones, or PayPal Protection shields.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}