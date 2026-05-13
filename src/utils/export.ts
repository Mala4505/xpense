import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { formatAmount } from './currency';

export interface ExportTransaction {
  id: string;
  flow: 'IN' | 'OUT';
  amount: number;
  currency: string;
  categoryName: string;
  status: string;
  method: string;
  note?: string;
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
  const filePath = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Transactions CSV',
    });
  }
}

// ─── HTML Report Export ───────────────────────────────────────────────────────

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
  const filePath = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, html, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/html',
      dialogTitle: 'Export Report',
    });
  }
}

// ─── Backup / Restore ─────────────────────────────────────────────────────────

export interface BackupData {
  version: number;
  exportedAt: number;
  transactions: ExportTransaction[];
}

export async function exportBackupJSON(transactions: ExportTransaction[]): Promise<void> {
  const backup: BackupData = {
    version: 1,
    exportedAt: Date.now(),
    transactions,
  };

  const fileName = `xpense_backup_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
  const filePath = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, JSON.stringify(backup, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: 'Backup Xpense Data',
    });
  }
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
