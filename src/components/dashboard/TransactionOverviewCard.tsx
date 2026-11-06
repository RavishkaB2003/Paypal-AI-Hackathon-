import React, { useMemo, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { AgCharts } from 'ag-charts-react';
import { ModuleRegistry, AllCommunityModule, type AgCartesianChartOptions } from 'ag-charts-community';
import { useOverview } from '../../api/hooks';
import { formatCurrency, type CashflowPoint } from '../../shared/contracts';

ModuleRegistry.registerModules([AllCommunityModule]);

interface TransactionsOverviewCardProps {
  cashflow?: CashflowPoint[];
  totalVolume?: string;
  timeframe?: string;
}

const TIMEFRAME_OPTIONS = [
  { id: 'THIS_YEAR', label: 'This Year' },
  { id: 'LAST_6_MONTHS', label: 'Last 6 Months' },
  { id: 'THIS_QUARTER', label: 'This Quarter' },
] as const;

export const TransactionsOverviewCard: React.FC<TransactionsOverviewCardProps> = ({
  cashflow: propCashflow,
  totalVolume: propTotalVolume,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('THIS_YEAR');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data: overview } = useOverview({ cashflowTimeframe: selectedTimeframe });
  const cashflow = propCashflow ?? overview?.cashflow ?? [];

  const activeLabel =
    TIMEFRAME_OPTIONS.find((t) => t.id === selectedTimeframe)?.label ?? 'This Year';

  // Dynamically calculate total volume from SQLite cashflow series (or totalBalanceCents when on default)
  const computedVolume = useMemo(() => {
    if (propTotalVolume) return propTotalVolume;
    const totalDollars = cashflow.reduce((sum, pt) => sum + pt.earning, 0);
    if (totalDollars > 0) {
      return formatCurrency(Math.round(totalDollars * 100));
    }
    return formatCurrency(overview?.totalBalanceCents ?? 0);
  }, [propTotalVolume, cashflow, overview?.totalBalanceCents]);

  // AG Charts Finity Matte Dark Configuration
  const chartOptions: AgCartesianChartOptions = useMemo(
    () => ({
      data: cashflow,
      theme: 'ag-default-dark',
      background: {
        fill: 'transparent',
      },
      padding: {
        top: 10,
        right: 10,
        bottom: 5,
        left: 5,
      },
      series: [
        {
          type: 'area',
          xKey: 'month',
          yKey: 'earning',
          yName: 'Earning',
          stroke: '#8B7CFF',
          strokeWidth: 2.5,
          fill: 'rgba(139, 124, 255, 0.22)',
          interpolation: { type: 'smooth' },
          marker: {
            enabled: false,
          },
        },
        {
          type: 'area',
          xKey: 'month',
          yKey: 'spending',
          yName: 'Spending',
          stroke: '#5CE1E6',
          strokeWidth: 2,
          fill: 'rgba(92, 225, 230, 0.14)',
          interpolation: { type: 'smooth' },
          marker: {
            enabled: false,
          },
        },
      ],
      axes: {
        x: {
          type: 'category',
          position: 'bottom',
          line: { enabled: false },
          label: {
            color: '#8E8EA0',
            fontSize: 11,
          },
          gridLine: { enabled: false },
        },
        y: {
          type: 'number',
          position: 'left',
          line: { enabled: false },
          label: { enabled: false },
          gridLine: {
            style: [
              {
                stroke: 'rgba(255, 255, 255, 0.04)',
                lineDash: [4, 4],
              },
            ],
          },
        },
      },
      legend: {
        enabled: false,
      },
    }),
    [cashflow]
  );

  return (
    <div className="bg-[#1E1E26] rounded-[24px] p-[28px] border border-white/5 shadow-sm flex flex-col justify-between relative">
      {/* Header: Title & Timeframe Selector */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#8E8EA0] text-sm font-medium">Transactions Overview</span>

        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            data-testid="cashflow-timeframe-button"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#262630] hover:bg-[#2F2C44] text-white text-xs rounded-full border border-white/5 transition cursor-pointer"
          >
            <span className="text-[#8E8EA0]">{activeLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#8E8EA0]" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-40 rounded-2xl bg-[#141418] border border-white/10 shadow-xl py-1.5 z-30">
              {TIMEFRAME_OPTIONS.map((opt) => {
                const isSelected = opt.id === selectedTimeframe;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedTimeframe(opt.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'text-white font-semibold bg-[#8B7CFF]/15'
                        : 'text-[#8E8EA0] hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#8B7CFF]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Metric & Finity Legend Pills */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-2xl lg:text-3xl font-bold tracking-tight text-white tabular-nums">
          {computedVolume}
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B7CFF]" />
            <span className="text-[#8E8EA0] font-medium">Earning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5CE1E6]" />
            <span className="text-[#8E8EA0] font-medium">Spending</span>
          </div>
        </div>
      </div>

      {/* AG Charts Spline Canvas */}
      <div className="w-full h-[180px]">
        <AgCharts options={chartOptions} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
};