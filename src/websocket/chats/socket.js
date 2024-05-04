// src/routes/chats/socket.js
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../../utils/prisma/index.js';
import { clearSocketPastMessages } from '../../utils/socketMessageHandling.js';

const lastMessageTimestamps = new Map(); // 각 소켓 세션의 마지막 메시지 타임스탬프를 저장하는 Map 객체

const initializeSocket = (server, corsOptions) => {
    const io = new SocketIOServer(server, {
        cors: corsOptions,
    });

    const userSockets = {}; // 사용자와 소켓 간의 매핑을 저장할 객체
    let userRooms = {}; // 사용자의 방 정보를 저장할 객체

    // connection이 수립되면 event handler function의 인자로 socket이 들어온다
    io.on('connection', async (socket) => {
        socket.emit('connected', { message: '백엔드 소켓 연결에 성공했습니다!' });
        console.log('사용자가 연결되었습니다.', socket.id); // 소켓마다 고유의 식별자를 가짐 (20자)
        console.log('연결 횟수 >> ', io.engine.clientsCount); // 연결된 소켓의 개수

        // 인증 토큰 검증
        const token = socket.handshake.auth.token; // 클라이언트로부터 받은 토큰
        // 토큰이 없는 경우 바로 에러 처리하고 연결 해제
        if (!token) {
            console.log('인증 토큰이 없습니다.');
            socket.emit('error', { message: '인증 토큰이 없습니다.' });
            socket.disconnect();
            return;
        }

        const [bearer, tokenValue] = token.split(' ');
        if (bearer !== 'Bearer') {
            socket.emit('token error', { message: '토큰 타입이 Bearer 형식이 아닙니다' });
            console.log('token error', { message: '토큰 타입이 Bearer 형식이 아닙니다' });
            socket.disconnect();
            return;
        }
        console.log('여기까지 와? 1번.');
        try {
            const decoded = jwt.verify(tokenValue, process.env.ACCESS_TOKEN_SECRET);
            const user = await prisma.users.findUnique({
                where: {
                    userId: decoded.userId,
                },
            });
            console.log('여기까지 와? 2번.');

            if (!user) {
                socket.emit('error', { message: '인증 오류: 사용자를 찾을 수 없습니다.' });
                socket.disconnect();
                return;
            }
            console.log('여기까지 와? 3번.');

            // 유저 정보를 프론트엔드에게 전달
            socket.emit('userInfo', { userId: user.userId, username: user.nickname });
            console.log('userInfo', { userId: user.userId, username: user.nickname });

            // 유저 정보 설정
            socket.user = user; // 소켓 객체에 사용자 정보 추가
            userSockets[user.userId] = socket.id; // 사용자 ID와 소켓 ID 매핑
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                console.log('비상비상 에러에러 4-1번.', error.message);
                console.error('인증 오류:', error);
                socket.emit('error', { message: '인증 오류: ' + error.message });
                socket.disconnect();
            } else {
                console.log('비상비상 에러에러 4-2번.', error.message);
                console.error('기타 에러 발생:', error);
                socket.emit('error', { message: '인증 오류: ' + error.message });
                socket.disconnect();
            }
            socket.disconnect();
        }
        console.log('여기까지 와? 5번.');

        // 채팅방 참여 로직 및 과거 메시지 처리
        socket.on('join room', async ({ roomId }) => {
            console.log('여기까지 와? 6번.');

            // 사용자 인증 확인
            if (!socket.user) {
                console.error('join room-socket.user error: 인증되지 않은 사용자입니다.');
                socket.emit('error', { message: '인증되지 않은 사용자입니다.' });
                socket.disconnect();
                return;
            }
            console.log('여기까지 와? 7번.');

            try {
                const room = await prisma.rooms.findUnique({
                    where: { roomId: parseInt(roomId) },
                });
                if (!room) {
                    console.error('채팅방이 존재하지 않습니다.');
                    socket.emit('error', { message: '채팅방이 존재하지 않습니다.' });
                    socket.disconnect();
                    return;
                }

                // 사용자 소켓이 특정 방에 입장할 때
                socket.join(roomId.toString(), () => {
                    console.log(`User ${socket.id} joined room ${roomId}`);
                    socket.emit('joined room', { roomId: roomId });
                });

                // 사용자가 채팅방에 입장할 때, 채팅방 입장 여부 컬럼 값을 true로 변경
                if (!room.hasEntered) {
                    await prisma.rooms.update({
                        where: { roomId: parseInt(roomId) },
                        data: { hasEntered: true },
                    });
                    console.log(`Room ${roomId} hasEntered flag set to true.`);
                }

                console.log('여기까지 와? 8번.');

                userRooms[socket.id] = room.roomId; // 소켓 ID와 방 ID를 매핑하여 저장

                // 방에 입장했다는 메시지를 방의 모든 참여자에게 전송
                io.to(room.roomId.toString()).emit(
                    'room message',
                    `사용자 ${socket.user.userId} (Socket ID: ${socket.id})가 ${room.roomId}에 입장했습니다.`,
                );

                // 방 아이디를 키로하여 초기 타임스탬프 설정
                const lastMessageTimestamp = lastMessageTimestamps.get(`${socket.id}:${roomId}`) || new Date(0);

                console.log('lastMessageTimestamps', lastMessageTimestamps);
                console.log('여기까지 와? 8-3번.');

                const pastMessages = await prisma.chattings.findMany({
                    where: {
                        roomId: parseInt(roomId),
                        createdAt: { gt: lastMessageTimestamp },
                    },
                    orderBy: { createdAt: 'asc' },
                });

                console.log(
                    `Loaded messages from ${lastMessageTimestamp} for room ${roomId}, count: ${pastMessages.length}`,
                );
                console.log(`Loaded messages for room ${roomId}, count: ${pastMessages.length}`);

                console.log('여기까지 와? 8-4번.');
                // // 1번. 사용자가 마지막으로 확인한 메시지의 시점을 기준으로 새 메시지만 불러오길 원한다면 1번.
                // const lastTimestamp =
                //     pastMessages.length > 0 ? pastMessages[pastMessages.length - 1].createdAt : new Date();
                // lastMessageTimestamps.set(`${socket.id}:${roomId}`, lastTimestamp);
                // 2번. 사용자가 방에 재입장하는 시점 이후로 발생한 메시지만 확인하고자 한다면 2번.
                const newTimestamp = new Date();
                lastMessageTimestamps.set(`${socket.id}:${roomId}`, newTimestamp);
            } catch (error) {
                console.error('비상비상 에러에러 9-2번.', error);
                socket.emit('error', { message: '채팅방 참여 중 에러 발생.' });
                socket.disconnect();
            }
        });
        console.log('여기까지 와? 10번.');

        socket.on('chatting', async (data) => {
            console.log('여기까지 와? 11번.');
            console.log('Received data:', data); // 데이터 수신 확인 로그
            //---------------------------------------------------------
            console.log('~~~~~~~~~~~~~Received data.msg', data.msg);
            console.log('~~~~~~~~~~~~~Received data.roomId', data.roomId);

            if (!socket.user) {
                console.error('chatting-socket.user error: 인증되지 않은 사용자입니다.');
                socket.emit('error', { message: '인증되지 않은 사용자입니다.' });
                return;
            }
            console.log('여기까지 와? 12번.');

            // const roomId = userRooms[socket.id];
            if (!data.roomId) {
                console.error('사용자가 참여한 채팅방이 존재하지 않습니다.');
                socket.emit('error', { message: '사용자가 참여한 채팅방이 존재하지 않습니다.' });
                return;
            }

            console.log('여기까지 와? 13번.');
            try {
                const room = await prisma.rooms.findUnique({
                    where: { roomId: parseInt(data.roomId) },
                    select: { status: true }, // status 필드만 선택
                });
                // 채팅 요청이 승인(ACCEPTED)일때만 채팅 활성화. 아니면 비활성화
                if (!room || room.status !== 'ACCEPTED') {
                    console.error('채팅 요청이 승인 되지 않았습니다.');
                    socket.emit('error', { message: '채팅 요청이 승인 되지 않았습니다.' });
                    return;
                }
                // 채팅방에 참여자가 1명인지 확인. 1명이면 채팅 비활성화
                if (!room || room.userId == null || room.commentAuthorId == null) {
                    console.error('채팅방에 다른 사용자가 없어 메시지를 보낼 수 없습니다.');
                    socket.emit('error', { message: '채팅방에 다른 사용자가 없어 메시지를 보낼 수 없습니다.' });
                    return;
                }

                // 데이터가 객체인지 확인 (Socket.io는 일반적으로 이를 자동으로 처리)
                if (typeof data === 'string') {
                    data = JSON.parse(data); // JSON 문자열을 안전하게 파싱
                }
                // 채팅 메시지 데이터베이스에 저장
                const newChat = await prisma.chattings.create({
                    data: {
                        text: data.msg,
                        // roomId: parseInt(roomId),
                        roomId: parseInt(data.roomId),
                        senderId: socket.user.userId,
                    },
                });

                console.log('New chat saved :', newChat);
                console.log(`Message sent in room ${data.roomId} by user ${socket.user.userId}: ${data.msg}`);

                // roomId 참여한 다른 소켓에게 메시지 전송
                io.to(data.roomId.toString()).emit('message', {
                    chatId: newChat.chatId,
                    userId: socket.user.userId,
                    text: data.msg,
                    roomId: parseInt(data.roomId),
                    // time: newChat.createdAt, // DB에서 자동 생성된 시간 사용
                    createdAt: newChat.createdAt, // DB에서 자동 생성된 시간 사용
                });
                console.log('여기까지 와? 14번.');
            } catch (error) {
                console.error('비상비상 에러에러 15번.', error.message);
                console.error(`Database error: ${error}`);
                socket.emit('error', { message: '채팅 저장 중 에러 발생.' });
            }
        });
        console.log('여기까지 와? 16번.');

        socket.on('leave room', () => {
            console.log('여기까지 와? 17번.');
            if (!socket.user) {
                socket.emit('error', { message: '인증되지 않은 사용자입니다.' });
                return;
            }

            const roomId = userRooms[socket.id];
            if (roomId) {
                console.log('여기까지 와? 18번.');
                try {
                    socket.leave(roomId.toString());
                    socket.emit('leaved room', { roomId: roomId });
                    io.to(roomId.toString()).emit(
                        'room message',
                        `사용자 ${socket.user.userId} (Socket ID: ${socket.id})가 방 ${roomId}에서 퇴장했습니다.`,
                    );
                    // userRooms에서 삭제
                    delete userRooms[socket.id];
                    // userSockets에서 삭제
                    delete userSockets[socket.user.userId];
                } catch (error) {
                    console.error(`방을 나가는 도중 에러가 발생했습니다. ${roomId}:`, error);
                    socket.emit('error', { message: '방을 나가는 도중 에러가 발생했습니다.' });
                }
            }
        });
        console.log('여기까지 와? 19번.');

        socket.on('disconnect', () => {
            console.log('여기까지 와? 20번.');
            console.log(`사용자 ${socket.id}가 연결을 해제했습니다.`);
            const roomId = userRooms[socket.id];

            if (roomId) {
                io.to(roomId.toString()).emit(
                    'room message',
                    `사용자 ${socket.user.userId} (Socket ID: ${socket.id})가 방에서 퇴장했습니다.`,
                );
                delete userRooms[socket.id];

                // 해당 소켓이 과거 메시지 정보를 가지고 있다면 해당 정보 삭제
                // clearSocketPastMessages(socket.id);
                clearSocketPastMessages(socket.id, lastMessageTimestamps);
            }
            // 사용자와 소켓 매핑에서 해당 소켓 삭제
            if (socket.user && userSockets[socket.user.userId]) {
                delete userSockets[socket.user.userId];
            }
        });
    });
    return io; // 필요에 따라 io 객체 반환
};

export default initializeSocket;
