import express from 'express';
import { Server as HttpServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import validUrl from 'valid-url';
import * as Sentry from '@sentry/node';
import { Integrations } from '@sentry/tracing';

import LogMiddleware from './middlewares/logMiddleware.js';
import generalErrorHandler from './middlewares/generalErrorMiddleware.js';
import router from './routes/index.js';
import { loadBannedWords } from './utils/bannedWordsLoader.js';
import { swaggerUi, specs } from './swagger/swaggerOptions.js';
import './scheduler.js';
import initializeSocket from './routes/chats/socket.js'; // socket.js 파일에서 함수 가져오기
// import chatRouter from '../src/routes/chats/chat.router.js';
// import bodyParser from 'body-parser';

// 환경 변수 설정 로드
dotenv.config();

const app = express();
const PORT = process.env.CONTAINER_PORT || 3000;

// Sentry 초기화
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        integrations: [new Sentry.Integrations.Http({ tracing: false })],
        tracesSampleRate: 1.0,
    });

    // Sentry 요청 및 트레이싱 핸들러를 사용
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
}
// CORS_ORIGIN 환경 변수가 유효한 URL 형식인지 검증
// const corsOrigin = process.env.CORS_ORIGIN;
// if (!validUrl.isWebUri(corsOrigin)) {
//     console.error('Invalid CORS_ORIGIN:', corsOrigin);
//     process.exit(1);
// }

// CORS 미들웨어 설정
const corsOptions = {
    // origin: '*', // 여러 출처 허용
    // origin: 'http://localhost:3000',
    origin: ['http://localhost:3000', 'https://friendj.store'],
    methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};
app.use(cors(corsOptions));
// // CORS Preflight 요청 처리
// app.use((req, res, next) => {
//     if (req.method === 'OPTIONS') {
//         res.header('Access-Control-Allow-Origin', req.headers.origin);
//         res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//         res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//         return res.status(204).json({});
//     }
//     next();
// });
// CORS Preflight 요청 처리
app.options('*', cors(corsOptions)); // 모든 preflight 요청에 대해 응답

app.use(express.json());
// app.use(bodyParser.json());
app.use(cookieParser());
app.use(LogMiddleware);

app.use('/', router);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// AWS Health Check 서버의 건강 상태 체크
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Server is healthy' });
});

// Error handlers
if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler());
}
app.use(generalErrorHandler);

// Banned words loader
loadBannedWords()
    .then(() => {
        console.log('금지어 목록이 메모리에 로드되었습니다.');
    })
    .catch((error) => {
        console.error('금지어 목록 로딩 중 오류 발생:', error);
    });

// sentry 확인을 위해 의도적으로 에러 발생시키기
app.get('/debug-sentry', function mainHandler(req, res) {
    throw new Error('My first Sentry error!');
});

const server = HttpServer(app);
// Socket.IO 서버에도 CORS 적용
const io = initializeSocket(server, corsOptions); // Initialize Socket.IO with CORS

// 웹소켓 기본 라우터
app.get('/', (req, res) => {
    res.status(200).json({ message: '안녕? Socket.io!' });
});

server.listen(PORT, () => console.log(`${PORT} 포트로 서버가 열렸어요!`));
