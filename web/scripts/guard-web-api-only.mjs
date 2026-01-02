import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const EXCLUDE_DIRS = new Set([
  ".next",
  "node_modules",
  "dist",
  "build",
  ".git",
  ".turbo",
  ".vercel",
]);

const ALLOW_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".env", ".local", ".yml", ".yaml", ".md",
]);

const FORBIDDEN_DB_PATTERNS = [
  /\bsqlite3\b/g,
  /\bbetter-sqlite3\b/g,
  /\bbun:sqlite\b/g,
  /\bsql\.js\b/g,
  /\bwa-sqlite\b/g,
  /\bprisma\b/g,
  /@prisma\/client/g,
  /schema\.prisma/g,
  /\bDATABASE_URL\b/g,
];

const DIRECT_UPSTREAM_CALL_PATTERNS = [
  /https?:\/\/api\./g,
  /\bapi\.kfit\.kr\b/g,
  /\bbaseURL\s*:/g,
  /\bfetch\s*\(\s*[`'"]https?:\/\//g,
  /\baxios\s*\(\s*[`'"]https?:\/\//g,
  /\bKFIT_API_BASE_URL\b/g,
  /\bAPI_BASE\b/g,
];

function relPath(absPath) {
  return path.relative(ROOT, absPath).replaceAll("\\", "/");
}

function isUpstreamAllowedFile(absPath) {
  const rel = relPath(absPath);
  if (rel.startsWith("app/api/")) return true;
  if (rel === "middleware.ts" || rel.endsWith("/middleware.ts")) return true;
  return false;
}

function isEnvFileAllowed(absPath) {
  const rel = relPath(absPath);
  return rel.startsWith(".env");
}

function isSelfGuardFile(absPath) {
  const rel = relPath(absPath);
  return rel === "scripts/guard-web-api-only.mjs";
}

function walk(dirAbs, outFiles) {
  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  for (const ent of entries) {
    const abs = path.join(dirAbs, ent.name);

    if (ent.isDirectory()) {
      if (EXCLUDE_DIRS.has(ent.name)) continue;
      walk(abs, outFiles);
      continue;
    }

    if (!ent.isFile()) continue;

    const ext = path.extname(ent.name).toLowerCase();
    if (!ALLOW_EXT.has(ext)) continue;

    outFiles.push(abs);
  }
}

function findMatches(content, regexList) {
  const matches = [];
  for (const rx of regexList) {
    rx.lastIndex = 0;
    let m;
    while ((m = rx.exec(content)) !== null) {
      matches.push({ index: m.index, text: m[0], rx: rx.source });
      if (m.index === rx.lastIndex) rx.lastIndex++;
    }
  }
  return matches;
}

function getLineInfo(content, idx) {
  const before = content.slice(0, idx);
  const lineNo = before.split(/\r\n|\r|\n/).length;
  const lineStart = before.lastIndexOf("\n") + 1;
  const lineEnd = content.indexOf("\n", idx);
  const line = content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd).trim();
  return { lineNo, line };
}

const files = [];
walk(ROOT, files);

const violations = [];

for (const f of files) {
  if (isSelfGuardFile(f)) continue;

  const raw = fs.readFileSync(f);
  let content = "";
  try {
    content = raw.toString("utf8");
  } catch {
    continue;
  }

  const dbHits = findMatches(content, FORBIDDEN_DB_PATTERNS);
  for (const hit of dbHits) {
    const { lineNo, line } = getLineInfo(content, hit.index);
    violations.push({
      type: "DB_DIRECT_OR_ORM",
      file: relPath(f),
      lineNo,
      sample: line,
      token: hit.text,
      rule: hit.rx,
    });
  }

  const upHits = findMatches(content, DIRECT_UPSTREAM_CALL_PATTERNS);

  if (upHits.length > 0) {
    const rel = relPath(f);

    // env 파일은 업스트림 주소를 "정의"하는 영역이므로 예외(허용)
    if (isEnvFileAllowed(f)) continue;

    // 허용된 서버-서버 호출 영역(app/api/**, middleware.ts)만 허용
    if (isUpstreamAllowedFile(f)) continue;

    // 그 외(UI/컴포넌트 등)는 업스트림 직접 호출 금지
    for (const hit of upHits) {
      const { lineNo, line } = getLineInfo(content, hit.index);
      violations.push({
        type: "UPSTREAM_DIRECT_CALL_FORBIDDEN",
        file: rel,
        lineNo,
        sample: line,
        token: hit.text,
        rule: hit.rx,
      });
    }
  }
}

if (violations.length === 0) {
  console.log("✅ guard-web-api-only: PASS (No DB direct access / No forbidden upstream calls)");
  process.exit(0);
}

console.error("❌ guard-web-api-only: FAIL");
console.error("   - Web must NOT access DB directly");
console.error("   - Web UI must NOT call FastAPI directly (only via /api/*)");
console.error("   - Allowed upstream callers: app/api/** route handlers, middleware.ts");
console.error("   - Allowed definitions: .env* files may define KFIT_API_BASE_URL");
console.error("");

for (const v of violations) {
  console.error(`[${v.type}] ${v.file}:${v.lineNo}`);
  console.error(`  token: ${v.token}`);
  console.error(`  rule : ${v.rule}`);
  console.error(`  line : ${v.sample}`);
  console.error("");
}

process.exit(1);
