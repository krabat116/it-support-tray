#!/usr/bin/env node
// ============================================================
// scripts/create-placeholder-icons.js
// 개발용 플레이스홀더 리소스 파일을 생성합니다.
//
// 실행: npm run create-icons
//
// 생성 항목:
//   - resources/icon.png  (트레이 아이콘 — 16x16 파란 사각형 placeholder)
//   - resources/icon.ico  (인스톨러용 — PNG 복사본)
//   - resources/guides/network-guide.pdf
//   - resources/guides/printer-guide.pdf
//   - resources/guides/performance-guide.pdf
//
// ⚠️  실제 배포 전에 반드시 실제 아이콘과 PDF로 교체하세요!
// ============================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RESOURCES_DIR  = path.join(ROOT, 'resources');
const GUIDES_DIR     = path.join(RESOURCES_DIR, 'guides');

// 디렉토리 생성
[RESOURCES_DIR, GUIDES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('  📁 생성:', path.relative(ROOT, dir));
  }
});

// ── 아이콘 생성 ──────────────────────────────────────────────
// 최소한의 유효한 16x16 PNG (파란 배경, base64 인코딩)
// 실제 배포 시에는 proper PNG/ICO 파일로 교체하세요.
const ICON_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMElEQVQ4T2NkYGD4' +
  'z8BQDwABDABHAAEB/f//AwAIAAQAAQAAAABJRU5ErkJggg==';

const iconPngPath = path.join(RESOURCES_DIR, 'icon.png');
if (!fs.existsSync(iconPngPath)) {
  fs.writeFileSync(iconPngPath, Buffer.from(ICON_PNG_B64, 'base64'));
  console.log('  🖼  생성:', path.relative(ROOT, iconPngPath));
} else {
  console.log('  ⏭  스킵 (이미 존재):', path.relative(ROOT, iconPngPath));
}

const iconIcoPath = path.join(RESOURCES_DIR, 'icon.ico');
if (!fs.existsSync(iconIcoPath)) {
  fs.copyFileSync(iconPngPath, iconIcoPath);
  console.log('  🖼  생성:', path.relative(ROOT, iconIcoPath));
} else {
  console.log('  ⏭  스킵 (이미 존재):', path.relative(ROOT, iconIcoPath));
}

// ── 플레이스홀더 PDF 생성 ────────────────────────────────────
// 최소한의 유효한 PDF (페이지 하나, 내용 없음)
// 실제 배포 시에는 실제 자가진단 가이드 PDF로 교체하세요.
const PLACEHOLDER_PDF = Buffer.from(
  '%PDF-1.4\n' +
  '1 0 obj<</Type /Catalog /Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type /Pages /Kids [3 0 R] /Count 1>>endobj\n' +
  '3 0 obj<</Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]>>endobj\n' +
  'xref\n0 4\n' +
  '0000000000 65535 f \n' +
  '0000000009 00000 n \n' +
  '0000000058 00000 n \n' +
  '0000000115 00000 n \n' +
  'trailer<</Size 4/Root 1 0 R>>\n' +
  'startxref\n190\n%%EOF\n'
);

const PDF_FILES = [
  { filename: 'network-guide.pdf',     title: '네트워크 자가진단 가이드' },
  { filename: 'printer-guide.pdf',     title: '프린터 자가진단 가이드' },
  { filename: 'performance-guide.pdf', title: 'PC 성능 최적화 가이드' },
];

PDF_FILES.forEach(({ filename }) => {
  const pdfPath = path.join(GUIDES_DIR, filename);
  if (!fs.existsSync(pdfPath)) {
    fs.writeFileSync(pdfPath, PLACEHOLDER_PDF);
    console.log('  📄 생성:', path.relative(ROOT, pdfPath));
  } else {
    console.log('  ⏭  스킵 (이미 존재):', path.relative(ROOT, pdfPath));
  }
});

console.log('\n✅ 플레이스홀더 리소스 준비 완료.');
console.log('⚠️  배포 전 resources/icon.png, icon.ico 와 resources/guides/*.pdf 를 실제 파일로 교체하세요.\n');
