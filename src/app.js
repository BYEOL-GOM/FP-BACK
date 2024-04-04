import express from 'express';
import cookieParser from 'cookie-parser';
// import kakaoStrategy from './routes/passport/kakaoStrategy.js';
import dotenv from 'dotenv';
import cors from 'cors';
import LogMiddleware from './middlewares/logMiddleware.js';
//import TestLogMiddleware from './middlewares/testLogMiddleware.js';
import generalErrorHandler from './middlewares/generalErrorMiddleware.js';
import router from './routes/index.js';
import passport from 'passport';
// import session from 'express-session'; // JWT 사용으로 주석 처리
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
import { swaggerUi, specs } from './swagger/swaggerOptions.js';


const app = express();
const PORT = 3000; // 환경 변수에서 포트를 설정할 수 있도록 변경

// CORS 미들웨어 설정
app.use(
  cors({
  origin: '*', // 실제 배포 환경에서는 이 값을 구체적인 출처로 변경하세요.
  methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'], // 'Authorization' 헤더 허용
}));

// CORS Preflight 요청에 대한 처리를 위한 미들웨어 추가
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).json({});
  }
  next();
});

// bodyParser와 express.json()은 CORS 설정 바로 다음에 위치해야 합니다.
app.use(bodyParser.json());
app.use(express.json());

// 로깅 및 쿠키 파서 미들웨어
app.use(LogMiddleware);
//app.use(TestLogMiddleware);
app.use(cookieParser());

// Passport 초기화 및 라우팅 설정
// app.use(passport.initialize()); // Passport를 사용하는 경우 초기화 필요
app.use('/', router);

// 스웨거 설정
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// 에러 핸들링 미들웨어는 가장 마지막에 위치
app.use(generalErrorHandler);

app.listen(PORT, () => {
    console.log(`${PORT} 포트로 서버가 열렸어요!`)
});
