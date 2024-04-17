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
import { loadBannedWords } from './utils/bannedWordsLoader.js';
import { swaggerUi, specs } from './swagger/swaggerOptions.js';
import './scheduler.js';

const app = express();
const PORT = 3000;

app.use(
    cors({
        origin: 'http://star-bear.s3-website.eu-north-1.amazonaws.com/', // 특정 도메인 설정
        methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }),
);

app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Origin', 'http://star-bear.s3-website.eu-north-1.amazonaws.com/');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(204).json({});
    }
    next();
});

// bodyParser와 express.json()은 CORS 설정 바로 다음
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

// 금지어 목록 로드
loadBannedWords()
    .then(() => {
        console.log('금지어 목록이 메모리에 로드되었습니다.');
    })
    .catch((error) => {
        console.error('금지어 목록 로딩 중 오류 발생:', error);
    });

app.listen(PORT, () => {
    console.log(`${PORT} 포트로 서버가 열렸어요!`);
});
