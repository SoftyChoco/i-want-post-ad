# 오픈채팅방 광고 승인 시스템

> 카카오톡 오픈채팅방의 광고 정책 위반과 관리자 문의 과부하를 해결하기 위한 웹 기반 광고 승인 시스템

---

## 목차

1. [프로젝트 목적](#-프로젝트-목적)
2. [기여와 개발 원칙](#-기여와-개발-원칙)
3. [주요 기능](#-주요-기능)
4. [기술 스택](#-기술-스택)
5. [시작하기](#-시작하기)
6. [정책 설정](#-정책-설정)
7. [사용 방법](#-사용-방법)
8. [API 레퍼런스](#-api-레퍼런스)
9. [페이지 구조](#-페이지-구조)
10. [프로젝트 구조](#-프로젝트-구조)
11. [배포](#-배포)
12. [환경변수 설명](#-환경변수-설명)

---

## 🎯 프로젝트 목적

이 프로젝트는 오픈채팅방 운영자가 광고 요청을 일관된 기준으로 빠르게 처리할 수 있도록 만든 시스템입니다.  
핵심 목표는 다음 세 가지입니다.

- 운영자의 반복 문의/수작업 부담 감소
- 신청자에게 예측 가능한 심사 경험 제공
- 정책 기준(`llms.txt`)에 맞는 투명한 의사결정 기록 유지

---

## 🤝 기여와 개발 원칙

- **PR은 누구나 가능합니다.** 작은 개선도 환영합니다.
- **복잡함보다 단순함을 우선합니다.** 새로운 추상화보다 현재 구조에서 이해하기 쉬운 변경을 선호합니다.
- **테스트는 반드시 작성합니다.** 동작/정책/보안/회귀에 영향을 주는 변경은 테스트 없이 머지하지 않습니다.

권장 흐름:

1. 문제를 작게 정의한다.
2. 단순한 구현을 먼저 적용한다.
3. 테스트를 추가/수정한다.
4. `npm test`, `npm run build`를 통과시킨다.

---

## 📋 주요 기능

- **`llms.txt` 이중 구조**: 사람용 SELF-CHECK와 시스템용 POLICY-SPEC을 하나의 파일에 통합. 광고주가 직접 읽거나 LLM에 붙여넣어 정책 판단 가능
- **AI 1차 판정**: 광고 제출 시 Gemini 모델이 정책 적합성을 자동 판정 (compliant / non_compliant / needs_review)
- **관리자 최종 승인**: 방장·부방장이 AI 판정을 참고하여 최종 승인/거절
- **신청 내역 조회**: 연락처(이메일/전화번호) 또는 요청코드로 내 광고 신청 상태 확인
- **감사 로그**: 누가 언제 어떤 요청을 승인/거절했는지 전체 이력 추적 (방장 및 부방장 조회 가능)
- **Rate Limiting**: IP 기반 요청 제한 (제출 5회/10분, 로그인 5회/5분, 조회 30회/분)

---

## 🛠 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| ORM | TypeORM |
| 데이터베이스 | SQLite (better-sqlite3) |
| AI | Gemini (환경변수로 모델 지정) |
| 스타일링 | Tailwind CSS |
| 인증 | JWT + bcrypt |
| 유효성 검증 | Zod |

---

## 🚀 시작하기

### 1. 설치

```bash
git clone <repository-url>
cd ad-approval
npm install
```

### 2. 환경변수 설정

`.env.example`을 복사하여 `.env` 파일을 생성합니다.

```bash
cp .env.example .env
```

`.env` 파일을 열어 필수 값을 설정합니다:

```env
DATABASE_URL=./data/db.sqlite
JWT_SECRET=your-jwt-secret-change-in-production-min-32-chars
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-password
```

> `JWT_SECRET`은 최소 32자 이상의 랜덤 문자열을 사용하세요.
> `GEMINI_API_KEY`는 [Google AI Studio](https://aistudio.google.com/)에서 발급받을 수 있습니다.
> `GEMINI_MODEL`은 프로젝트에서 사용할 모델명입니다. (예: `gemini-3.1-flash-lite-preview`)

### 3. 데이터베이스 초기화

```bash
# 스키마 동기화
npm run db:sync

# 초기 관리자 계정 생성 (ADMIN_EMAIL, ADMIN_PASSWORD 사용)
npm run db:seed
```

### 4. 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000`에서 접속할 수 있습니다.

### 5. 프로덕션 빌드

```bash
npm run build
npm run start
```

---

## 📄 정책 설정

광고 정책은 DB에 저장되며 `/llms.txt` 경로로 제공됩니다. 문서는 이중 구조로 설계되어 있습니다:

- **SELF-CHECK 섹션**: 사람이 읽고 스스로 정책 적합 여부를 확인하는 체크리스트
- **POLICY-SPEC 섹션**: LLM(Gemini)이 파싱하여 자동 판정에 사용하는 구조화된 정책 명세

### 커스터마이징

관리자 화면(`/admin/policy`)에서 정책을 수정하면 DB에 저장되고 즉시 AI 판정 기준에 반영됩니다.

정책 저장 시 정책 버전은 `1.0.x` 형태로 자동 증가하며, 각 요청에는 당시 버전이 이력으로 기록됩니다.

---

## 📖 사용 방법

### 광고주 플로우

1. `/llms.txt`에서 광고 정책을 확인합니다 (또는 AI 챗봇에 정책 파일을 붙여넣어 질문)
2. `/submit`에서 오픈채팅 닉네임과 게시 내용(전문)을 작성하여 제출합니다 (고유한 닉네임 사용 권장)
3. AI가 1차 판정을 수행합니다 (`compliant` / `non_compliant` / `needs_review`)
4. 요청코드(`REQ-YYYYMMDD-XXXX`)가 발급됩니다
5. 관리자의 최종 승인을 기다립니다
6. 승인 시 요청코드 상태가 승인됨으로 변경됩니다
7. `/status`에서 신청 시 입력한 연락처로 상태를 확인합니다
8. **요청코드를 포함하여** 오픈채팅방에 광고 전문을 게시합니다

### 관리자 플로우

1. `/login`에서 관리자 계정으로 로그인합니다
2. `/admin`에서 대기 중인 광고 요청 목록을 확인합니다
3. 요청 상세 페이지에서 AI 판정 결과를 참고하여 승인 또는 거절합니다
4. 승인 시 요청코드 상태가 승인됨으로 변경됩니다

### 역할별 권한

| 역할 | 설명 | 권한 |
|------|------|------|
| **admin** (방장) | 최고 관리자 | 모든 기능 접근, 부방장 관리 |
| **moderator** (부방장) | 보조 관리자 | 광고 요청 조회 및 승인/거절, 감사 로그 조회 |

---

## 🔌 API 레퍼런스

### 인증

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| POST | `/api/auth/login` | - | 로그인 (rate limited) |
| POST | `/api/auth/logout` | - | 로그아웃 |
| GET | `/api/auth/me` | Cookie | 현재 유저 정보 |

### 광고

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| POST | `/api/ads/submit` | - | 광고 제출 + AI 판정 (rate limited) |
| GET | `/api/verify?code=REQ-...` | - | 요청코드 개별 검증 (rate limited) |
| GET | `/api/requests/by-contact?contact=...` | - | 연락처 기반 신청 내역 조회 (rate limited) |

### 관리자

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | `/api/admin/requests` | Admin/Mod | 요청 목록 (status, page, limit 파라미터) |
| GET | `/api/admin/requests/[id]` | Admin/Mod | 요청 상세 |
| PATCH | `/api/admin/requests/[id]` | Admin/Mod | 승인/거절 (트랜잭션 처리) |
| GET | `/api/admin/users` | Admin/Mod | 관리자 목록 |
| POST | `/api/admin/users` | Admin | 부방장 추가 |
| DELETE | `/api/admin/users/[id]` | Admin | 부방장 삭제 |
| GET | `/api/admin/logs` | Admin/Mod | 감사 로그 |

---

## 🗺 페이지 구조

| 경로 | 타입 | 설명 |
|------|------|------|
| `/` | 랜딩 | 정책확인·광고신청·신청내역조회 3카드 |
| `/llms.txt` | Route | DB 기반 광고 정책 문서 (이중 구조) |
| `/submit` | Client | 광고 제출 폼 + AI 판정 결과 |
| `/status` | Client | 신청 내역 조회 (연락처 또는 요청코드) |
| `/login` | Client | 관리자 로그인 |
| `/admin` | Server | 관리자 대시보드 (요청 목록) |
| `/admin/requests/[id]` | Server+Client | 요청 상세 (오픈채팅 닉네임, 게시 전문 등) |
| `/admin/users` | Server+Client | 부방장 관리 (방장 전용) |
| `/admin/logs` | Server | 감사 로그 (방장 및 부방장) |

---

## 📁 프로젝트 구조

```
ad-approval/
├── app/
│   ├── page.tsx                         # 랜딩 페이지
│   ├── layout.tsx                       # Root layout (reflect-metadata)
│   ├── not-found.tsx                    # 404 페이지
│   ├── error.tsx                        # Error boundary
│   ├── login/page.tsx                   # 관리자 로그인
│   ├── submit/page.tsx                  # 광고 제출 폼
│   ├── status/page.tsx                  # 신청 내역 조회
│   ├── admin/
│   │   ├── layout.tsx                   # 관리자 네비게이션
│   │   ├── page.tsx                     # 대시보드
│   │   ├── components/LogoutButton.tsx
│   │   ├── requests/[id]/
│   │   │   ├── page.tsx                 # 요청 상세
│   │   │   ├── ReviewForm.tsx           # 승인/거절 폼
│   │   │   └── not-found.tsx
│   │   ├── users/
│   │   │   ├── page.tsx                 # 부방장 관리
│   │   │   └── UserManagement.tsx
│   │   └── logs/page.tsx               # 감사 로그
│   └── api/
│       ├── auth/{login,logout,me}/route.ts
│       ├── ads/submit/route.ts
│       ├── verify/route.ts
│       └── admin/
│           ├── requests/route.ts
│           ├── requests/[id]/route.ts
│           ├── users/route.ts
│           ├── users/[id]/route.ts
│           └── logs/route.ts
├── lib/
│   ├── db.ts                            # TypeORM DataSource 싱글턴
│   ├── auth.ts                          # JWT + bcrypt 인증
│   ├── llm.ts                           # Gemini 2.5 Flash 연동
│   ├── rate-limit.ts                    # IP 기반 Rate Limiter
│   ├── validations.ts                   # Zod 스키마
│   ├── codes.ts                         # 요청코드(REQ-) 생성기
│   ├── policy.ts                        # DB 정책 로더/저장기
│   └── entities/
│       ├── User.ts                      # 관리자 엔티티
│       ├── AdRequest.ts                 # 광고 요청 엔티티
│       └── AuditLog.ts                  # 감사 로그 엔티티
├── app/llms.txt/route.ts                # DB 정책 텍스트 엔드포인트
├── scripts/seed.ts                      # DB 시드 스크립트
├── data-source.ts                       # TypeORM CLI 설정
├── middleware.ts                        # Auth 미들웨어
└── data/db.sqlite                       # SQLite DB (자동 생성)
```

---

## 🌐 배포

VPS(Ubuntu) 기준 배포 방법입니다.

### 1. 서버 준비

```bash
# Node.js 20+ 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. 프로젝트 배포

```bash
git clone <repository-url> /opt/ad-approval
cd /opt/ad-approval
npm install --production=false
```

### 3. 환경변수 설정

```bash
cp .env.example .env
# .env 파일을 편집하여 프로덕션 값 설정
# JWT_SECRET은 반드시 강력한 랜덤 문자열로 변경
```

### 4. 빌드 및 초기화

```bash
npm run build
npm run db:sync
npm run db:seed
```

### 5. systemd 서비스 등록

```ini
# /etc/systemd/system/ad-approval.service
[Unit]
Description=Ad Approval System
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/ad-approval
ExecStart=/usr/bin/npm run start
Restart=on-failure
Environment=NODE_ENV=production
EnvironmentFile=/opt/ad-approval/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable ad-approval
sudo systemctl start ad-approval
```

### 6. Nginx 리버스 프록시 (선택)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔑 환경변수 설명

| 변수 | 필수 | 설명 |
|------|------|------|
| `DATABASE_URL` | O | SQLite 데이터베이스 파일 경로. 기본값: `./data/db.sqlite` |
| `JWT_SECRET` | O | JWT 서명에 사용되는 비밀키. 최소 32자 이상의 랜덤 문자열 권장 |
| `GEMINI_API_KEY` | O | Google Gemini API 키. AI 판정 기능에 필요 |
| `ADMIN_EMAIL` | O | 초기 관리자(방장) 계정 이메일. `db:seed` 실행 시 사용 |
| `ADMIN_PASSWORD` | O | 초기 관리자(방장) 계정 비밀번호. `db:seed` 실행 시 사용 |
| `KAKAO_BOT_TOKEN` | X | 카카오봇 요청코드 검증용 `/api/verify` Bearer 토큰 (봇 요청 rate-limit 면제) |

---

## npm 스크립트

```bash
npm run dev                # 개발 서버 실행
npm run build              # 프로덕션 빌드
npm run start              # 프로덕션 서버 실행
npm run lint               # ESLint 실행
npm run db:sync            # TypeORM 스키마 동기화
npm run db:seed            # 초기 관리자 계정 시드
npm run migration:generate # 마이그레이션 생성
npm run migration:run      # 마이그레이션 실행
npm run migration:revert   # 마이그레이션 롤백
```

---

## 라이선스

Private
