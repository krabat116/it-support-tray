# IT Support Tool — MVP 기획서

---

## 1. 프로젝트 개요

### 배경
IT 담당자 없이도 고객(직원)이 스스로 일반적인 IT 문제를 해결할 수 있도록 돕는 도구. 헬프데스크 문의 건수를 줄이고, 간단한 문제는 자가 해결할 수 있는 환경을 제공한다.

### 목표
- 고객 PC에 상주하는 Windows 트레이 앱으로 빠른 접근성 제공
- IT 관리자가 웹 포털에서 가이드 및 기능을 원격으로 관리
- 인터넷 연결 없이도 핵심 기능은 항상 동작

---

## 2. 제품 구성

```
┌─────────────────────────┐     ┌─────────────────────────┐
│   it-support-tray       │     │   it-support-admin      │
│   (Windows 트레이 앱)    │◄────│   (관리자 웹 포털)       │
│   Electron + React      │     │   React + Vite          │
└─────────────────────────┘     └─────────────────────────┘
             ▲                              ▲
             └──────────┬───────────────────┘
                        │
               ┌────────────────┐
               │   Supabase     │
               │  Auth + DB     │
               │  + Storage     │
               └────────────────┘
```

---

## 3. MVP 범위

### Phase 1 — 트레이 앱 (완료)
현재 구현된 기능:

| 기능 | 상태 |
|------|------|
| 트레이 아이콘 상주 | 완료 |
| 좌클릭 팝업 / 우클릭 컨텍스트 메뉴 | 완료 |
| Windows 부팅 시 자동 실행 | 완료 |
| 단일 인스턴스 잠금 | 완료 |
| 네트워크 문제 Quick Fix (DNS, 네트워크 리셋) | 완료 |
| 프린터 문제 Quick Fix (스풀러, 큐 초기화) | 완료 |
| 일반 성능 Quick Fix (임시파일, 휴지통) | 완료 |
| 설정 바로가기 (네트워크, 프린터, 업데이트 등) | 완료 |
| PDF 가이드 열기 | 완료 |
| UAC 권한 상승 처리 | 완료 |
| Windows x64 NSIS 인스톨러 패키징 | 완료 |

---

### Phase 2 — 관리자 포털 (신규 개발)

#### 2-1. 기술 스택

| 레이어 | 기술 |
|--------|------|
| UI 프레임워크 | React + TypeScript |
| 빌드 도구 | Vite |
| UI 컴포넌트 | shadcn/ui |
| 백엔드 / DB | Supabase (PostgreSQL) |
| 파일 스토리지 | Supabase Storage |
| 인증 | Supabase Auth |
| 배포 | Vercel 또는 Netlify (무료) |
| 레포지토리 | 별도 GitHub 레포 (it-support-admin) |

#### 2-2. 페이지 구성

```
로그인 페이지
    ↓
대시보드 (사이드바 네비게이션)
├── 가이드 관리     ← PDF 업로드 / 삭제 / 카테고리별 관리
├── 앱 구성 편집    ← 아코디언 카테고리, Quick Fix 항목 추가/수정/삭제
└── (선택) 공지 관리 ← 트레이 앱에 공지 띄우기
```

#### 2-3. 주요 기능 상세

**로그인**
- 이메일 + 비밀번호 로그인 (Supabase Auth)
- IT 관리자 계정만 접근 가능

**가이드 관리**
- 카테고리별 PDF 업로드 / 교체 / 삭제
- Supabase Storage에 파일 저장
- 업로드 시 DB에 메타데이터 자동 기록 (파일명, URL, 카테고리, 날짜)

**앱 구성 편집**
- 아코디언 카테고리 추가 / 삭제 / 순서 변경
- Quick Fix 버튼 추가 / 수정 / 삭제 (라벨, 명령어, 관리자 권한 여부)
- 설정 바로가기 추가 / 삭제
- 저장 시 Supabase DB 즉시 반영 → 트레이 앱 다음 실행 시 자동 적용

#### 2-4. DB 구조 (예시)

```
categories
├── id
├── title          (예: "Network Issues")
├── icon           (예: "🌐")
├── order          (표시 순서)
└── created_at

quick_fixes
├── id
├── category_id    (FK → categories)
├── label          (예: "Flush DNS Cache")
├── command        (예: "ipconfig /flushdns")
├── requires_admin (boolean)
└── order

settings_shortcuts
├── id
├── category_id
├── label
├── uri            (예: "ms-settings:network")
└── order

guides
├── id
├── category_id
├── filename
├── storage_url
└── uploaded_at
```

---

### Phase 3 — 트레이 앱 서버 연동 (Phase 2 이후)

Phase 2 관리자 포털 완성 후, 트레이 앱의 config 로딩 방식을 변경:

| 항목 | 현재 | Phase 3 |
|------|------|---------|
| 설정 로딩 | 로컬 `app-config.json` | Supabase DB API |
| PDF 열기 | 번들된 로컬 파일 | Supabase Storage URL |
| 오프라인 대응 | 항상 로컬 | 캐시된 마지막 데이터 사용 |

---

## 4. 사용자 흐름

### IT 관리자
```
관리자 포털 로그인
    → PDF 업로드 (카테고리 지정)
    → 새 Quick Fix 항목 추가
    → 저장 → Supabase DB/Storage 반영
```

### 고객 (직원)
```
Windows 부팅 → 트레이 앱 자동 실행
    → 트레이 아이콘 클릭 → 팝업 열림
    → (최신 config 서버에서 자동 로드)
    → Quick Fix 버튼 클릭 → 문제 해결
    → PDF 가이드 버튼 클릭 → 가이드 열람
```

---

## 5. 배포 전략

### 트레이 앱
```
Mac/Windows에서 npm run dist
    → release/IT Support Tool Setup x.x.x.exe 생성
    → USB / 네트워크 드라이브 / GitHub Releases로 고객 PC에 배포
    → 설치 후 자동 부팅 등록
```

### 관리자 포털
```
GitHub 레포 생성 (it-support-admin)
    → Vercel 또는 Netlify에 연결
    → main 브랜치 push 시 자동 배포
```

### CI/CD (선택)
```
GitHub Actions → Windows 서버에서 자동 빌드
    → git tag v1.x.x push 시 .exe 자동 생성
    → GitHub Releases에 자동 업로드
```

---

## 6. 비용

| 서비스 | 플랜 | 비용 |
|--------|------|------|
| Supabase | Free (MAU 50,000 / Storage 1GB) | 무료 |
| Vercel / Netlify | Free | 무료 |
| GitHub | Free | 무료 |
| **합계** | | **$0/월** |

규모가 커질 경우 Supabase Pro ($25/월)로 업그레이드 고려.

---

## 7. 개발 우선순위

| 순서 | 작업 | 비고 |
|------|------|------|
| 1 | 트레이 앱 아이콘/PDF 리소스 준비 | 실제 배포 전 필수 |
| 2 | GitHub Actions CI/CD 설정 | .exe 자동 빌드 |
| 3 | 관리자 포털 개발 (it-support-admin) | 별도 레포 |
| 4 | Supabase 연동 (Auth + DB + Storage) | |
| 5 | 트레이 앱 서버 연동 (config 원격화) | Phase 3 |

---

## 8. 미결 사항

- [ ] 트레이 아이콘 실제 디자인 (현재 fallback 파란 사각형)
- [ ] PDF 가이드 문서 제작
- [ ] 관리자 계정 수 및 권한 레벨 정의
- [ ] 고객 앱의 서버 인증 방식 확정 (API 키 vs 내부망 IP 제한)
- [ ] 오프라인 캐시 전략 구체화
- [ ] 피그마 와이어프레임 작성 (관리자 포털)
