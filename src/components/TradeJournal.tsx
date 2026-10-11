import React, { useState, useMemo } from 'react';
import { OrderHistoryItem } from '../types/terminal';
import { sounds } from '../utils/audio';
import { formatPrice } from '../utils/format';
import { exportOrderHistoryToCSV } from '../utils/csvExport';
import {
  BookOpen,
  Tag,
  Plus,
  X,
  Check,
  Search,
  Filter,
  Sparkles,
  Smile,
  Frown,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Edit3,
  Copy,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface TradeJournalProps {
  orderHistory: OrderHistoryItem[];
  onUpdateOrderHistory: (id: string, updates: Partial<OrderHistoryItem>) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const PRESET_TAGS = [
  { label: 'Followed plan', color: 'bg-[#26a69a]/15 text-[#26a69a] border-[#26a69a]/40 hover:bg-[#26a69a]/25' },
  { label: 'Disciplined', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25' },
  { label: 'Over-leveraged', color: 'bg-[#f97316]/15 text-[#f97316] border-[#f97316]/40 hover:bg-[#f97316]/25' },
  { label: 'FOMO entry', color: 'bg-[#eab308]/15 text-[#eab308] border-[#eab308]/40 hover:bg-[#eab308]/25' },
  { label: 'Early exit', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/40 hover:bg-indigo-500/25' },
  { label: 'Revenge trade', color: 'bg-[#f23645]/15 text-[#f23645] border-[#f23645]/40 hover:bg-[#f23645]/25' },
  { label: 'Chased price', color: 'bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25' },
  { label: 'ICT setup', color: 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/40 hover:bg-[#38bdf8]/25' },
];

export const TradeJournal: React.FC<TradeJournalProps> = ({
  orderHistory,
  onUpdateOrderHistory,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'WINS' | 'LOSSES'>('ALL');
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [activeNoteText, setActiveNoteText] = useState<string>('');
  const [newCustomTag, setNewCustomTag] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [isExportedCsv, setIsExportedCsv] = useState<boolean>(false);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  // Journal metrics
  const stats = useMemo(() => {
    const total = orderHistory.length;
    if (total === 0) return { total: 0, disciplinedPercent: 0, taggedCount: 0, mostCommonTag: 'None' };

    let disciplinedCount = 0;
    let taggedCount = 0;
    const tagFrequencies: Record<string, number> = {};

    orderHistory.forEach((item) => {
      if ((item.tags && item.tags.length > 0) || item.notes) {
        taggedCount++;
      }
      if (item.tags?.includes('Followed plan') || item.tags?.includes('Disciplined') || item.sentiment === 'DISCIPLINED') {
        disciplinedCount++;
      }
      item.tags?.forEach((tag) => {
        tagFrequencies[tag] = (tagFrequencies[tag] || 0) + 1;
      });
    });

    let maxTag = 'None';
    let maxCount = 0;
    Object.entries(tagFrequencies).forEach(([tag, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxTag = `${tag} (${count})`;
      }
    });

    const disciplinedPercent = Math.round((disciplinedCount / total) * 100);
    return {
      total,
      disciplinedPercent,
      taggedCount,
      mostCommonTag: maxTag,
    };
  }, [orderHistory]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orderHistory.filter((item) => {
      // Query search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSymbol = item.symbol.toLowerCase().includes(query);
        const matchesNotes = item.notes?.toLowerCase().includes(query);
        const matchesTags = item.tags?.some((t) => t.toLowerCase().includes(query));
        if (!matchesSymbol && !matchesNotes && !matchesTags) return false;
      }

      // Outcome filter
      if (outcomeFilter === 'WINS' && item.pnl < 0) return false;
      if (outcomeFilter === 'LOSSES' && item.pnl >= 0) return false;

      // Tag filter
      if (selectedTagFilter !== 'ALL') {
        if (!item.tags?.includes(selectedTagFilter)) return false;
      }

      return true;
    });
  }, [orderHistory, searchQuery, outcomeFilter, selectedTagFilter]);

  // Handle opening note edit
  const handleStartEdit = (trade: OrderHistoryItem) => {
    setEditingTradeId(trade.id);
    setActiveNoteText(trade.notes || '');
    sounds.playClick();
  };

  // Save active note
  const handleSaveNote = (tradeId: string) => {
    onUpdateOrderHistory(tradeId, { notes: activeNoteText });
    setEditingTradeId(null);
    setSavedSuccessId(tradeId);
    sounds.playOrderFill();
    setTimeout(() => {
      setSavedSuccessId((prev) => (prev === tradeId ? null : prev));
    }, 2000);
  };

  // Toggle tag on trade
  const handleToggleTag = (trade: OrderHistoryItem, tagLabel: string) => {
    const currentTags = trade.tags || [];
    let updatedTags: string[];
    let updatedSentiment = trade.sentiment;

    if (currentTags.includes(tagLabel)) {
      updatedTags = currentTags.filter((t) => t !== tagLabel);
    } else {
      updatedTags = [...currentTags, tagLabel];
    }

    // Auto deduce sentiment if applicable
    if (tagLabel === 'Followed plan' || tagLabel === 'Disciplined') {
      updatedSentiment = updatedTags.includes(tagLabel) ? 'DISCIPLINED' : updatedSentiment;
    } else if (tagLabel === 'Revenge trade') {
      updatedSentiment = updatedTags.includes(tagLabel) ? 'REVENGE' : updatedSentiment;
    } else if (tagLabel === 'Over-leveraged' || tagLabel === 'FOMO entry') {
      updatedSentiment = updatedTags.includes(tagLabel) ? 'EMOTIONAL' : updatedSentiment;
    }

    onUpdateOrderHistory(trade.id, {
      tags: updatedTags,
      sentiment: updatedSentiment,
    });
    sounds.playClick();
  };

  // Add custom tag
  const handleAddCustomTag = (trade: OrderHistoryItem) => {
    if (!newCustomTag.trim()) return;
    const cleanTag = newCustomTag.trim();
    const currentTags = trade.tags || [];
    if (!currentTags.includes(cleanTag)) {
      onUpdateOrderHistory(trade.id, {
        tags: [...currentTags, cleanTag],
      });
    }
    setNewCustomTag('');
    sounds.playClick();
  };

  // Export Journal to Clipboard
  const handleExportJournal = () => {
    const summary = orderHistory
      .map((t) => {
        return `[${t.closedAt}] ${t.symbol} ${t.side} (${t.lots} lots) | PnL: ${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)} | Status: ${t.status}\nTags: ${t.tags?.join(', ') || 'None'}\nNotes: ${t.notes || 'No reflections recorded.'}\n---`;
      })
      .join('\n');

    navigator.clipboard.writeText(summary);
    setCopiedNotification(true);
    sounds.playClick();
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Export Journal & Closed Orders to CSV file
  const handleExportCSV = () => {
    const success = exportOrderHistoryToCSV(filteredOrders);
    if (success) {
      sounds.playClick();
      setIsExportedCsv(true);
      setTimeout(() => setIsExportedCsv(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0e14] text-[#dfe2f2] text-[11px] font-mono select-none">
      {/* 1. Header Toolbar & Quick Stats */}
      <div className="px-3 py-2 border-b border-[#1e222d] bg-[#10141f] flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Left: Summary Badges */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#131722] border border-[#2a2e39]">
            <BookOpen className="w-3.5 h-3.5 text-[#f8bd42]" />
            <span className="text-[#787b86]">ENTRIES:</span>
            <span className="font-bold text-[#dfe2f2]">
              {stats.taggedCount}/{stats.total}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#131722] border border-[#2a2e39]">
            <Sparkles className="w-3.5 h-3.5 text-[#26a69a]" />
            <span className="text-[#787b86]">DISCIPLINE SCORE:</span>
            <span
              className={`font-bold ${
                stats.disciplinedPercent >= 60 ? 'text-[#26a69a]' : 'text-[#f97316]'
              }`}
            >
              {stats.disciplinedPercent}%
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-[#131722] border border-[#2a2e39]">
            <Tag className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span className="text-[#787b86]">TOP PATTERN:</span>
            <span className="font-semibold text-[#dfe2f2]">{stats.mostCommonTag}</span>
          </div>
        </div>

        {/* Right: Controls & Filters */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-2 text-[#787b86]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol or notes..."
              className="pl-6 pr-2 py-1 w-32 md:w-44 bg-[#131722] border border-[#2a2e39] rounded text-[10px] text-[#dfe2f2] placeholder-[#787b86] focus:outline-hidden focus:border-[#f8bd42]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1.5 text-[#787b86] hover:text-[#dfe2f2]"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* Result Filter */}
          <div className="flex items-center bg-[#131722] border border-[#2a2e39] rounded p-0.5 text-[10px]">
            <button
              onClick={() => {
                setOutcomeFilter('ALL');
                sounds.playClick();
              }}
              className={`px-2 py-0.5 rounded ${
                outcomeFilter === 'ALL' ? 'bg-[#2a2e39] text-[#dfe2f2] font-semibold' : 'text-[#787b86]'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => {
                setOutcomeFilter('WINS');
                sounds.playClick();
              }}
              className={`px-2 py-0.5 rounded ${
                outcomeFilter === 'WINS' ? 'bg-[#26a69a]/20 text-[#26a69a] font-semibold' : 'text-[#787b86]'
              }`}
            >
              WINS
            </button>
            <button
              onClick={() => {
                setOutcomeFilter('LOSSES');
                sounds.playClick();
              }}
              className={`px-2 py-0.5 rounded ${
                outcomeFilter === 'LOSSES' ? 'bg-[#f23645]/20 text-[#f23645] font-semibold' : 'text-[#787b86]'
              }`}
            >
              LOSSES
            </button>
          </div>

          {/* Export to Clipboard Button */}
          <button
            onClick={handleExportJournal}
            title="Export Trade Journal summary to clipboard"
            className="flex items-center gap-1 px-2 py-1 bg-[#131722] hover:bg-[#1e222d] border border-[#2a2e39] hover:border-[#f8bd42]/50 text-[10px] text-[#dfe2f2] rounded transition-colors cursor-pointer"
          >
            {copiedNotification ? (
              <>
                <Check className="w-3 h-3 text-[#26a69a]" />
                <span className="text-[#26a69a]">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-[#787b86]" />
                <span className="hidden md:inline">Copy Text</span>
              </>
            )}
          </button>

          {/* Export to CSV File Button */}
          <button
            onClick={handleExportCSV}
            title="Export Trade Journal & closed orders to CSV file for Excel"
            className="flex items-center gap-1 px-2.5 py-1 bg-[#18221f] hover:bg-[#1f2d29] border border-[#26a69a]/40 hover:border-[#26a69a] text-[10px] text-[#26a69a] font-bold rounded transition-colors cursor-pointer"
          >
            {isExportedCsv ? (
              <>
                <Check className="w-3 h-3 text-[#26a69a]" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-3 h-3" />
                <span>Export CSV</span>
              </>
            )}
          </button>

          {/* Optional expand toggle if provided */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              title={isExpanded ? 'Collapse panel' : 'Expand panel'}
              className="p-1 hover:bg-[#1e222d] rounded text-[#787b86] hover:text-[#dfe2f2]"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* 2. Filter Pills for Quick Tag Filtering */}
      <div className="px-3 py-1.5 border-b border-[#1e222d]/70 bg-[#0f121a] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-[10px]">
        <span className="text-[#787b86] uppercase flex items-center gap-1 shrink-0 mr-1">
          <Filter className="w-3 h-3" /> Filter Tag:
        </span>
        <button
          onClick={() => {
            setSelectedTagFilter('ALL');
            sounds.playClick();
          }}
          className={`px-2 py-0.5 rounded border transition-colors cursor-pointer shrink-0 ${
            selectedTagFilter === 'ALL'
              ? 'bg-[#f8bd42]/20 border-[#f8bd42] text-[#f8bd42] font-semibold'
              : 'border-[#2a2e39] text-[#787b86] hover:text-[#dfe2f2] hover:border-[#3e4452]'
          }`}
        >
          All Tags
        </button>
        {PRESET_TAGS.map((tag) => (
          <button
            key={tag.label}
            onClick={() => {
              setSelectedTagFilter((prev) => (prev === tag.label ? 'ALL' : tag.label));
              sounds.playClick();
            }}
            className={`px-2 py-0.5 rounded border transition-colors cursor-pointer shrink-0 ${
              selectedTagFilter === tag.label
                ? 'bg-[#f8bd42]/20 border-[#f8bd42] text-[#f8bd42] font-semibold'
                : 'border-[#2a2e39] text-[#787b86] hover:text-[#dfe2f2] hover:border-[#3e4452]'
            }`}
          >
            {tag.label}
          </button>
        ))}
      </div>

      {/* 3. Trades Journal List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-[#787b86]">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#f8bd42]" />
            <p className="font-semibold">No trade journal records found matching the criteria.</p>
            <p className="text-[10px] mt-1 text-[#555a68]">
              Try adjusting your search terms or filters above.
            </p>
          </div>
        ) : (
          filteredOrders.map((trade) => {
            const isProfitable = trade.pnl >= 0;
            const isEditing = editingTradeId === trade.id;
            const hasNotes = Boolean(trade.notes && trade.notes.trim().length > 0);
            const tradeTags = trade.tags || [];

            return (
              <div
                key={trade.id}
                className="bg-[#131722] border border-[#2a2e39] hover:border-[#3e4452] rounded p-2.5 transition-all shadow-xs"
              >
                {/* Trade Row Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1e222d]/60">
                  {/* Left: Trade Specs */}
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#f8bd42] text-[12px]">{trade.symbol}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        trade.side === 'BUY'
                          ? 'bg-[#26a69a]/20 text-[#26a69a] border border-[#26a69a]/40'
                          : 'bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/40'
                      }`}
                    >
                      {trade.side} {trade.lots}L
                    </span>
                    <span className="text-[#787b86] text-[10px]">{trade.closedAt}</span>
                    <span className="text-[#555a68] text-[10px]">
                      {formatPrice(trade.entryPrice, 2)} &rarr; {formatPrice(trade.exitPrice, 2)}
                    </span>
                  </div>

                  {/* Right: Outcome & PnL */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        trade.status === 'TP_HIT'
                          ? 'bg-[#26a69a]/15 text-[#26a69a]'
                          : trade.status === 'SL_HIT'
                          ? 'bg-[#f23645]/15 text-[#f23645]'
                          : 'bg-[#1e222d] text-[#dfe2f2]'
                      }`}
                    >
                      {trade.status}
                    </span>

                    <span
                      className={`font-bold text-[12px] ${
                        isProfitable ? 'text-[#26a69a]' : 'text-[#f23645]'
                      }`}
                    >
                      {isProfitable ? '+' : ''}${trade.pnl.toFixed(2)} ({isProfitable ? '+' : ''}
                      {trade.pnlPercent.toFixed(1)}%)
                    </span>

                    {savedSuccessId === trade.id && (
                      <span className="flex items-center gap-1 text-[#26a69a] text-[10px] animate-pulse">
                        <Check className="w-3 h-3" /> Saved!
                      </span>
                    )}
                  </div>
                </div>

                {/* Sentiment & Tags Section */}
                <div className="pt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[#787b86] text-[10px] flex items-center gap-1 mr-1">
                    <Tag className="w-2.5 h-2.5" /> Tags:
                  </span>

                  {/* Assigned Tags */}
                  {tradeTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#1e222d] border border-[#3e4452] text-[#dfe2f2]"
                    >
                      {tag}
                      <button
                        onClick={() => handleToggleTag(trade, tag)}
                        title={`Remove "${tag}"`}
                        className="hover:text-[#f23645] cursor-pointer"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}

                  {/* Quick-toggle preset tag buttons */}
                  {PRESET_TAGS.filter((p) => !tradeTags.includes(p.label)).map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => handleToggleTag(trade, preset.label)}
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] border transition-colors cursor-pointer ${preset.color}`}
                    >
                      <Plus className="w-2.5 h-2.5" />
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Notes Section: View & Inline Edit */}
                <div className="mt-2 pt-2 border-t border-[#1e222d]/40">
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-[#f8bd42] flex items-center gap-1">
                          <Edit3 className="w-3 h-3" /> Trade Reflection & Analysis:
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingTradeId(null)}
                            className="px-2 py-0.5 bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-[#dfe2f2] rounded text-[10px] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveNote(trade.id)}
                            className="px-2.5 py-0.5 bg-[#26a69a] hover:bg-[#208b81] text-white font-bold rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Check className="w-3 h-3" /> Save Note
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={activeNoteText}
                        onChange={(e) => setActiveNoteText(e.target.value)}
                        placeholder="Why did you take this trade? Did you follow your trading plan? What were your emotions at entry and exit? Lessons learned..."
                        rows={3}
                        className="w-full bg-[#0a0d14] border border-[#2a2e39] focus:border-[#f8bd42] rounded p-2 text-[11px] text-[#dfe2f2] placeholder-[#555a68] focus:outline-hidden resize-y font-sans"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3 group">
                      <div className="flex-1">
                        {hasNotes ? (
                          <div className="text-[11px] font-sans text-[#cbd5e1] bg-[#0a0d14]/70 p-2 rounded border border-[#1e222d] whitespace-pre-wrap leading-relaxed">
                            {trade.notes}
                          </div>
                        ) : (
                          <div className="text-[10px] text-[#555a68] italic py-1 flex items-center gap-1">
                            <Edit3 className="w-2.5 h-2.5" /> No trade notes added yet. Click &quot;Add Note&quot; to log your execution thoughts.
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleStartEdit(trade)}
                        className="px-2 py-1 bg-[#1e222d] hover:bg-[#2a2e39] hover:text-[#f8bd42] text-[#787b86] rounded text-[10px] font-medium flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        {hasNotes ? 'Edit Note' : '+ Add Note'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
