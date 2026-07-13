import React from 'react';
import { Download, User } from 'lucide-react';
import { Sidebar, type MenuGroup } from './Sidebar';

interface AdminLayoutProps {
  menuGroups: MenuGroup[];
  activePage: string;
  onNavigate: (pageId: string) => void;
  breadcrumbs: string[];
  breadcrumbExtra?: React.ReactNode;
  children: React.ReactNode;
}

export function AdminLayout({ menuGroups, activePage, onNavigate, breadcrumbs, breadcrumbExtra, children }: AdminLayoutProps) {
  return (
    <div className="agf-app">
      <Sidebar groups={menuGroups} activePage={activePage} onNavigate={onNavigate} />
      <div className="agf-main">
        <header className="agf-header">
          <nav className="agf-breadcrumb" aria-label="面包屑">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={`${crumb}-${i}`}>
                {i > 0 && <span className="agf-breadcrumb__sep">/</span>}
                <span className={i === breadcrumbs.length - 1 ? 'agf-breadcrumb__current' : ''}>{crumb}</span>
              </React.Fragment>
            ))}
            {breadcrumbExtra}
          </nav>
          <div className="agf-header__actions">
            <Download size={18} aria-hidden />
            <User size={18} aria-hidden />
            <span>管理员</span>
          </div>
        </header>
        <main className="agf-content">{children}</main>
      </div>
    </div>
  );
}
