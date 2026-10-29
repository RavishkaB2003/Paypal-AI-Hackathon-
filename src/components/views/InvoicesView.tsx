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
import { useInvoices } from '../../api/hooks';

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
  invoices: propInvoices,
  onOpenCreateInvoice,
}) => {
  const { data: serverInvoices } = useInvoices();
  const invoices = propInvoices || serverInvoices || SEED_INVOICES;

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

  // AG Grid Column Definitions
  const columnDefs = useMemo<ColDef<Invoice>[]>(
    () => [
      {
        field: 'invoiceNumber',
        headerName: 'Invoice',
        minWidth: 150,
        flex: 1,
        cellRenderer: (params: any) => (
          <div className="flex items-center gap-2 h-full">
            <span className="font-semibold text-white">{params.value}</span>
            {params.data?.sha256Proof && (
              <span title="Delivery proof verified on file">
                <Shield className="w-3.5 h-3.5 text-[#34D399]" />
              </span>
            )}
          </div>
        ),
      },
      {
        field: 'clientName',
        headerName: 'Client',
        minWidth: 200,
        flex: 1.5,
        cellRenderer: (params: any) => (
          <div className="flex flex-col justify-center h-full leading-tight">
            <span className="text-white font-medium text-xs">{params.value}</span>
            <span className="text-[11px] text-[#8E8EA0]">{params.data?.clientEmail}</span>
          </div>
        ),
      },
      {
        field: 'amountCents',
        headerName: 'Amount',
        minWidth: 140,
        flex: 1,
        cellRenderer: (params: any) => (
          <div className="flex items-center h-full">
            <span className="font-semibold text-white tabular-nums">
              {formatCurrency(params.value, params.data?.currency || 'USD')}
            </span>
          </div>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 140,
        flex: 1,
        cellRenderer: (params: any) => {
          const status = params.value;
          let badgeBg = 'bg-[#262630] text-[#8E8EA0] border border-white/5';
          let dotColor = 'bg-[#8E8EA0]';

          if (status === 'PAID') {
            badgeBg = 'bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/20';
            dotColor = 'bg-[#34D399]';
          } else if (status === 'SENT') {
            badgeBg = 'bg-[#8B7CFF]/10 text-[#8B7CFF] border border-[#8B7CFF]/20';
            dotColor = 'bg-[#8B7CFF]';
          } else if (status === 'DISPUTED') {
            badgeBg = 'bg-[#F472B6]/10 text-[#F472B6] border border-[#F472B6]/20';
            dotColor = 'bg-[#F472B6]';
          } else if (status === 'OVERDUE') {
            badgeBg = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
            dotColor = 'bg-rose-400';
          }

          return (
            <div className="flex items-center h-full">
              <span
                className={`inline-flex items-center justify-center gap-1.5 w-[94px] h-[26px] rounded-full text-[11px] font-medium shrink-0 ${badgeBg}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
                <span>{status.charAt(0) + status.slice(1).toLowerCase()}</span>
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Payment Split',
        minWidth: 200,
        flex: 1.5,
        cellRenderer: (params: any) => {
          const split = params.data?.escrowSplit;
          if (!split) {
            return (
              <div className="flex items-center h-full">
                <span className="text-[#8E8EA0] text-xs">Standard (100% on delivery)</span>
              </div>
            );
          }
          const total = params.data.amountCents;
          const pct = Math.round((split.releasedCents / total) * 100);

          return (
            <div className="flex flex-col justify-center h-full w-full gap-1">
              <div className="flex justify-between text-[11px] text-[#8E8EA0]">
                <span>3-step split</span>
                <span className="text-white font-medium">{pct}% paid</span>
              </div>
              <div className="w-full bg-[#141418] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#8B7CFF] h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        field: 'dueDate',
        headerName: 'Due Date',
        minWidth: 130,
        flex: 1,
        cellRenderer: (params: any) => (
          <div className="flex items-center h-full">
            <span className="text-[#8E8EA0] text-xs tabular-nums">{params.value}</span>
          </div>
        ),
      },
    ],
    []
  );

  // Filtered rows for AG Grid
  const rowData = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.clientEmail.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  return (
    <div className="flex flex-col gap-6">
      {/* Dynamic Summary Cards Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#1E1E26] rounded-[24px] p-6 border border-white/5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#8E8EA0] text-xs font-medium">
            <span>Total Invoiced</span>
            <ArrowUpRight className="w-4 h-4 text-[#8B7CFF]" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tabular-nums">
              {formatCurrency(totalInvoicedCents)}
            </span>
            <p className="text-[11px] text-[#8E8EA0] mt-1">{invoices.length} invoices on file</p>
          </div>
        </div>

        <div className="bg-[#1E1E26] rounded-[24px] p-6 border border-white/5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#8E8EA0] text-xs font-medium">
            <span>Held in Payment Escrow</span>
            <span className="text-[11px] text-[#5CE1E6] font-medium bg-[#5CE1E6]/10 px-2 py-0.5 rounded-full">
              Protected
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tabular-nums">
              {formatCurrency(inEscrowCents)}
            </span>
            <p className="text-[11px] text-[#8E8EA0] mt-1">Releases upon client milestone approval</p>
          </div>
        </div>

        <div className="bg-[#1E1E26] rounded-[24px] p-6 border border-white/5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#8E8EA0] text-xs font-medium">
            <span>Awaiting Settlement</span>
            <span className="text-[11px] text-[#FFC439] font-medium bg-[#FFC439]/10 px-2 py-0.5 rounded-full">
              Pending
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tabular-nums">
              {formatCurrency(awaitingSettlementCents)}
            </span>
            <p className="text-[11px] text-[#8E8EA0] mt-1">Sent or scheduled invoices</p>
          </div>
        </div>
      </div>

      {/* Main Table Container: Toolbar + AG Grid */}
      <div className="bg-[#1E1E26] rounded-[24px] p-6 border border-white/5 flex flex-col gap-4 shadow-sm">
        {/* Toolbar Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#8E8EA0] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by client or invoice number..."
              className="w-full bg-[#141418] border border-white/5 rounded-full pl-10 pr-4 py-2 text-xs text-white placeholder-[#8E8EA0] focus:outline-none focus:border-[#8B7CFF]/50 transition"
            />
          </div>

          {/* Status Filter Pills + Create Button */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'PAID', 'SENT', 'DISPUTED', 'OVERDUE'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                  statusFilter === s
                    ? 'bg-[#8B7CFF] text-white shadow-sm'
                    : 'bg-[#141418] text-[#8E8EA0] hover:text-white border border-white/5'
                }`}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}

            {onOpenCreateInvoice && (
              <button
                onClick={onOpenCreateInvoice}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white text-xs font-medium transition shadow-sm ml-auto cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create invoice</span>
              </button>
            )}
          </div>
        </div>

        {/* AG Grid React Container */}
        <div className="w-full h-[480px] rounded-xl overflow-hidden border border-white/5">
          <AgGridReact<Invoice>
            theme={finityAgTheme}
            rowData={rowData}
            columnDefs={columnDefs}
            rowHeight={54}
            headerHeight={44}
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 20, 50]}
            animateRows={true}
            defaultColDef={{
              sortable: true,
              filter: false,
              resizable: true,
            }}
          />
        </div>
      </div>
    </div>
  );
};