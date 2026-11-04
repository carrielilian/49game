import React, { useEffect, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';
import {
  formatMonthRangeLabel,
  formatYearMonth,
  getDefaultMonthRange,
  normalizeMonthRange,
  parseYearMonth,
  type MonthRange,
} from '../utils/monthRange';

const MONTH_LABELS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

interface MonthRangePickerProps {
  value: MonthRange;
  onChange: (value: MonthRange) => void;
}

function isFutureMonth(year: number, month: number): boolean {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  return year > cy || (year === cy && month > cm);
}

function isBetweenRange(year: number, month: number, range: MonthRange, hasEnd: boolean): boolean {
  if (!hasEnd) return false;
  const ym = formatYearMonth(year, month);
  const { start, end } = normalizeMonthRange(range.start, range.end);
  return ym > start && ym < end;
}

function isRangeEndpoint(year: number, month: number, range: MonthRange): 'start' | 'end' | false {
  const ym = formatYearMonth(year, month);
  const { start, end } = normalizeMonthRange(range.start, range.end);
  if (ym === start) return 'start';
  if (ym === end) return 'end';
  return false;
}

function MonthPanel({
  year,
  range,
  pendingEnd,
  onPick,
  onPrevYear,
  onNextYear,
  showPrev,
  showNext,
}: {
  year: number;
  range: MonthRange;
  pendingEnd: boolean;
  onPick: (year: number, month: number) => void;
  onPrevYear?: () => void;
  onNextYear?: () => void;
  showPrev?: boolean;
  showNext?: boolean;
}) {
  const normalized = normalizeMonthRange(range.start, range.end);
  const hasEnd = pendingEnd || normalized.start !== normalized.end || range.start === range.end;

  return (
    <div className="agf-month-panel">
      <div className="agf-month-panel__header">
        {showPrev ? (
          <button type="button" className="agf-month-panel__nav" onClick={onPrevYear} aria-label="上一年">
            «
          </button>
        ) : <span className="agf-month-panel__nav agf-month-panel__nav--placeholder" />}
        <span className="agf-month-panel__year">{year} 年</span>
        {showNext ? (
          <button type="button" className="agf-month-panel__nav" onClick={onNextYear} aria-label="下一年">
            »
          </button>
        ) : <span className="agf-month-panel__nav agf-month-panel__nav--placeholder" />}
      </div>
      <div className="agf-month-panel__grid">
        {MONTH_LABELS.map((label, idx) => {
          const month = idx + 1;
          const disabled = isFutureMonth(year, month);
          const endpoint = isRangeEndpoint(year, month, normalized);
          const inRange = isBetweenRange(year, month, normalized, hasEnd);
          const classes = [
            'agf-month-panel__cell',
            disabled ? 'agf-month-panel__cell--disabled' : '',
            endpoint === 'start' ? 'agf-month-panel__cell--start' : '',
            endpoint === 'end' ? 'agf-month-panel__cell--end' : '',
            inRange ? 'agf-month-panel__cell--in-range' : '',
          ].filter(Boolean).join(' ');

          return (
            <button
              key={label}
              type="button"
              className={classes}
              disabled={disabled}
              onClick={() => onPick(year, month)}
            >
              <span className="agf-month-panel__cell-label">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MonthRangePicker({ value, onChange }: MonthRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MonthRange>(value);
  const [pickingEnd, setPickingEnd] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { year: endYear } = parseYearMonth(value.end);
  const [rightYear, setRightYear] = useState(endYear);
  const leftYear = rightYear - 1;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setDraft(value);
        setPickingEnd(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, value]);

  const openPicker = () => {
    setDraft(value);
    setPickingEnd(false);
    const { year } = parseYearMonth(value.end);
    setRightYear(year);
    setOpen(true);
  };

  const handlePick = (year: number, month: number) => {
    const ym = formatYearMonth(year, month);
    if (!pickingEnd) {
      setDraft({ start: ym, end: ym });
      setPickingEnd(true);
      return;
    }
    const next = normalizeMonthRange(draft.start, ym);
    setDraft(next);
    setPickingEnd(false);
    onChange(next);
    setOpen(false);
  };

  return (
    <div className="agf-month-range" ref={ref}>
      <button
        type="button"
        className={`agf-month-range__input${open ? ' agf-month-range__input--open' : ''}`}
        onClick={openPicker}
      >
        <Calendar size={14} className="agf-month-range__icon" />
        <span>{formatMonthRangeLabel(value)}</span>
      </button>
      {open && (
        <div className="agf-month-range__dropdown">
          <div className="agf-month-range__panels">
            <MonthPanel
              year={leftYear}
              range={draft}
              pendingEnd={pickingEnd}
              onPick={handlePick}
              onPrevYear={() => setRightYear((y) => y - 1)}
              showPrev
            />
            <MonthPanel
              year={rightYear}
              range={draft}
              pendingEnd={pickingEnd}
              onPick={handlePick}
              onNextYear={() => setRightYear((y) => y + 1)}
              showNext
            />
          </div>
        </div>
      )}
    </div>
  );
}

export { getDefaultMonthRange };
