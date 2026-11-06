import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  X,
} from 'lucide-react';
import { type SmartScanResult, formatCurrency } from '../../shared/contracts';
import { useScanDocument, useCreateInvoice } from '../../api/hooks';

interface SmartScanViewProps {
  onNavigateToInvoices?: () => void;
}

export const SmartScanView: React.FC<SmartScanViewProps> = ({ onNavigateToInvoices }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 100% SQLite SSOT: No static initial mock data
  const [scanResult, setScanResult] = useState<SmartScanResult | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const scanMutation = useScanDocument();
  const createInvoiceMutation = useCreateInvoice();

  // Handle Drag & Drop / File Input via Multimodal AI
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      scanMutation.mutate(
        {
          imageBase64: base64,
          mimeType: file.type,
        },
        {
          onSuccess: (data) => {
            setScanResult(data);
            setNotification('Document extracted successfully with AI Vision!');
            setTimeout(() => setNotification(null), 4000);
          },
          onError: (err: any) => {
            setNotification(`Scan failed: ${err.message}`);
            setTimeout(() => setNotification(null), 4000);
          },
        }
      );
    };
    reader.readAsDataURL(file);
  };

  // Trigger Live Backend Sample Scan
  const handleTriggerSample = (sampleType: 'delivery' | 'receipt') => {
    scanMutation.mutate(
      { sampleType },
      {
        onSuccess: (data) => {
          setScanResult(data);
          setNotification(
            `Extracted ${sampleType === 'delivery' ? 'Proof of Delivery' : 'Merchant Receipt'} via Gemini 3.8 Flash!`
          );
          setTimeout(() => setNotification(null), 4000);
        },
        onError: (err: any) => {
          setNotification(`Scan failed: ${err.message}`);
          setTimeout(() => setNotification(null), 4000);
        },
      }
    );
  };

  // Convert Scan to Invoice with auto-uniquified invoice number
  const handleCreateInvoiceFromScan = () => {
    if (!scanResult) return;

    const uniqueInvoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    createInvoiceMutation.mutate(
      {
        invoiceNumber: uniqueInvoiceNumber,
        clientName: scanResult.vendorName,
        clientEmail: 'billing@clientcorp.com',
        amountCents: scanResult.totalCents,
        currency: scanResult.currency,
        dueDate: scanResult.date,
        enableThreeStepSplit: true,
        sha256Proof: scanResult.sha256Hash,
      },
      {
        onSuccess: () => {
          setNotification(`Invoice ${uniqueInvoiceNumber} created and linked with cryptographic proof!`);
          setTimeout(() => {
            setNotification(null);
            if (onNavigateToInvoices) {
              onNavigateToInvoices();
            } else {
              window.dispatchEvent(new CustomEvent('paypulse:navigate-tab', { detail: 'INVOICES' }));
            }
          }, 1200);
        },
        onError: (err: any) => {
          setNotification(`Failed to create invoice: ${err.message}`);
          setTimeout(() => setNotification(null), 4000);
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-6 relative">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#1E1E26] border border-[#34D399]/40 text-xs text-white shadow-xl animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#1E1E26] rounded-[24px] p-6 border border-white/5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Scan Receipts & Documents</h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#8B7CFF]/10 text-[#8B7CFF] border border-[#8B7CFF]/20">
              <Sparkles className="w-3 h-3" />
              Multimodal Vision AI
            </span>
          </div>
          <p className="text-xs text-[#8E8EA0] mt-1 max-w-2xl">
            Upload a receipt, bill, or delivery slip to pull out payment details and register cryptographic proof against buyer claims.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleTriggerSample('delivery')}
            disabled={scanMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#262630] hover:bg-[#2F2C44] text-white text-xs font-medium rounded-full border border-white/5 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#8E8EA0] ${scanMutation.isPending ? 'animate-spin' : ''}`} />
            <span>Sample Waybill</span>
          </button>
          <button
            type="button"
            onClick={() => handleTriggerSample('receipt')}
            disabled={scanMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#262630] hover:bg-[#2F2C44] text-white text-xs font-medium rounded-full border border-white/5 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#8E8EA0] ${scanMutation.isPending ? 'animate-spin' : ''}`} />
            <span>Sample Receipt</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Drag & Drop Scanner Area (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 bg-[#1E1E26] rounded-[24px] p-8 border border-dashed border-white/15 hover:border-[#8B7CFF]/50 transition cursor-pointer flex flex-col items-center justify-center text-center min-h-[380px] group shadow-sm"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#262630] border border-white/5 flex items-center justify-center text-[#8B7CFF] group-hover:bg-[#2F2C44] transition mb-4">
              {scanMutation.isPending ? (
                <RefreshCw className="w-6 h-6 animate-spin text-[#8B7CFF]" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>

            <h3 className="text-sm font-semibold text-white mb-1">
              {scanMutation.isPending ? 'Analyzing with AI Vision...' : 'Drop a document here to scan'}
            </h3>
            <p className="text-xs text-[#8E8EA0] max-w-xs mb-6">
              Click to browse or drop an invoice, receipt, or shipping waybill
            </p>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#262630] text-[11px] font-medium text-[#8E8EA0] border border-white/5">
              <FileText className="w-3.5 h-3.5 text-[#8E8EA0]" />
              <span>Supports PDF, PNG, JPG (Up to 15 MB)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Preview or Empty State (7 cols) */}
        {scanResult === null ? (
          <div className="lg:col-span-7 bg-[#1E1E26] rounded-[24px] p-8 border border-white/5 shadow-sm flex flex-col items-center justify-center text-center min-h-[380px]">
            <div className="w-14 h-14 rounded-2xl bg-[#262630] border border-white/5 flex items-center justify-center text-[#8B7CFF] mb-4">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1.5">No Document Scanned Yet</h3>
            <p className="text-xs text-[#8E8EA0] max-w-sm mb-6">
              Upload a document on the left or click a sample button above. Google Gemini 3.8 Flash Vision will extract line items, detect currency, and stamp a cryptographic SHA-256 seal.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTriggerSample('delivery')}
                disabled={scanMutation.isPending}
                className="px-4 py-2 rounded-full bg-[#262630] hover:bg-[#2F2C44] text-xs font-medium text-white border border-white/5 transition cursor-pointer disabled:opacity-50"
              >
                Scan Test Waybill
              </button>
              <button
                type="button"
                onClick={() => handleTriggerSample('receipt')}
                disabled={scanMutation.isPending}
                className="px-4 py-2 rounded-full bg-[#262630] hover:bg-[#2F2C44] text-xs font-medium text-white border border-white/5 transition cursor-pointer disabled:opacity-50"
              >
                Scan Test Receipt
              </button>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 bg-[#1E1E26] rounded-[24px] p-7 border border-white/5 shadow-sm flex flex-col justify-between">
            <div>
              {/* Card Header with Clear Action */}
              <div className="flex items-center justify-between pb-5 border-b border-white/5">
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8E8EA0]">
                    Extracted Details
                  </span>
                  <h3 className="text-base font-semibold text-white mt-0.5">
                    {scanResult.vendorName}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/20">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {Math.round(scanResult.confidence * 100)}% Confidence
                  </span>

                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-[#8E8EA0]">
                    {scanResult.documentType.replace(/_/g, ' ')}
                  </span>

                  <button
                    type="button"
                    onClick={() => setScanResult(null)}
                    className="w-7 h-7 rounded-full bg-[#262630] hover:bg-white/10 flex items-center justify-center text-[#8E8EA0] hover:text-white transition cursor-pointer ml-1"
                    title="Clear scan"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Extracted Key-Value Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-5 border-b border-white/5">
                <div>
                  <span className="text-[11px] text-[#8E8EA0] block">Document Reference</span>
                  <span className="text-xs font-semibold text-white mt-0.5 block">
                    {scanResult.invoiceNumber}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-[#8E8EA0] block">Issue Date</span>
                  <span className="text-xs font-semibold text-white mt-0.5 block tabular-nums">
                    {scanResult.date}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-[#8E8EA0] block">Protection Status</span>
                  <span className="text-xs font-semibold text-[#34D399] mt-0.5 block">
                    {scanResult.disputeShieldStatus}
                  </span>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="py-4">
                <span className="text-xs font-semibold text-white mb-2.5 block">Extracted Line Items</span>
                <div className="flex flex-col gap-2">
                  {scanResult.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-[14px] bg-[#141418] border border-white/5 text-xs"
                    >
                      <div className="flex items-center gap-2 max-w-[70%]">
                        <span className="w-5 h-5 rounded-full bg-[#1E1E26] flex items-center justify-center text-[10px] text-[#8E8EA0] font-semibold">
                          {item.quantity}x
                        </span>
                        <span className="text-white truncate">{item.description}</span>
                      </div>
                      <span className="font-semibold text-white tabular-nums">
                        {formatCurrency(item.totalCents, scanResult.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SHA-256 Proof Badge */}
              <div className="mt-2 p-3 rounded-[14px] bg-[#141418] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <ShieldCheck className="w-4 h-4 text-[#34D399] shrink-0" />
                  <span className="text-[11px] text-[#8E8EA0] truncate font-mono">
                    SHA-256 Proof: {scanResult.sha256Hash}
                  </span>
                </div>
                <span className="text-[10px] text-[#34D399] font-medium bg-[#34D399]/10 px-2 py-0.5 rounded-full shrink-0">
                  Verified
                </span>
              </div>
            </div>

            {/* Action Footer */}
            <div className="pt-6 mt-4 border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-[#8E8EA0] block">Total Extracted Amount</span>
                <span className="text-2xl font-bold text-white tabular-nums">
                  {formatCurrency(scanResult.totalCents, scanResult.currency)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCreateInvoiceFromScan}
                disabled={createInvoiceMutation.isPending}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white text-xs font-semibold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <span>{createInvoiceMutation.isPending ? 'Generating Invoice...' : 'Create Invoice from Scan'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};