import express from 'express';
import cookieParser from 'cookie-parser';
//import kakaoStrategy from './routes/passport/kakaoStrategy.js';
import dotenv from 'dotenv';
import cors from 'cors';
import LogMiddleware from './middlewares/logMiddleware.js';
import TestLogMiddleware from './middlewares/testLogMiddleware.js';
import generalErrorHandler from './middlewares/generalErrorMiddleware.js';
import router from './routes/index.js';
import passport from 'passport';
// 세션 기반 인증이 아닌 JWT를 사용하므로 express-session은 주석 처리합니다.
// import session from 'express-session';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = 3000; // 환경 변수에서 포트를 설정할 수 있도록 변경

app.use(LogMiddleware);
app.use(TestLogMiddleware);

app.use(
    cors({
        origin: '*', // 실제 배포시에는 허용할 도메인을 명시적으로 지정하는 것이 좋습니다.
        credentials: true,
    }),
);

app.use(express.json());

// Passport 초기화

app.use('/', router);
app.use(generalErrorHandler);

app.listen(PORT, () => {
    console.log(`${PORT} 포트로 서버가 열렸어요!`);
});
