// web/app/(marketing)/layout.tsx
// 목적: 랜딩/인증 페이지 그룹(홈, 로그인, 회원가입 등)
// - URL에 (marketing)은 노출되지 않음
// - UI 강제 변경 없이 children만 그대로 렌더
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
