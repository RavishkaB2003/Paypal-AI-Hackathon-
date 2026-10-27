import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { AgCharts } from 'ag-charts-react';
import { ModuleRegistry, AllCommunityModule, type AgCartesianChartOptions } from 'ag-charts-community';
import { SEED_OVERVIEW_DATA } from '../../shared/seeds';

ModuleRegistry.registerModules([AllCommunityModule]);

interface TransactionsOverviewCardProps {
  cashflow?: typeof SEED_OVERVIEW_DATA.cashflow;
  totalVolume?: string;
  timeframe?: string;
}

export const TransactionsOverviewCard: React.FC<TransactionsOverviewCardProps> = ({
  cashflow = SEED_OVERVIEW_DATA.cashflow,
  totalVolume = '$80,300.00',
  timeframe = 'This Year',
}) => {
  // AG Charts v14 Finity Matte Dark Configuration
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
    <div className="bg-[#1E1E26] rounded-[24px] p-[28px] border border-white/5 shadow-sm flex flex-col justify-between">
      {/* Header: Title & Timeframe Selector */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#8E8EA0] text-sm font-medium">Transactions Overview</span>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#262630] hover:bg-[#2F2C44] text-white text-xs rounded-full border border-white/5 transition cursor-pointer">
          <span className="text-[#8E8EA0]">{timeframe}</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8E8EA0]" />
        </button>
      </div>

      {/* Main Metric & Finity Legend Pills */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-2xl lg:text-3xl font-bold tracking-tight text-white tabular-nums">
          {totalVolume}
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