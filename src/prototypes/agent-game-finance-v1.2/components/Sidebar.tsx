import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
}

export interface MenuGroup {
  title: string;
  items: MenuItem[];
}

interface SidebarProps {
  groups: MenuGroup[];
  activePage: string;
  onNavigate: (pageId: string) => void;
}

export function Sidebar({ groups, activePage, onNavigate }: SidebarProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.title, true])),
  );

  const toggle = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside className="agf-sidebar">
      <div className="agf-sidebar__logo">代理游戏台账</div>
      <nav className="agf-sidebar__nav">
        {groups.map((group) => (
          <div key={group.title}>
            <div className="agf-sidebar__parent" onClick={() => toggle(group.title)} role="button" tabIndex={0}>
              <span>{group.title}</span>
              {openGroups[group.title] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
            {openGroups[group.title] && (
              <div className="agf-sidebar__sub">
                {group.items.map((item) => (
                  <div key={item.id} className="agf-sidebar__item">
                    <button
                      type="button"
                      className={`agf-sidebar__item-btn${activePage === item.id ? ' agf-sidebar__item-btn--active' : ''}`}
                      onClick={() => onNavigate(item.id)}
                    >
                      {item.label}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
