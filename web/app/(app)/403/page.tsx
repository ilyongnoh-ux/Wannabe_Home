// web/app/403/page.tsx
import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>403 Forbidden</h1>
      <p>권한이 없습니다.</p>
      <p style={{ marginTop: 12 }}>
        <Link href="/">홈으로</Link> · <Link href="/dashboard">대시보드</Link>
      </p>
    </main>
  );
}
