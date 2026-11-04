import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDateValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getTodayDateValue(): string {
  return formatDateValue(new Date());
}

function parseDateValue(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

export function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = parseDateValue(value);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, [open]);

  const days = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const currentCount = new Date(viewYear, viewMonth + 1, 0).getDate();
    const previousCount = new Date(viewYear, viewMonth, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const currentDay = index - firstWeekday + 1;
      if (currentDay < 1) {
        return { date: new Date(viewYear, viewMonth - 1, previousCount + currentDay), muted: true };
      }
      if (currentDay > currentCount) {
        return { date: new Date(viewYear, viewMonth + 1, currentDay - currentCount), muted: true };
      }
      return { date: new Date(viewYear, viewMonth, currentDay), muted: false };
    });
  }, [viewMonth, viewYear]);

  const moveMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const openCalendar = () => {
    const current = parseDateValue(value);
    setViewYear(current.getFullYear());
    setViewMonth(current.getMonth());
    setOpen((currentOpen) => !currentOpen);
  };

  return (
    <div className="agf-date-picker" ref={ref}>
      <button
        type="button"
        className={`agf-date-picker__input${open ? ' agf-date-picker__input--open' : ''}`}
        onClick={openCalendar}
        aria-label="选择日期"
      >
        <CalendarDays size={15} className="agf-date-picker__icon" />
        <span>{value}</span>
      </button>
      {open && (
        <div className="agf-date-picker__dropdown">
          <div className="agf-date-picker__header">
            <div className="agf-date-picker__nav-group">
              <button type="button" aria-label="上一年" onClick={() => setViewYear((year) => year - 1)}>
                <ChevronsLeft size={16} />
              </button>
              <button type="button" aria-label="上个月" onClick={() => moveMonth(-1)}>
                <ChevronLeft size={16} />
              </button>
            </div>
            <strong>{viewYear} 年&nbsp; {viewMonth + 1} 月</strong>
            <div className="agf-date-picker__nav-group">
              <button type="button" aria-label="下个月" onClick={() => moveMonth(1)}>
                <ChevronRight size={16} />
              </button>
              <button type="button" aria-label="下一年" onClick={() => setViewYear((year) => year + 1)}>
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
          <div className="agf-date-picker__weekdays">
            {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
          </div>
          <div className="agf-date-picker__days">
            {days.map(({ date, muted }) => {
              const dateValue = formatDateValue(date);
              const selectedDay = dateValue === value;
              return (
                <button
                  key={dateValue}
                  type="button"
                  className={[
                    muted ? 'agf-date-picker__day--muted' : '',
                    selectedDay ? 'agf-date-picker__day--selected' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => {
                    onChange(dateValue);
                    setOpen(false);
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
