import { describe, it, expect } from 'vitest';
import {
  splitAmountIntoCents,
  toPayPalMoney,
  fromPayPalMoney,
  formatCurrency,
  InvoiceSchema,
  StudioCanvasDirectiveSchema,
} from '../../src/shared';

describe('Shared Contracts & Deterministic Penny Math', () => {
  describe('splitAmountIntoCents', () => {
    it('splits exactly 10,000 cents ($100.00) into 30/40/30 tranches', () => {
      const splits = splitAmountIntoCents(10000, [30, 40, 30]);
      expect(splits).toEqual([3000, 4000, 3000]);
      expect(splits.reduce((a, b) => a + b, 0)).toBe(10000);
    });

    it('absorbs remainder cents without penny drift on $100.01 (10,001 cents)', () => {
      const splits = splitAmountIntoCents(10001, [30, 40, 30]);
      // 30% of 10001 = 3000
      // 40% of 10001 = 4000
      // final = 10001 - 7000 = 3001
      expect(splits).toEqual([3000, 4000, 3001]);
      expect(splits.reduce((a, b) => a + b, 0)).toBe(10001);
    });

    it('handles small cent values accurately (5 cents across 30/40/30)', () => {
      const splits = splitAmountIntoCents(5, [30, 40, 30]);
      expect(splits.reduce((a, b) => a + b, 0)).toBe(5);
    });

    it('throws error for non-integer or negative cents', () => {
      expect(() => splitAmountIntoCents(100.5, [30, 70])).toThrow();
      expect(() => splitAmountIntoCents(-50, [50, 50])).toThrow();
    });
  });

  describe('PayPal Currency Conversions', () => {
    it('converts integer cents to PayPal money string with 2 decimal places', () => {
      expect(toPayPalMoney(10000)).toEqual({ currency_code: 'USD', value: '100.00' });
      expect(toPayPalMoney(50)).toEqual({ currency_code: 'USD', value: '0.50' });
      expect(toPayPalMoney(1)).toEqual({ currency_code: 'USD', value: '0.01' });
    });

    it('converts PayPal money string to integer cents accurately', () => {
      expect(fromPayPalMoney('100.00')).toBe(10000);
      expect(fromPayPalMoney('100.01')).toBe(10001);
      expect(fromPayPalMoney('0.99')).toBe(99);
      expect(fromPayPalMoney(125.45)).toBe(12545);
    });

    it('formats display currency properly', () => {
      expect(formatCurrency(8030000)).toBe('$80,300.00');
      expect(formatCurrency(36994)).toBe('$369.94');
    });
  });

  describe('Zod Schemas Validation', () => {
    it('validates StudioCanvasDirective with valid active tab', () => {
      const validDirective = {
        activeTab: 'OVERVIEW',
        widgetHighlight: 'total-balance-card',
      };
      const parsed = StudioCanvasDirectiveSchema.parse(validDirective);
      expect(parsed.activeTab).toBe('OVERVIEW');
    });

    it('validates a complete Invoice schema', () => {
      const validInvoice = {
        id: 'inv-001',
        invoiceNumber: 'INV-2026-001',
        clientName: 'Acme Corp',
        clientEmail: 'billing@acme.com',
        amountCents: 500000,
        currency: 'USD',
        status: 'PAID',
        dueDate: '2026-11-01',
        createdAt: '2026-10-20',
      };
      const parsed = InvoiceSchema.parse(validInvoice);
      expect(parsed.status).toBe('PAID');
    });
  });
});