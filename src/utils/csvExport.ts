import { OrderHistoryItem } from '../types/terminal';

/**
 * Escapes a single CSV cell according to RFC 4180 rules:
 * - Surrounds content with quotes if it contains commas, newlines, or quotes
 * - Doubles any internal quotes (" -> "")
 */
function escapeCsvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) {
    return '""';
  }
  const str = String(value);
  // If string contains comma, quote, or newline, escape quotes and wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Formats an array of OrderHistoryItem objects into a pristine RFC 4180 CSV string
 */
export function formatOrderHistoryToCSV(orders: OrderHistoryItem[]): string {
  const headers = [
    'Trade ID',
    'Date & Time',
    'Symbol',
    'Side',
    'Volume (Lots)',
    'Entry Price',
    'Exit Price',
    'Realized PnL ($)',
    'Return (%)',
    'Outcome',
    'Exit Status',
    'Execution Sentiment',
    'Trading Tags',
    'Journal Notes',
  ];

  const rows = orders.map((order) => {
    const outcome = order.pnl > 0 ? 'WIN' : order.pnl < 0 ? 'LOSS' : 'BREAKEVEN';
    const tagsStr = (order.tags || []).join('; ');
    const notesStr = order.notes || '';

    return [
      escapeCsvCell(order.id),
      escapeCsvCell(order.closedAt),
      escapeCsvCell(order.symbol),
      escapeCsvCell(order.side),
      escapeCsvCell(order.lots),
      escapeCsvCell(order.entryPrice),
      escapeCsvCell(order.exitPrice),
      escapeCsvCell(order.pnl.toFixed(2)),
      escapeCsvCell(order.pnlPercent.toFixed(2)),
      escapeCsvCell(outcome),
      escapeCsvCell(order.status),
      escapeCsvCell(order.sentiment || 'NEUTRAL'),
      escapeCsvCell(tagsStr),
      escapeCsvCell(notesStr),
    ].join(',');
  });

  // Prepend UTF-8 BOM (\uFEFF) so Excel and third-party software display special characters correctly
  return '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');
}

/**
 * Triggers a browser download of the Order History CSV file
 */
export function exportOrderHistoryToCSV(orders: OrderHistoryItem[], filename?: string): boolean {
  try {
    if (!orders || orders.length === 0) {
      return false;
    }

    const csvContent = formatOrderHistoryToCSV(orders);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const defaultFilename = `QuantTerminal_OrderHistory_${new Date().toISOString().split('T')[0]}.csv`;
    const finalFilename = filename || defaultFilename;

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', finalFilename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Failed to export order history to CSV:', error);
    return false;
  }
}
