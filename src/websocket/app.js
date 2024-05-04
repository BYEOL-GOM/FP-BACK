import express from 'express';
import { Server as HttpServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import LogMiddleware from '../middlewares/logMiddleware.js';
import generalErrorHandler from '../middlewares/generalErrorMiddleware.js';
import { loadBannedWords } from '../utils/bannedWordsLoader.js';
import initializeSocket from './chats/socket.js'; // socket.js 파일에서 함수 가져오기
// import chatRouter from './chats/chat.router.js';
// import chat from './chats/chat.js';
import router from './index.js';

// 환경 변수 설정 로드
dotenv.config();

const app = express();
const PORT = process.env.CONTAINER_PORT || 3000;

// CORS 미들웨어 설정
const corsOptions = {
    origin: ['http://localhost:3000', 'https://friendj.store'],
    methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};
app.use(cors(corsOptions));
// CORS Preflight 요청 처리
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Origin', req.headers.origin);
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(204).json({});
    }
    next();
});
// CORS Preflight 요청 처리
app.options('*', cors(corsOptions)); // 모든 preflight 요청에 대해 응답

app.use(express.json());
app.use(cookieParser());
app.use(LogMiddleware);

// app.use('/', chatRouter);
// app.use('/', chat); // 레이어드 아키텍처 적용 전 임시 라우터
app.use('/', router);

app.use(generalErrorHandler);

// Banned words loader
loadBannedWords()
    .then(() => {
        console.log('금지어 목록이 메모리에 로드되었습니다.');
    })
    .catch((error) => {
        console.error('금지어 목록 로딩 중 오류 발생:', error);
    });

const server = HttpServer(app);
// Socket.IO 서버에도 CORS 적용
const io = initializeSocket(server, corsOptions); // Initialize Socket.IO with CORS

// 웹소켓 기본 라우터
app.get('/', (req, res) => {
    res.status(200).json({ message: '안녕? Socket.io!' });
});

server.listen(PORT, () => console.log(`${PORT} 포트로 서버가 열렸어요!`));
