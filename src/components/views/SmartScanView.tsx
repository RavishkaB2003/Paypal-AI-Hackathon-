import React, { useState } from 'react';
import { UploadCloud, FileText, ArrowRight, RefreshCw } from 'lucide-react';

export const SmartScanView: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<'delivery' | 'receipt'>('delivery');

  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 600);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="bg-[#1E1E26] rounded-[24px] p-6 border border-white/5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Scan Receipts & Documents</h2>
          <p className="text-xs text-[#8E8EA0] mt-1 max-w-2xl">
            Upload a receipt, bill, or delivery slip to pull out the payment details automatically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedDemo(selectedDemo === 'delivery' ? 'receipt' : 'delivery');
              handleSimulateScan();
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#262630] hover:bg-[#2F2C44] text-white text-xs font-medium rounded-full border border-white/5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#8E8EA0] ${isScanning ? 'animate-spin' : ''}`} />
            <span>Try Another Sample</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Drag & Drop Scanner Area (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <div
            onClick={handleSimulateScan}
            className="flex-1 bg-[#1E1E26] rounded-[24px] p-8 border border-dashed border-white/15 hover:border-[#8B7CFF]/50 transition cursor-pointer flex flex-col items-center justify-center text-center min-h-[380px] group shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#262630] border border-white/5 flex items-center justify-center text-[#8B7CFF] group-hover:bg-[#2F2C44] transition mb-4">
              {isScanning ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <UploadCloud className="w-5 h-5" />
              )}
            </div>

            <h3 className="text-sm font-semibold text-white mb-1">
              {isScanning ? 'Reading document...' : 'Drop a document here to scan'}
            </h3>
            <p className="text-xs text-[#8E8EA0] max-w-xs mb-6">
              Upload a PDF, photo, or delivery slip from your computer
            </p>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#262630] text-[11px] font-medium text-[#8E8EA0] border border-white/5">
              <FileText className="w-3.5 h-3.5 text-[#8E8EA0]" />
              <span>Supports PDF, PNG, JPG (Up to 15 MB)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Extracted Document Preview Card (7 cols) */}
        <div className="lg:col-span-7 bg-[#1E1E26] rounded-[24px] p-7 border border-white/5 shadow-sm flex flex-col justify-between">
          <div>
            {/* Card Header */}
            <div className="flex items-center justify-between pb-5 border-b border-white/5">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8E8EA0]">
                  Extracted Details
                </span>
                <h3 className="text-base font-semibold text-white mt-0.5">
                  {selectedDemo === 'delivery'
                    ? 'DHL Express Waybill #DHL-884920194'
                    : 'Figma Enterprise Annual Billing Receipt'}
                </h3>
              </div>

              <div className="inline-flex items-center gap-2 text-xs font-medium text-[#8E8EA0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                <span>Details extracted</span>
              </div>
            </div>

            {/* Extracted Key-Value Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-5 border-b border-white/5">
              <div className="bg-[#141418] rounded-2xl p-3.5 border border-white/5">
                <p className="text-[11px] text-[#8E8EA0]">Client / Vendor</p>
                <p className="text-xs font-semibold text-white mt-1">
                  {selectedDemo === 'delivery' ? 'Acme Corp Design' : 'Figma Inc.'}
                </p>
              </div>
              <div className="bg-[#141418] rounded-2xl p-3.5 border border-white/5">
                <p className="text-[11px] text-[#8E8EA0]">Linked Invoice</p>
                <p className="text-xs font-semibold text-white mt-1">
                  {selectedDemo === 'delivery' ? 'INV-2026-0841' : 'INV-2026-0835'}
                </p>
              </div>
              <div className="bg-[#141418] rounded-2xl p-3.5 border border-white/5 col-span-2 sm:col-span-1">
                <p className="text-[11px] text-[#8E8EA0]">Total Amount</p>
                <p className="text-sm font-bold text-white tabular-nums mt-0.5">
                  {selectedDemo === 'delivery' ? '$4,250.00' : '$1,890.00'}
                </p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="py-5">
              <p className="text-xs font-medium text-[#8E8EA0] mb-3">Line Items</p>
              <div className="bg-[#141418] rounded-2xl border border-white/5 divide-y divide-white/5">
                {selectedDemo === 'delivery' ? (
                  <>
                    <div className="flex items-center justify-between p-3.5 text-xs">
                      <span className="text-white font-medium">UI/UX Design System Deliverable (Final Release)</span>
                      <span className="text-white font-semibold tabular-nums">$2,975.00</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 text-xs">
                      <span className="text-white font-medium">Interactive Component Handoff & Review</span>
                      <span className="text-white font-semibold tabular-nums">$1,275.00</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-3.5 text-xs">
                      <span className="text-white font-medium">Organization Design Seats (Annual Plan)</span>
                      <span className="text-white font-semibold tabular-nums">$1,440.00</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 text-xs">
                      <span className="text-white font-medium">Dev Mode Collaborator Licenses</span>
                      <span className="text-white font-semibold tabular-nums">$450.00</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-white/5">
            <button
              onClick={() => alert('Document attached to invoice!')}
              className="px-4 py-2 rounded-full bg-[#262630] hover:bg-[#2F2C44] text-xs font-medium text-white border border-white/5 transition cursor-pointer"
            >
              Attach to Existing Invoice
            </button>
            <button
              onClick={() => alert('Draft invoice created from scanned line items!')}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#8B7CFF] hover:bg-[#7A6BEE] text-xs font-semibold text-white transition cursor-pointer"
            >
              <span>Create Draft Invoice</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};