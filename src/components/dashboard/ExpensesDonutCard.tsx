import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { AgCharts } from 'ag-charts-react';
import { ModuleRegistry, AllCommunityModule, type AgPolarChartOptions } from 'ag-charts-community';

ModuleRegistry.registerModules([AllCommunityModule]);

const EXPENSE_CATEGORIES = [
  { category: 'Suppliers', amount: 1348, percent: '42%', color: '#8B7CFF' },
  { category: 'Workspace', amount: 898, percent: '28%', color: '#5CE1E6' },
  { category: 'Platform', amount: 578, percent: '18%', color: '#F472B6' },
  { category: 'Operations', amount: 385, percent: '12%', color: '#34D399' },
];

export const ExpensesDonutCard: React.FC = () => {
  const chartData = useMemo(() => EXPENSE_CATEGORIES, []);

  // AG Charts v14 Polar Donut Configuration
  const chartOptions: AgPolarChartOptions = useMemo(
    () => ({
      data: chartData,
      theme: 'ag-default-dark',
      background: {
        fill: 'transparent',
      },
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
      series: [
        {
          type: 'donut',
          angleKey: 'amount',
          calloutLabelKey: 'category',
          innerRadiusRatio: 0.72,
          fills: ['#8B7CFF', '#5CE1E6', '#F472B6', '#34D399'],
          strokes: ['#1E1E26', '#1E1E26', '#1E1E26', '#1E1E26'],
          strokeWidth: 3,
          calloutLabel: {
            enabled: false,
          },
        },
      ],
      legend: {
        enabled: false, // Using custom 2x2 legend below
      },
    }),
    [chartData]
  );

  return (
    <div className="bg-[#1E1E26] rounded-[24px] p-[28px] border border-white/5 shadow-sm flex flex-col justify-between">
      {/* Header: Title & Timeframe Selector */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#8E8EA0] text-sm font-medium">All Expenses</span>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#262630] hover:bg-[#2F2C44] text-white text-xs rounded-full border border-white/5 transition cursor-pointer">
          <span className="text-[#8E8EA0]">Monthly</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8E8EA0]" />
        </button>
      </div>

      {/* Donut Chart with Centered Total Callout */}
      <div className="relative w-full h-[160px] flex items-center justify-center my-2">
        <AgCharts options={chartOptions} style={{ height: '100%', width: '100%' }} />

        {/* Center Donut Label */}
        <div className="absolute flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] text-[#8E8EA0] uppercase tracking-wider font-medium">
            Total
          </span>
          <span className="text-xl font-bold text-white tracking-tight tabular-nums">
            $3,209.00
          </span>
        </div>
      </div>

      {/* 2x2 Legend Grid with Category Dots & Percentages */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.04] text-xs">
        {EXPENSE_CATEGORIES.map((cat) => (
          <div key={cat.category} className="flex items-center justify-between pr-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="text-[#8E8EA0]">{cat.category}</span>
            </div>
            <span className="text-white font-medium tabular-nums">{cat.percent}</span>
          </div>
        ))}
      </div>
    </div>
  );
};