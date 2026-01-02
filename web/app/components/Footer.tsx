// web/app/components/Footer.tsx
"use client";

import React from "react";

/**
 * Footer (공통 컴포넌트)
 * - Hero/대시보드 등 어디서든 동일한 톤으로 재사용
 * - "항상 화면 맨 아래" 고정이 필요한 화면에서는 variant="fixed" 사용
 * - 일반 페이지(스크롤 있는 페이지)는 variant="static" 권장
 */
export default function Footer({
  variant = "fixed",
}: {
  variant?: "fixed" | "static";
}) {
  const base: React.CSSProperties = {
    width: "100%",
    textAlign: "center",
    fontSize: 12,
    color: "#ffffff",
    opacity: 0.65,
    pointerEvents: "none",
  };

  const fixed: React.CSSProperties = {
    ...base,
    position: "fixed",
    left: 0,
    bottom: 20,
    zIndex: 10,
  };

  const stat: React.CSSProperties = {
    ...base,
    position: "relative",
    padding: "18px 0 10px",
  };

  return (
    <div style={variant === "fixed" ? fixed : stat}>
      Copyright © 2025 Korea Financial Investment Technology(KFIT). All rights reserved.
    </div>
  );
}

/*
[수정 전/후 줄수]
- 전: (신규 파일)
- 후: 약 55줄

[체크리스트]
- ✅ 공통 Footer 컴포넌트 생성
- ✅ fixed/static 2가지 사용 방식 제공
*/
