import React, { useState } from 'react';
import { X, Check, ArrowRight } from 'lucide-react';
import { splitAmountIntoCents, formatCurrency } from '../../shared';

export interface NewInvoicePayload {
  invoiceNumber: string;
  client: string;
  email: string;
  projectTitle: string;
  amountCents: number;
  enableThreeStepSplit: boolean;
}

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateInvoice: (payload: NewInvoicePayload) => void;
  initialClient?: string;
  initialTitle?: string;
  initialAmountDollars?: string;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  onCreateInvoice,
  initialClient = '',
  initialTitle = '',
  initialAmountDollars = '3000.00',
}) => {
  const [client, setClient] = useState(initialClient || 'Acme Corp Design');
  const [email, setEmail] = useState('billing@acmecorp.com');
  const [projectTitle, setProjectTitle] = useState(
    initialTitle || 'Web Application & Design System'
  );
  const [amountInput, setAmountInput] = useState(initialAmountDollars);
  const [enableSplit, setEnableSplit] = useState(true);

  if (!isOpen) return null;

  const parsedDollars = parseFloat(amountInput);
  const validCents =
    !Number.isNaN(parsedDollars) && parsedDollars > 0
      ? Math.round(parsedDollars * 100)
      : 0;

  const splitSteps =
    validCents > 0 ? splitAmountIntoCents(validCents, [30, 40, 30]) : [0, 0, 0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validCents <= 0 || !client.trim()) return;

    const randomSuffix = Math.floor(850 + Math.random() * 140);
    onCreateInvoice({
      invoiceNumber: `INV-2026-0${randomSuffix}`,
      client: client.trim(),
      email: email.trim() || 'client@example.com',
      projectTitle: projectTitle.trim() || 'Client Project',
      amountCents: validCents,
      enableThreeStepSplit: enableSplit,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-[#1E1E26] w-full max-w-lg rounded-[24px] border border-white/10 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Create Invoice or Payment Plan</h2>
            <p className="text-xs text-[#8E8EA0] mt-0.5">
              Send a standard PayPal invoice or split the total into 3 project steps
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#262630] hover:bg-white/10 flex items-center justify-center text-[#8E8EA0] hover:text-white transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                Client Name
              </label>
              <input
                type="text"
                required
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="e.g. Stripe Global Inc"
                className="w-full px-3.5 py-2.5 bg-[#141418] rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-[#8B7CFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                Client Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="finance@company.com"
                className="w-full px-3.5 py-2.5 bg-[#141418] rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-[#8B7CFF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                Project or Invoice Description
              </label>
              <input
                type="text"
                required
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="e.g. Q4 Product Redesign"
                className="w-full px-3.5 py-2.5 bg-[#141418] rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-[#8B7CFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                Total Amount (USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#141418] rounded-xl border border-white/10 text-xs font-semibold text-white tabular-nums focus:outline-none focus:border-[#8B7CFF]"
              />
            </div>
          </div>

          {/* Toggle for 3-Step Payment Plan */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setEnableSplit(!enableSplit)}
              className="w-full p-3.5 rounded-2xl bg-[#141418] border border-white/5 flex items-center justify-between text-left cursor-pointer hover:border-white/15 transition"
            >
              <div>
                <p className="text-xs font-semibold text-white">
                  Split into 3 project payment steps (30% / 40% / 30%)
                </p>
                <p className="text-[11px] text-[#8E8EA0] mt-0.5">
                  Automatically calculates exact cent-accurate amounts for each stage
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                  enableSplit
                    ? 'bg-[#8B7CFF] border-[#8B7CFF] text-white'
                    : 'bg-[#262630] border-white/15 text-transparent'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>

          {/* Live 3-Step Math Preview */}
          {enableSplit && validCents > 0 && (
            <div className="grid grid-cols-3 gap-3 bg-[#141418] p-3.5 rounded-2xl border border-white/5">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#8E8EA0] font-semibold">
                  Step 1 · 30%
                </span>
                <p className="text-sm font-bold text-white tabular-nums mt-1">
                  {formatCurrency(splitSteps[0])}
                </p>
                <span className="text-[10px] text-[#8E8EA0]">Project kickoff</span>
              </div>

              <div className="border-l border-white/5 pl-3">
                <span className="text-[10px] uppercase tracking-wider text-[#8E8EA0] font-semibold">
                  Step 2 · 40%
                </span>
                <p className="text-sm font-bold text-white tabular-nums mt-1">
                  {formatCurrency(splitSteps[1])}
                </p>
                <span className="text-[10px] text-[#8E8EA0]">Midpoint review</span>
              </div>

              <div className="border-l border-white/5 pl-3">
                <span className="text-[10px] uppercase tracking-wider text-[#8E8EA0] font-semibold">
                  Step 3 · 30%
                </span>
                <p className="text-sm font-bold text-white tabular-nums mt-1">
                  {formatCurrency(splitSteps[2])}
                </p>
                <span className="text-[10px] text-[#8E8EA0]">Final handoff</span>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-[#262630] hover:bg-[#2F2C44] text-xs font-medium text-white border border-white/5 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#8B7CFF] hover:bg-[#7A6BEE] text-xs font-semibold text-white transition cursor-pointer"
            >
              <span>Create & Send Invoice</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};