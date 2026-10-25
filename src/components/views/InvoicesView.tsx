import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, ArrowUpRight, DollarSign, Shield } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import {
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  type ColDef,
} from 'ag-grid-community';
import { type Invoice, formatCurrency } from '../../shared/contracts';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

// Finity Warm Matte Dark AG Grid Theme
const finityAgTheme = themeQuartz.withParams({
  backgroundColor: '#1E1E26',
  foregroundColor: '#FFFFFF',
  headerBackgroundColor: '#18181F',
  headerTextColor: '#8E8EA0',
  oddRowBackgroundColor: '#22222B',
  borderColor: 'rgba(255, 255, 255, 0.05)',
  selectedRowBackgroundColor: 'rgba(139, 124, 255, 0.18)',
  rowHoverColor: 'rgba(139, 124, 255, 0.08)',
  accentColor: '#8B7CFF',
  fontSize: 13,
});

const DEMO_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-001',
    clientName: 'Stripe Global Inc',
    clientEmail: 'billing@stripe.com',
    amountCents: 1250000,
    currency: 'USD',
    status: 'PAID',
    dueDate: '2026-10-15',
    createdAt: '2026-10-01',
    escrowSplit: { upfrontCents: 375000, midwayCents: 500000, finalCents: 375000, releasedCents: 1250000 },
    sha256Proof: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2026-002',
    clientName: 'Acme Logistics Ltd',
    clientEmail: 'finance@acmelogistics.com',
    amountCents: 600000,
    currency: 'USD',
    status: 'SENT',
    dueDate: '2026-11-05',
    createdAt: '2026-10-18',
    escrowSplit: { upfrontCents: 180000, midwayCents: 240000, finalCents: 180000, releasedCents: 180000 },
    sha256Proof: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV-2026-003',
    clientName: 'Horizon Software',
    clientEmail: 'ap@horizon.io',
    amountCents: 1800000,
    currency: 'USD',
    status: 'DRAFT',
    dueDate: '2026-11-20',
    createdAt: '2026-10-22',
    escrowSplit: { upfrontCents: 540000, midwayCents: 720000, finalCents: 540000, releasedCents: 0 },
  },
  {
    id: 'inv-4',
    invoiceNumber: 'INV-2026-004',
    clientName: 'Nordic Creative Agency',
    clientEmail: 'payments@nordic.co',
    amountCents: 450000,
    currency: 'USD',
    status: 'OVERDUE',
    dueDate: '2026-10-10',
    createdAt: '2026-09-25',
    escrowSplit: { upfrontCents: 135000, midwayCents: 180000, finalCents: 135000, releasedCents: 0 },
  },
  {
    id: 'inv-5',
    invoiceNumber: 'INV-2026-005',
    clientName: 'Vanguard Retailers',
    clientEmail: 'settlements@vanguard.com',
    amountCents: 850000,
    currency: 'USD',
    status: 'DISPUTED',
    dueDate: '2026-10-05',
    createdAt: '2026-09-15',
    escrowSplit: { upfrontCents: 255000, midwayCents: 340000, finalCents: 255000, releasedCents: 255000 },
    sha256Proof: 'c5629d70d131ced8183b52e4293fbf160e93e04da933d40f366e26073cc4502f',
  },
];

export const InvoicesView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Filtered rows
  const rowData = useMemo(() => {
    return DEMO_INVOICES.filter((inv) => {
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.clientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  // AG Grid Column Definitions
  const colDefs = useMemo<ColDef<Invoice>[]>(
    () => [
      {
        field: 'invoiceNumber',
        headerName: 'Invoice #',
        width: 150,
        pinned: 'left',
        cellRenderer: (params: { value: string }) => (
          <span className="font-semibold text-white tracking-tight">{params.value}</span>
        ),
      },
      {
        field: 'clientName',
        headerName: 'Client',
        flex: 1.2,
        minWidth: 200,
        cellRenderer: (params: { data?: Invoice }) => (
          params.data ? (
            <div className="flex flex-col py-1">
              <span className="text-white font-medium leading-tight">{params.data.clientName}</span>
              <span className="text-[11px] text-[#8E8EA0] leading-tight">{params.data.clientEmail}</span>
            </div>
          ) : null
        ),
      },
            {
        field: 'status',
        headerName: 'Status',
        width: 140,
        cellRenderer: (params: { value: string }) => {
          const status = params.value;
          let badgeClass = 'bg-[#262630]/70 text-[#8E8EA0] border-white/5';
          if (status === 'PAID') badgeClass = 'bg-[#19322B] text-[#34D399] border-[#34D399]/25';
          if (status === 'SENT') badgeClass = 'bg-[#1D2E33] text-[#5CE1E6] border-[#5CE1E6]/25';
          if (status === 'OVERDUE') badgeClass = 'bg-[#33202E] text-[#F472B6] border-[#F472B6]/25';
          if (status === 'DISPUTED') badgeClass = 'bg-[#3F2B2B] text-[#F87171] border-[#F87171]/25';

          return (
            <div className="flex items-center h-full">
              <span
                className={`w-[84px] h-[26px] inline-flex items-center justify-center rounded-full text-[11px] font-semibold tracking-wide border shadow-sm ${badgeClass}`}
              >
                {status}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Escrow Split (30/40/30)',
        width: 190,
        cellRenderer: (params: { data?: Invoice }) => {
          if (!params.data?.escrowSplit) return <span className="text-[#8E8EA0]">Standard</span>;
          const { upfrontCents, releasedCents } = params.data.escrowSplit;
          const isUpfrontReleased = releasedCents >= upfrontCents;
          return (
            <div className="flex items-center gap-2 h-full text-xs font-mono">
              <span
                className={
                  isUpfrontReleased
                    ? 'text-[#8B7CFF] font-semibold tracking-tight'
                    : 'text-[#8E8EA0]'
                }
              >
                30%
              </span>
              <span className="text-white/20 select-none">/</span>
              <span className="text-[#8E8EA0]">40%</span>
              <span className="text-white/20 select-none">/</span>
              <span className="text-[#8E8EA0]">30%</span>
            </div>
          );
        },
      },
      {
        field: 'amountCents',
        headerName: 'Amount',
        width: 130,
        cellRenderer: (params: { value: number }) => (
          <div className="flex items-center justify-end h-full font-semibold text-white tabular-nums pr-2">
            {formatCurrency(params.value)}
          </div>
        ),
      },
      {
        field: 'dueDate',
        headerName: 'Due Date',
        width: 120,
        cellRenderer: (params: { value: string }) => (
          <span className="text-xs text-[#8E8EA0]">{params.value}</span>
        ),
      },
      {
        headerName: 'Action',
        width: 130,
        pinned: 'right',
        cellRenderer: (params: { data?: Invoice }) => (
          <div className="flex items-center h-full">
            {params.data?.status === 'PAID' ? (
              <span className="text-[11px] text-[#34D399] font-medium flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Sealed
              </span>
            ) : (
              <button
                onClick={() => alert(`Opening PayPal checkout for ${params.data?.invoiceNumber}`)}
                className="px-3 py-1 bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white text-xs font-medium rounded-full shadow-sm transition cursor-pointer flex items-center gap-1"
              >
                <span>Collect</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#1E1E26] rounded-[24px] p-6 border border-white/5 shadow-sm">
          <div className="text-xs text-[#8E8EA0] font-medium">Total Invoiced</div>
          <div className="text-2xl lg:text-3xl font-bold text-white tracking-tight tabular-nums mt-2">
            $49,500.00
          </div>
          <div className="text-[11px] text-[#34D399] mt-1 flex items-center gap-1 font-medium">
            <span>+12.4% this month</span>
          </div>
        </div>

        <div className="bg-[#1E1E26] rounded-[24px] p-6 border border-white/5 shadow-sm">
          <div className="text-xs text-[#8E8EA0] font-medium">In Milestone Escrow (30/40/30)</div>
          <div className="text-2xl lg:text-3xl font-bold text-white tracking-tight tabular-nums mt-2">
            $12,200.00
          </div>
          <div className="text-[11px] text-[#8B7CFF] mt-1 flex items-center gap-1 font-medium">
            <span>3 projects locked</span>
          </div>
        </div>

        <div className="bg-[#1E1E26] rounded-[24px] p-6 border border-white/5 shadow-sm">
          <div className="text-xs text-[#8E8EA0] font-medium">Awaiting Settlement</div>
          <div className="text-2xl lg:text-3xl font-bold text-white tracking-tight tabular-nums mt-2">
            $10,500.00
          </div>
          <div className="text-[11px] text-[#5CE1E6] mt-1 flex items-center gap-1 font-medium">
            <span>2 client invoices pending</span>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-[#1E1E26] rounded-[24px] p-4 border border-white/5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#141418] rounded-full border border-white/5 w-full md:w-80">
          <Search className="w-4 h-4 text-[#8E8EA0]" />
          <input
            type="text"
            placeholder="Search invoice or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none text-xs text-white placeholder-[#8E8EA0] focus:outline-none w-full"
          />
        </div>

        {/* Status Pills & Create Action */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1 bg-[#141418] p-1 rounded-full border border-white/5">
            {['ALL', 'PAID', 'SENT', 'OVERDUE'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition cursor-pointer ${
                  statusFilter === status
                    ? 'bg-[#2F2C44] text-white shadow-sm'
                    : 'text-[#8E8EA0] hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <button
            onClick={() => alert('Invoice creation modal will connect in Micro-Step 3.1!')}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white text-xs font-semibold rounded-full shadow-[0_0_12px_rgba(139,124,255,0.3)] transition cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* AG Grid Container */}
      <div className="w-full h-[420px] rounded-[24px] overflow-hidden border border-white/5 shadow-sm">
        <AgGridReact
          theme={finityAgTheme}
          rowData={rowData}
          columnDefs={colDefs}
          defaultColDef={{
            sortable: true,
            resizable: true,
          }}
          pagination={true}
          paginationPageSize={10}
        />
      </div>
    </div>
  );
};