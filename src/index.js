import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from './utils/prisma/index.js';

const initializeSocket = (httpServer) => {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: '*', // 필요에 따라 CORS 설정 조정
            methods: ['GET', 'POST'],
            credentials: true, // 쿠키를 포함한 요청을 허용할지 여부
        },
    });

    // 사용자 정보와 연결된 소켓 ID를 저장할 객체
    const userSockets = {};

    // 소켓 연결 전 인증 및 사용자 정보 설정
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token; // 클라이언트로부터 받은 토큰
        if (!token) {
            return next(new Error('인증 토큰이 없습니다.'));
        }

        try {
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            const user = await prisma.Users.findUnique({
                where: {
                    userId: decoded.userId,
                },
            });
            console.log('🤍🤍🤍userId : ', userId);

            if (!user) {
                return next(new Error('인증 오류: 사용자를 찾을 수 없습니다.'));
            }

            socket.user = user; // 소켓 객체에 사용자 정보 추가
            userSockets[user.userId] = socket.id; // 사용자 ID와 소켓 ID 매핑
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return next(new Error('Access Token이 만료되었습니다.'));
            } else {
                return next(new Error('인증 오류'));
            }
        }
        // 임시 userId 설정
        // const userId = socket.handshake.query.userId;
        // console.log('🤍🤍🤍userId : ', userId);
        // if (!userId) {
        //     return next(new Error('userId가 쿼리에 포함되지 않았습니다.'));
        // }
        // const parsedUserId = parseInt(userId, 10);
        // if (isNaN(parsedUserId)) {
        //     return next(new Error('userId가 유효한 숫자가 아닙니다.'));
        // }
        // // 임시로 사용자 존재 여부 확인
        // const user = await prisma.Users.findUnique({
        //     where: {
        //         userId: parseInt(userId), // `userId` 필드를 기준으로 사용자를 찾습니다.
        //     },
        // });
        // if (user) {
        //     socket.user = user; // 소켓 객체에 사용자 정보 추가
        //     userSockets[userId] = socket.id; // 사용자 ID와 소켓 ID 매핑
        //     next();
        // } else {
        //     next(new Error('사용자를 찾을 수 없습니다.'));
        // }
    });

    io.on('connection', (socket) => {
        console.log('사용자가 연결되었습니다.', socket.id);

        // 채팅방에 입장할 때의 동작
        socket.on('join room', (room) => {
            console.log('connection info -> ' + socket.request.connection._peername);
            socket.remoteAddress = socket.request.connection._peername.address;
            socket.remotePort = socket.request.connection_peername.port;

            // 해당 채팅방에 입장
            socket.join(room);
            // 사용자 정보와 연결된 채팅방 정보 저장
            users[socket.userId] = { room };
            console.log(`사용자 ${socket.user.userId} 가 방 ${room} 에 입장했습니다.`);
            io.to(room).emit('room message', `사용자 ${socket.user.userId} 가 방에 입장했습니다.`);
        });

        // 1:1 채팅 메시지 처리
        socket.on('private message', async ({ receiverId, msg }) => {
            console.log(`메시지 받음: ${msg} from ${socket.user.userId} to ${receiverId}`);
            if (userSockets[receiverId]) {
                io.to(userSockets[receiverId]).emit('private message', { from: socket.user.userId, msg });
                await saveChatMessage(socket.user.userId, msg); // DB에 메시지 저장
            }
        });

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
            console.log(`사용자 ${socket.user.userId}가 연결을 끊었습니다.`);
            delete userSockets[socket.user.userId]; // 필요한 정리 작업
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

    return io; // 필요에 따라 io 객체를 반환하여 외부에서 사용 가능하게 함
};

export default initializeSocket;
