import { useState } from 'react';
import { Plus } from 'lucide-react';
import { type TabType } from './shared';
import { TopNavbar } from './components/layout/TopNavbar';
import { LeftIconRail } from './components/layout/LeftIconRail';
import { TotalBalanceCard } from './components/dashboard/TotalBalanceCard';
import { TransactionsOverviewCard } from './components/dashboard/TransactionOverviewCard';
import { ActiveMilestonesCard } from './components/dashboard/ActiveMilestonesCard';
import { ExpensesDonutCard } from './components/dashboard/ExpensesDonutCard';

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

          {/* Active Tab Container: Finity Bento Grid */}
          <div className="flex-1">
            {activeTab === 'OVERVIEW' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* 1. Total Balance Hero Bento Card */}
                <TotalBalanceCard />

                {/* 2. AG Charts Transactions Overview Bento Card (v14) */}
                <TransactionsOverviewCard />

                {/* 3. Placeholder for Your Cards & Limits (Micro-Step 2.3B) */}
                <div className="bg-[#1E1E26] rounded-[24px] p-[28px] border border-white/5 min-h-[260px] flex flex-col justify-between shadow-sm">
                  <span className="text-[#8E8EA0] text-sm font-medium">Your Cards & Limits</span>
                  <p className="text-xs text-[#8E8EA0]">Will be populated with Finity contactless card & daily limit bar in Micro-Step 2.3B</p>
                </div>

                {/* 4. Active Milestones Bento Card */}
                <ActiveMilestonesCard />

                {/* 5. AG Charts All Expenses Donut Bento Card (v14) */}
                <ExpensesDonutCard />

                {/* 6. Placeholder for Recent Transactions (Micro-Step 2.3B) */}
                <div className="bg-[#1E1E26] rounded-[24px] p-[28px] border border-white/5 min-h-[260px] flex flex-col justify-between shadow-sm">
                  <span className="text-[#8E8EA0] text-sm font-medium">Recent Transactions</span>
                  <p className="text-xs text-[#8E8EA0]">Will be populated with transaction rows in Micro-Step 2.3B</p>
                </div>
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