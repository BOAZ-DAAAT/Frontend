# syntax=docker/dockerfile:1
# 프론트 이미지 — 1단계에서 빌드, 2단계에선 결과물만 nginx로 서빙

# (node)
FROM node:22-alpine AS builder

WORKDIR /app

# 의존성 먼저 설치 → 소스만 바뀌면 이 레이어는 캐시 재사용
COPY package.json package-lock.json ./
RUN npm ci

# 소스 복사 후 빌드. VITE_API_BASE_URL은 이 순간 결과물(JS)에 박힌다
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# (nginx)
FROM nginx:alpine

# SPA 라우팅 설정 교체
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80