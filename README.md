# DAAAT Frontend

DAAAT AI Agent와 연동되는 프론트엔드 애플리케이션입니다.

## 기술 스택

- React
- TypeScript
- Vite
- Tailwind CSS

## 로컬 실행

```bash
npm install
npm run dev
```

## 환경 변수

```bash
cp .env.example .env
```

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## 폴더 구조

```txt
src/
├── app/          # 앱 전체 설정, 라우터, Provider
├── pages/        # URL에 연결되는 페이지 단위 컴포넌트
├── features/     # 기능별 API, 타입, 훅, 전용 컴포넌트
├── components/   # 여러 기능에서 공유하는 공통 UI
├── lib/          # API client, 상수, 유틸 함수
├── styles/       # 전역 스타일
└── types/        # 전역 공유 타입
```
