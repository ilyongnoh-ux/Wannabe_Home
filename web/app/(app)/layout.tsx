// web/app/(app)/layout.tsx
// ============================================================
// (app) 그룹 공통 Layout
// - 목적: 로그인 이후 내부 앱 그룹(dashboard, admin, download, 403 등)
// - 원칙(정리):
//   1) "상단 프레임(전역 Header)" 때문에 UI가 2겹으로 겹치며 레이아웃이 깨짐
//      - 각 페이지(예: dashboard/page.tsx)가 이미 Hero 톤의 topNav를 자체 렌더링 중
//   2) 따라서 (app) 레이아웃에서는 전역 Header를 제거하고 children만 렌더링한다.
//   3) 전역 Header로 완전 통합(단일 Header) 방식은 다음 단계에서
//      Hero/Marketing까지 포함해 Header를 공통 컴포넌트로 재설계할 때 진행한다.
// ============================================================

import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  // ✅ (중복 제거) 여기서는 상단 Header를 렌더링하지 않는다.
  // 각 페이지가 자체 topNav를 갖고 있는 현재 구조에서,
  // 전역 Header는 "불필요한 추가 프레임"이 되어 UI를 깨뜨린다.
  return <>{children}</>;
}

/*
[수정 전/후 줄수]
- 전: 약 16줄
- 후: 약 30줄

[체크리스트]
- ✅ 상단 중복 프레임(전역 Header) 제거
- ✅ (app) 그룹 라우팅 구조 유지
- ✅ 인증/구독/미들웨어 로직 영향 없음
- ✅ UI 겹침(흰 상단 바) 원인 제거
*/
