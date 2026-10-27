import React, { useState, useMemo } from 'react';
import { Plus, Search, ArrowUpRight, Shield } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import {
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  type ColDef,
} from 'ag-grid-community';
import { type Invoice, formatCurrency } from '../../shared/contracts';
import { SEED_INVOICES } from '../../shared/seeds';

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

interface InvoicesViewProps {
  invoices?: Invoice[];
  onOpenCreateInvoice?: () => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices = SEED_INVOICES,
  onOpenCreateInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Dynamic metric calculations from current invoices
  const totalInvoicedCents = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + inv.amountCents, 0);
  }, [invoices]);

  const inEscrowCents = useMemo(() => {
    return invoices.reduce((sum, inv) => {
      if (!inv.escrowSplit) return sum;
      const unreleased = inv.escrowSplit.midwayCents + inv.escrowSplit.finalCents;
      return sum + unreleased;
    }, 0);
  }, [invoices]);

  const awaitingSettlementCents = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === 'SENT' || inv.status === 'OVERDUE' || inv.status === 'DRAFT')
      .reduce((sum, inv) => sum + inv.amountCents, 0);
  }, [invoices]);

  const pendingCount = useMemo(() => {
    return invoices.filter((inv) => inv.status === 'SENT' || inv.status === 'OVERDUE').length;
  }, [invoices]);

  // Filtered rows for AG Grid
  const rowData = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.clientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

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
        cellRenderer: (params: { data?: Invoice }) =>
          params.data ? (
            <div className="flex flex-col py-1">
              <span className="text-white font-medium leading-tight">{params.data.clientName}</span>
              <span className="text-[11px] text-[#8E8EA0] leading-tight">{params.data.clientEmail}</span>
            </div>
          ) : null,
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
        headerName: 'Split Stages (30/40/30)',
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
                onClick={() => alert(`Payment link copied for ${params.data?.invoiceNumber}`)}
                className="px-3 py-1 bg-[#8B7CFF] hover:bg-[#7A6BEE] text-white text-xs font-medium rounded-full shadow-sm transition cursor-pointer flex items-center gap-1"
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
      {/* Metrics Row — Computed dynamically from invoices */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#1E1E26] rounded-[24px] p-6 border border-white/5 shadow-sm">
          <div className="text-xs text-[#8E8EA0] font-medium">Total Invoiced</div>
          <div className="text-2xl lg:text-3xl font-bold text-white tracking-tight tabular-nums mt-2">
            {formatCurrency(totalInvoicedCents)}
          </div>
          <div className="text-[11px] text-[#34D399] mt-1 flex items-center gap-1 font-medium">
            <span>{invoices.length} total client invoices</span>
          </div>
        </div>

        <div className="bg-[#1E1E26] rounded-[24px] p-6 border border-white/5 shadow-sm">
          <div className="text-xs text-[#8E8EA0] font-medium">In Project Stages (30/40/30)</div>
          <div className="text-2xl lg:text-3xl font-bold text-white tracking-tight tabular-nums mt-2">
            {formatCurrency(inEscrowCents)}
          </div>
          <div className="text-[11px] text-[#8B7CFF] mt-1 flex items-center gap-1 font-medium">
            <span>Held across phased stages</span>
          </div>
        </div>

        <div className="bg-[#1E1E26] rounded-[24px] p-6 border border-white/5 shadow-sm">
          <div className="text-xs text-[#8E8EA0] font-medium">Awaiting Settlement</div>
          <div className="text-2xl lg:text-3xl font-bold text-white tracking-tight tabular-nums mt-2">
            {formatCurrency(awaitingSettlementCents)}
          </div>
          <div className="text-[11px] text-[#5CE1E6] mt-1 flex items-center gap-1 font-medium">
            <span>{pendingCount} client invoices pending</span>
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
            onClick={onOpenCreateInvoice}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#8B7CFF] hover:bg-[#7A6BEE] text-white text-xs font-semibold rounded-full transition cursor-pointer shrink-0"
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