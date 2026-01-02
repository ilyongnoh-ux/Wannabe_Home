// web/app/(app)/dashboard/layout.tsx
/**
 * ============================================================
 * Dashboard Layout (중복 상단바 제거)
 * ------------------------------------------------------------
 * 문제:
 * - dashboard 전용 layout.tsx에서 DashboardTopNav를 추가 렌더링하면서
 *   페이지 내부 topNav + layout topNav가 "2겹"으로 겹쳐 보임.
 *
 * 해결:
 * - dashboard 전용 layout은 "아무것도 감싸지 않고 children만 반환"한다.
 * - 상단 네비게이션은 dashboard/page.tsx(또는 추후 전역 Header 통합)에서만 담당.
 * ============================================================
 */

import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // ✅ dashboard 전용 상단바(DashboardTopNav) 삽입 제거
  // ✅ 페이지의 기존 UI(대시보드 카드/배경/상단 topNav)는 그대로 유지
  return <>{children}</>;
}

/*
[수정 전/후 줄수]
- 전: 약 95줄
- 후: 약 30줄

[체크리스트]
- ✅ DashboardTopNav 렌더링 제거(상단 2겹 프레임 제거)
- ✅ dashboard/page.tsx UI는 그대로(레이아웃만 정리)
- ✅ 인증/세션/미들웨어 로직 변경 없음
*/
