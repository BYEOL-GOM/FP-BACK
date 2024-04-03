import express from 'express';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cookieParser from 'cookie-parser';
//import kakaoStrategy from './routes/passport/kakaoStrategy.js';
import dotenv from 'dotenv';
import cors from 'cors';
import LogMiddleware from './middlewares/logMiddleware.js';
import generalErrorHandler from './middlewares/generalErrorMiddleware.js';
import router from './routes/index.js';
import passport from 'passport';
import jwt from 'jsonwebtoken';

// 환경 변수 설정 로드
dotenv.config();

const app = express();
const PORT = 3000;
const httpServer = new HttpServer(app);
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: '*', // 필요에 따라 CORS 설정 조정
        methods: ['GET', 'POST'],
    },
});

app.use(LogMiddleware);
app.use(cookieParser());
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

// app.listen 대신 server.listen을 사용합니다.
httpServer.listen(PORT, () => {
    console.log(`${PORT} 포트로 서버가 열렸어요!`);
});

// 클라이언트에서 서버로 메시지 보내기
// socket.emit('chat message', '안녕하세요!');

io.on('connection', (socket) => {
    console.log('사용자가 연결되었습니다.');
    socket.on('disconnect', () => {
        console.log('사용자가 연결을 끊었습니다.');
    });

    socket.on('chat message', (msg) => {
        console.log(`메시지 받음: ${msg}`);
        io.emit('chat message', msg); // 'chat message' 이벤트로 모든 클라이언트에 메시지 전송
    });
});
