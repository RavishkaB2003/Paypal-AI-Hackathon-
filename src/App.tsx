import { useState, useEffect } from 'react';
import { Plus, CheckCircle2 } from 'lucide-react';
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
import { WorkspaceAssistantModal } from './components/modals/WorkspaceAssistantModal';
import { CreateInvoiceModal, type NewInvoicePayload } from './components/modals/CreateInvoiceModal';
import { useCreateInvoice } from './api/hooks';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [isWorkspaceAssistantOpen, setIsWorkspaceAssistantOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const createInvoiceMutation = useCreateInvoice();

  // Listen for navigation events from cards
  useEffect(() => {
    const handleNavEvent = (e: Event) => {
      const customEvent = e as CustomEvent<TabType>;
      if (customEvent.detail) {
        setActiveTab(customEvent.detail);
      }
    };
    window.addEventListener('paypulse:navigate-tab', handleNavEvent);
    return () => window.removeEventListener('paypulse:navigate-tab', handleNavEvent);
  }, []);

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K opens Workspace Assistant
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsWorkspaceAssistantOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateInvoice = (payload: NewInvoicePayload) => {
    createInvoiceMutation.mutate(
      {
        invoiceNumber: payload.invoiceNumber,
        clientName: payload.client,
        clientEmail: payload.email,
        amountCents: payload.amountCents,
        enableThreeStepSplit: payload.enableThreeStepSplit,
      },
      {
        onSuccess: (newInv) => {
          setIsCreateInvoiceOpen(false);
          setActiveTab('INVOICES');
          setNotification(`Invoice ${newInv.invoiceNumber} created and split into 3 steps!`);
          setTimeout(() => setNotification(null), 4000);
        },
        onError: (err: any) => {
          setNotification(`Error creating invoice: ${err.message}`);
          setTimeout(() => setNotification(null), 4000);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#141418] text-white flex flex-col font-sans relative">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#1E1E26] border border-[#34D399]/40 text-xs text-white shadow-xl animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Navbar with 5 Finity Tab Pills */}
      <TopNavbar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Body with Floating Icon Rail + Bento Workspace */}
      <div className="flex-1 w-full flex max-w-[1600px] mx-auto">
        {/* Floating Capsule Icon Rail on the Far Left */}
        <LeftIconRail activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Dynamic Tab Content Area */}
        <main className="flex-1 px-6 md:px-8 py-6 flex flex-col">
          {/* Header Row: Title & Action */}
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
              onClick={() => setIsWorkspaceAssistantOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1E1E26] hover:bg-[#2F2C44] text-white text-xs md:text-sm font-medium rounded-full border border-white/5 hover:border-white/10 transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#8B7CFF]" />
              <span>Add widget</span>
              <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] bg-white/5 text-[#8E8EA0] rounded font-mono border border-white/5">
                Ctrl+K
              </kbd>
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
            {activeTab === 'INVOICES' && (
              <InvoicesView onOpenCreateInvoice={() => setIsCreateInvoiceOpen(true)} />
            )}

            {/* Tab 3: Smart Scan Vision View */}
            {activeTab === 'SMART_SCAN' && <SmartScanView />}

            {/* Tab 4: Milestones Escrow Pipeline View */}
            {activeTab === 'MILESTONES' && (
              <MilestonesView onOpenNewProject={() => setIsWorkspaceAssistantOpen(true)} />
            )}

            {/* Tab 5: Payment Protection & Evidence View */}
            {activeTab === 'PROTECTION' && <ProtectionView />}
          </div>
        </main>
      </div>

      {/* Workspace Assistant Command Palette Modal */}
      <WorkspaceAssistantModal
        isOpen={isWorkspaceAssistantOpen}
        onClose={() => setIsWorkspaceAssistantOpen(false)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsWorkspaceAssistantOpen(false);
        }}
        onOpenCreateInvoice={() => {
          setIsWorkspaceAssistantOpen(false);
          setIsCreateInvoiceOpen(true);
        }}
      />

      {/* Create Invoice Modal */}
      <CreateInvoiceModal
        isOpen={isCreateInvoiceOpen}
        onClose={() => setIsCreateInvoiceOpen(false)}
        onCreateInvoice={handleCreateInvoice}
      />
    </div>
  );
}