FROM node:18

WORKDIR /usr/src/app

# 패키지 파일 복사
COPY package*.json ./

# 의존성 설치
RUN npm install --legacy-peer-deps

# 소스 코드 복사
COPY . .

# 개발 모드에서 앱 실행
CMD ["npm", "run", "start:auth"]