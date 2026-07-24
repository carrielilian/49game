/**
 * @name 代理游戏台账
 * @mode axure
 *
 * 参考资料：
 * - /rules/axure-export-workflow.md
 * - /rules/prototype-development-guide.md
 */
import React, { useMemo, useState } from 'react';
import {
  AnnotationViewer,
  type AnnotationDirectoryRouteNode,
  type AnnotationViewerOptions,
} from '@axhub/annotation';
import { defineHashPageRoute, useHashPage } from '../../common/useHashPage';
import { AdminLayout } from './components/AdminLayout';
import { AnnotationToggle } from './components/AnnotationToggle';
import { OverlayScopeProvider, useOverlayScope } from './components/OverlayScope';
import { GameIncomeFieldHelp } from './components/GameIncomeFieldHelp';
import type { MenuGroup } from './components/Sidebar';
import { AppProvider } from './data/store';
import { ExternalSettlementPage } from './pages/ExternalSettlementPage';
import { FormulaListPage } from './pages/FormulaListPage';
import { GameIncomePage } from './pages/GameIncomePage';
import { GameListPage } from './pages/GameListPage';
import { GamePaymentListPage } from './pages/GamePaymentListPage';
import { InternalSettlementPage } from './pages/InternalSettlementPage';
import { RevenueSummaryPage } from './pages/RevenueSummaryPage';
import { VendorListPage } from './pages/VendorListPage';
import { buildAnnotationSource } from './utils/buildAnnotationSource';
import { useAnnotationPanelWidth } from './utils/annotationPanelWidth';
import { createAnnotationElementResolver } from './utils/resolveAnnotationElement';
import './style.css';

const ROUTE = defineHashPageRoute([
  { id: 'vendor-list', title: '厂商管理' },
  { id: 'game-list', title: '游戏管理' },
  { id: 'formula-list', title: '结算公式管理' },
  { id: 'external-settlement', title: '外部收入结算' },
  { id: 'internal-settlement', title: '内部收入结算' },
  { id: 'internal-refund', title: '内部退款结算' },
  { id: 'game-income', title: '游戏收入管理' },
  { id: 'game-payment-list', title: '游戏付款管理' },
  { id: 'stats-summary', title: '收入汇总统计' },
], { defaultPageId: 'vendor-list' });

const MENU_GROUPS: MenuGroup[] = [
  {
    title: '游戏支付管理',
    items: [
      { id: 'vendor-list', label: '厂商管理' },
      { id: 'game-list', label: '游戏管理' },
    ],
  },
  {
    title: '财务分成管理',
    items: [
      { id: 'formula-list', label: '结算公式管理' },
      { id: 'external-settlement', label: '外部收入结算' },
      { id: 'internal-settlement', label: '内部收入结算' },
      { id: 'internal-refund', label: '内部退款结算' },
      { id: 'game-income', label: '游戏收入管理' },
      { id: 'game-payment-list', label: '游戏付款管理' },
    ],
  },
  {
    title: '数据统计',
    items: [
      { id: 'stats-summary', label: '收入汇总统计' },
    ],
  },
];

const PAGE_META: Record<string, { group: string; title: string }> = {
  'vendor-list': { group: '游戏支付管理', title: '厂商管理' },
  'game-list': { group: '游戏支付管理', title: '游戏管理' },
  'formula-list': { group: '财务分成管理', title: '结算公式管理' },
  'external-settlement': { group: '财务分成管理', title: '外部收入结算' },
  'internal-settlement': { group: '财务分成管理', title: '内部收入结算' },
  'internal-refund': { group: '财务分成管理', title: '内部退款结算' },
  'game-income': { group: '财务分成管理', title: '游戏收入管理' },
  'game-payment-list': { group: '财务分成管理', title: '游戏付款管理' },
  'stats-summary': { group: '数据统计', title: '收入汇总统计' },
};

function PageContent({ pageId }: { pageId: string }) {
  switch (pageId) {
    case 'vendor-list': return <VendorListPage />;
    case 'game-list': return <GameListPage />;
    case 'formula-list': return <FormulaListPage />;
    case 'external-settlement': return <ExternalSettlementPage />;
    case 'internal-settlement': return <InternalSettlementPage key="internal-settlement" type="internal" />;
    case 'internal-refund': return <InternalSettlementPage key="internal-refund" type="refund" />;
    case 'game-income': return <GameIncomePage />;
    case 'game-payment-list': return <GamePaymentListPage />;
    case 'stats-summary': return <RevenueSummaryPage />;
    default: return <VendorListPage />;
  }
}

function AppShell() {
  const { page, setPage } = useHashPage(ROUTE);
  const { overlayOpenRef } = useOverlayScope();
  const [showAnnotation, setShowAnnotation] = useState(true);
  const resolveElement = useMemo(
    () => createAnnotationElementResolver(overlayOpenRef),
    [overlayOpenRef],
  );
  const meta = PAGE_META[page] ?? PAGE_META['vendor-list'];
  const breadcrumbs = useMemo(() => ['业务中台', '代理游戏台账', meta.group, meta.title], [meta]);
  const annotationSource = useMemo(() => buildAnnotationSource(), []);
  const viewerOptions = useMemo<AnnotationViewerOptions>(() => ({
    currentPageId: page,
    showToolbar: true,
    showColorFilter: true,
    defaultMarkerIndexVisible: true,
    emptyWhenNoData: false,
    onDirectoryRoute: (node: AnnotationDirectoryRouteNode) => {
      if (typeof node.route === 'string') setPage(node.route);
    },
  }), [page, setPage]);

  useAnnotationPanelWidth(showAnnotation);

  return (
    <AdminLayout
      menuGroups={MENU_GROUPS}
      activePage={page}
      onNavigate={setPage}
      breadcrumbs={breadcrumbs}
      headerExtra={<AnnotationToggle checked={showAnnotation} onChange={setShowAnnotation} />}
      breadcrumbExtra={
        page === 'game-income' ? <GameIncomeFieldHelp /> : undefined
      }
    >
      <PageContent pageId={page} />
      {showAnnotation && (
        <AnnotationViewer
          source={annotationSource}
          options={viewerOptions}
          resolveElement={resolveElement}
        />
      )}
    </AdminLayout>
  );
}

const Component = function Component() {
  return (
    <AppProvider>
      <OverlayScopeProvider>
        <AppShell />
      </OverlayScopeProvider>
    </AppProvider>
  );
};

export default Component;
