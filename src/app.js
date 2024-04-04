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
import { prisma } from './utils/prisma/index.js';

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

// app.listen 대신 server.listen을 사용.
httpServer.listen(PORT, () => {
    console.log(`${PORT} 포트로 서버가 열렸어요!`);
});

io.use(async (socket, next) => {
    // const token = socket.handshake.auth.token; // 클라이언트로부터 받은 토큰
    // if (token) {
    //     try {
    //         const decoded = jwt.verify(token, process.env.JWT_SECRET); // 토큰 검증
    //         const user = await prisma.users.findUnique({ where: { userId: decoded.userId } });

    //         if (user) {
    //             socket.user = user; // 소켓 객체에 사용자 정보 추가
    //             next();
    //         } else {
    //             next(new Error('인증 오류'));
    //         }
    //     } catch (error) {
    //         next(new Error('인증 오류'));
    //     }
    // } else {
    //     next(new Error('인증 토큰이 없습니다.'));
    // }
    // 임시 userId 설정
    const userId = socket.handshake.query.userId;

    // 임시로 사용자 존재 여부 확인
    const user = await prisma.users.findUnique({ where: { userId: parseInt(userId) } });
    if (user) {
        socket.user = user; // 소켓 객체에 사용자 정보 추가
        next();
    } else {
        next(new Error('사용자를 찾을 수 없습니다.'));
    }
});

// 사용자 정보와 연결된 채팅방 정보를 저장할 객체
const users = {};

io.on('connection', (socket) => {
    console.log('사용자가 연결되었습니다.', socket.userId);

    // 채팅방에 입장할 때의 동작
    socket.on('join room', (room) => {
        // 해당 채팅방에 입장
        socket.join(room);
        // 사용자 정보와 연결된 채팅방 정보 저장
        users[socket.userId] = { room };
        console.log(`사용자 ${socket.user.userId} 가 방 ${room} 에 입장했습니다.`);
        io.to(room).emit('room message', `사용자 ${socket.user.userId} 가 방에 입장했습니다.`);
    });

    // 채팅 메시지를 저장하는 함수
    async function saveChatMessage(userId, content) {
        try {
            // Worries 테이블에 새로운 채팅 메시지 추가
            const newMessage = await prisma.worries.create({
                data: {
                    userId: userId, // 사용자 ID
                    content: content, // 채팅 메시지 내용
                },
            });
            console.log('새로운 채팅 메시지가 저장되었습니다:', newMessage);
        } catch (error) {
            console.error('채팅 메시지 저장 중 오류 발생:', error);
        }
    }

    socket.on('chat message', (msg) => {
        console.log(`메시지 받음: ${msg} from ${socket.user.userId}`); // 사용자 ID와 함께 로그

        const commentAuthorId = socket.user.commentAuthorId;

        // commentAuthorId 유저에게만 메시지 전송
        io.to(commentAuthorId).emit('chat message', msg);

        // 채팅 메시지를 데이터베이스에 저장
        saveChatMessage(socket.user.userId, msg);
    });

    // 방 퇴장 처리
    socket.on('leave room', (room) => {
        socket.leave(room);
        console.log(`사용자 ${socket.user.userId} 가 방 ${room} 에서 퇴장했습니다.`);
        io.to(room).emit('room message', `사용자 ${socket.user.userId} 가 방에서 퇴장했습니다.`);
    });

    socket.on('disconnect', () => {
        console.log('사용자가 연결을 끊었습니다.');
        // 연결 종료 시 사용자 정보 삭제
        delete users[socket.userId];
    });
});

// 테스트 메시지를 주기적으로 전송하는 함수
function sendTestMessage() {
    io.emit('chat message', '서버에서 보내는 테스트 메시지');
    console.log('서버에서 테스트 메시지를 전송했습니다.');
}

// 서버 상태 메시지를 주기적으로 전송하는 함수
function broadcastServerStatus() {
    const statusMessage = '현재 서버 상태는 양호합니다.';
    io.emit('server status', statusMessage);
    console.log('서버 상태 메시지를 전송했습니다.');
}

// 서버가 실행된 후 5초 후에 첫 메시지 전송, 그리고 10초마다 반복
setTimeout(() => {
    sendTestMessage();
    setInterval(sendTestMessage, 10000);

    // 서버 상태 메시지 전송 시작
    broadcastServerStatus();
    setInterval(broadcastServerStatus, 10000);
}, 5000);
