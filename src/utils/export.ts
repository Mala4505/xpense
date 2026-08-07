import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { formatAmount } from './currency';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function writeFile(fileName: string, content: string): File {
  const file = new File(Paths.cache, fileName);
  file.write(content);
  return file;
}

async function shareFile(file: File, mimeType: string, dialogTitle: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing not available on this device');
  }
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExportTransaction {
  id: string;
  flow: 'IN' | 'OUT';
  amount: number;
  currency: string;
  /** Stable category id — preferred for cross-referencing on restore. Optional for backward compat with call sites that only have a name (e.g. report exports). */
  categoryId?: string;
  categoryName: string;
  status: string;
  method: string;
  note?: string;
  loan_id?: string | null;
  paid_amount?: number;
  khumus_share?: number;
  created_at: number;
}

export interface ReportSummary {
  period: string;
  income: number;
  expense: number;
  net: number;
  khumusDue: number;
  currency: string;
  transactions: ExportTransaction[];
  categoryBreakdown: { name: string; amount: number; percentage: number }[];
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function escapeCSV(value: string | number | undefined): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportTransactionsCSV(transactions: ExportTransaction[]): Promise<void> {
  const headers = ['Date', 'Type', 'Currency', 'Amount', 'Category', 'Status', 'Method', 'Khumus Share', 'Note'];
  const rows = transactions.map((t) => [
    format(new Date(t.created_at), 'yyyy-MM-dd HH:mm'),
    t.flow === 'IN' ? 'Income' : 'Expense',
    t.currency,
    t.amount.toFixed(2),
    t.categoryName,
    t.status,
    t.method,
    t.khumus_share ? t.khumus_share.toFixed(2) : '',
    t.note ?? '',
  ]);

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map((r) => r.map(escapeCSV).join(',')),
  ].join('\n');

  const fileName = `xpense_export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
  const file = writeFile(fileName, csvContent);
  await shareFile(file, 'text/csv', 'Export Transactions CSV');
}

// ─── HTML / PDF Report Export ─────────────────────────────────────────────────

function generateHTMLContent(summary: ReportSummary): string {
  const categoryRows = summary.categoryBreakdown
    .map(
      (c) => `
      <tr>
        <td>${escapeHTML(c.name)}</td>
        <td style="text-align:right;">${summary.currency} ${formatAmount(c.amount)}</td>
        <td style="text-align:right;">${c.percentage.toFixed(1)}%</td>
      </tr>`
    )
    .join('');

  const txRows = summary.transactions
    .slice(0, 100)
    .map(
      (t) => `
      <tr>
        <td>${format(new Date(t.created_at), 'dd MMM yyyy')}</td>
        <td style="color:${t.flow === 'IN' ? '#22C87A' : '#E05C5C'};">${t.flow === 'IN' ? '▲' : '▼'} ${t.flow === 'IN' ? 'Income' : 'Expense'}</td>
        <td>${escapeHTML(t.categoryName)}</td>
        <td style="text-align:right;font-family:monospace;">${t.currency} ${formatAmount(t.amount)}</td>
        <td>${t.status}</td>
        <td>${t.method}</td>
        <td>${escapeHTML(t.note ?? '')}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Xpense Report — ${escapeHTML(summary.period)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F5F4FC; color: #1A1040; padding: 24px; }
  h1 { font-size: 22px; color: #1E1058; margin-bottom: 4px; }
  .subtitle { font-size: 13px; color: #9080B8; margin-bottom: 24px; }
  .summary { display: flex; gap: 12px; margin-bottom: 28px; flex-wrap: wrap; }
  .card { background: #fff; border-radius: 14px; padding: 16px 20px; flex: 1; min-width: 120px; border: 1px solid #EEE8F8; }
  .card-label { font-size: 10px; color: #9080B8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .card-value { font-size: 18px; font-weight: 700; font-family: 'Courier New', monospace; }
  .income { color: #22C87A; }
  .expense { color: #E05C5C; }
  .khumus { color: #F0B429; }
  h2 { font-size: 15px; color: #1E1058; margin: 24px 0 12px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #EEE8F8; font-size: 13px; }
  th { background: #1E1058; color: #fff; padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600; letter-spacing: 0.3px; }
  td { padding: 9px 14px; border-bottom: 1px solid #EEE8F8; color: #1A1040; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #F5F4FC; }
  .footer { margin-top: 32px; font-size: 11px; color: #C0B8E0; text-align: center; }
</style>
</head>
<body>
  <h1>Xpense Financial Report</h1>
  <p class="subtitle">${escapeHTML(summary.period)} · Generated ${format(new Date(), 'dd MMM yyyy, h:mm a')}</p>

  <div class="summary">
    <div class="card">
      <div class="card-label">Income</div>
      <div class="card-value income">${summary.currency} ${formatAmount(summary.income)}</div>
    </div>
    <div class="card">
      <div class="card-label">Expense</div>
      <div class="card-value expense">${summary.currency} ${formatAmount(summary.expense)}</div>
    </div>
    <div class="card">
      <div class="card-label">Net Balance</div>
      <div class="card-value" style="color:${summary.net >= 0 ? '#22C87A' : '#E05C5C'};">${summary.net >= 0 ? '+' : '−'}${summary.currency} ${formatAmount(Math.abs(summary.net))}</div>
    </div>
    ${summary.khumusDue > 0 ? `<div class="card"><div class="card-label">Khumus Due</div><div class="card-value khumus">${summary.currency} ${formatAmount(summary.khumusDue)}</div></div>` : ''}
  </div>

  ${
    summary.categoryBreakdown.length > 0
      ? `<h2>Spending by Category</h2>
  <table>
    <thead><tr><th>Category</th><th style="text-align:right;">Amount</th><th style="text-align:right;">Share</th></tr></thead>
    <tbody>${categoryRows}</tbody>
  </table>`
      : ''
  }

  <h2>Transactions (latest 100)</h2>
  <table>
    <thead><tr><th>Date</th><th>Type</th><th>Category</th><th style="text-align:right;">Amount</th><th>Status</th><th>Method</th><th>Note</th></tr></thead>
    <tbody>${txRows}</tbody>
  </table>

  <p class="footer">Generated by Xpense · Personal Finance Tracker</p>
</body>
</html>`;
}

export async function exportPDFReport(summary: ReportSummary): Promise<void> {
  const html = generateHTMLContent(summary);
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf', dialogTitle: 'Export Report' });
  } else {
    throw new Error('Sharing not available on this device');
  }
}

export async function exportHTMLReport(summary: ReportSummary): Promise<void> {
  const html = generateHTMLContent(summary);
  const fileName = `xpense_report_${format(new Date(), 'yyyyMMdd_HHmm')}.html`;
  const file = writeFile(fileName, html);
  await shareFile(file, 'text/html', 'Export Report');
}

// ─── Backup / Restore ─────────────────────────────────────────────────────────

export interface ExportCategory {
  id: string;
  name: string;
  flow_type: string;
  khumus_eligible: number;
  is_loan_type: number;
  color: string;
  icon: string;
  is_system: number;
  sort_order: number;
}

export interface ExportLoan {
  id: string;
  type: string;
  person_name: string;
  principal: number;
  currency: string;
  status: string;
  created_at: number;
}

export interface ExportBudget {
  id: string;
  category_id: string | null;
  month: string;
  amount_limit: number;
  currency: string;
}

export interface BackupData {
  version: number;
  exportedAt: number;
  transactions: ExportTransaction[];
  categories: ExportCategory[];
  loans: ExportLoan[];
  budgets: ExportBudget[];
}

const BACKUP_VERSION = 2;

export async function exportBackupJSON(data: {
  transactions: ExportTransaction[];
  categories: ExportCategory[];
  loans: ExportLoan[];
  budgets: ExportBudget[];
}): Promise<void> {
  const backup: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    transactions: data.transactions,
    categories: data.categories,
    loans: data.loans,
    budgets: data.budgets,
  };

  const jsonContent = JSON.stringify(backup, null, 2);
  const fileName = `xpense_backup_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
  const file = writeFile(fileName, jsonContent);
  await shareFile(file, 'application/json', 'Backup Xpense Data');
}

// ─── Backup validation ──────────────────────────────────────────────────────
// This is the only recovery mechanism for the app's data (no cloud sync), so
// a malformed/tampered file must reject the whole import rather than let
// partially-garbage rows slip into the DB.

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isValidTransactionRow(t: unknown): t is ExportTransaction {
  if (!isPlainObject(t)) return false;
  return (
    typeof t.id === 'string' &&
    (t.flow === 'IN' || t.flow === 'OUT') &&
    typeof t.amount === 'number' &&
    typeof t.currency === 'string' &&
    (t.categoryId === undefined || typeof t.categoryId === 'string') &&
    typeof t.categoryName === 'string' &&
    typeof t.status === 'string' &&
    typeof t.method === 'string' &&
    (t.note === undefined || typeof t.note === 'string') &&
    (t.loan_id === undefined || t.loan_id === null || typeof t.loan_id === 'string') &&
    (t.paid_amount === undefined || typeof t.paid_amount === 'number') &&
    (t.khumus_share === undefined || typeof t.khumus_share === 'number') &&
    typeof t.created_at === 'number'
  );
}

function isValidCategoryRow(c: unknown): c is ExportCategory {
  if (!isPlainObject(c)) return false;
  return (
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    typeof c.flow_type === 'string' &&
    typeof c.khumus_eligible === 'number' &&
    typeof c.is_loan_type === 'number' &&
    typeof c.color === 'string' &&
    typeof c.icon === 'string' &&
    typeof c.is_system === 'number' &&
    typeof c.sort_order === 'number'
  );
}

function isValidLoanRow(l: unknown): l is ExportLoan {
  if (!isPlainObject(l)) return false;
  return (
    typeof l.id === 'string' &&
    typeof l.type === 'string' &&
    typeof l.person_name === 'string' &&
    typeof l.principal === 'number' &&
    typeof l.currency === 'string' &&
    typeof l.status === 'string' &&
    typeof l.created_at === 'number'
  );
}

function isValidBudgetRow(b: unknown): b is ExportBudget {
  if (!isPlainObject(b)) return false;
  return (
    typeof b.id === 'string' &&
    (b.category_id === null || typeof b.category_id === 'string') &&
    typeof b.month === 'string' &&
    typeof b.amount_limit === 'number' &&
    typeof b.currency === 'string'
  );
}

export async function readBackupFile(): Promise<BackupData> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) {
    throw new Error('cancelled');
  }
  let raw: unknown;
  try {
    const content = await new File(result.assets[0].uri).text();
    raw = JSON.parse(content);
  } catch {
    throw new Error('invalid');
  }

  if (!isPlainObject(raw)) throw new Error('invalid');
  if (typeof raw.version !== 'number' || typeof raw.exportedAt !== 'number') {
    throw new Error('invalid');
  }
  if (!Array.isArray(raw.transactions) || !raw.transactions.every(isValidTransactionRow)) {
    throw new Error('invalid');
  }

  // Missing arrays (version-1 backups) are treated as empty; present arrays
  // must validate row-by-row or the whole file is rejected.
  let categories: ExportCategory[] = [];
  if (raw.categories !== undefined) {
    if (!Array.isArray(raw.categories) || !raw.categories.every(isValidCategoryRow)) {
      throw new Error('invalid');
    }
    categories = raw.categories;
  }

  let loans: ExportLoan[] = [];
  if (raw.loans !== undefined) {
    if (!Array.isArray(raw.loans) || !raw.loans.every(isValidLoanRow)) {
      throw new Error('invalid');
    }
    loans = raw.loans;
  }

  let budgets: ExportBudget[] = [];
  if (raw.budgets !== undefined) {
    if (!Array.isArray(raw.budgets) || !raw.budgets.every(isValidBudgetRow)) {
      throw new Error('invalid');
    }
    budgets = raw.budgets;
  }

  return {
    version: raw.version,
    exportedAt: raw.exportedAt,
    transactions: raw.transactions,
    categories,
    loans,
    budgets,
  };
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
