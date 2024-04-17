# 기반 이미지 선택 (Node.js 안정된 최신버전)
FROM node:alpine 

# 애플리케이션 디렉토리 생성
WORKDIR /app

# package.json 과 package-lock.json을 /app 디렉토리로 복사
COPY package.json yarn.lock ./

# 의존성 설치
RUN yarn install

# 나머지 애플리케이션 파일 복사
COPY . .

# Prisma 클라이언트 생성
RUN yarn prisma generate

# 애플리케이션 실행을 위한 포트 열기
EXPOSE 3000


# 애플리케이션 실행
CMD ["yarn", "dev"]