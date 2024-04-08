import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from './utils/prisma/index.js';
import moment from 'moment';

const initializeSocket = (httpServer) => {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: '*', // 필요에 따라 CORS 설정 조정
            methods: ['GET', 'POST'],
            credentials: true, // 쿠키를 포함한 요청을 허용할지 여부
        },
    });

    // 소켓 연결 전 인증 및 사용자 정보 설정
    io.use(async (socket, next) => {
        console.log('임시 연결 허용: 인증 과정을 생략합니다.');
        next(); // 모든 사용자의 연결을 허용
        // 아직 프론트엔드와 연결 전이니 아래 토큰 검증 로직은 우선 생략.
        // const token = socket.handshake.auth.token; // 클라이언트로부터 받은 토큰
        // if (!token) {
        //     return next(new Error('인증 토큰이 없습니다.'));
        // }
        // try {
        //     const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        //     const user = await prisma.Users.findUnique({
        //         where: {
        //             userId: decoded.userId,
        //         },
        //     });
        //     console.log('🤍🤍🤍userId : ', userId);
        //     if (!user) {
        //         return next(new Error('인증 오류: 사용자를 찾을 수 없습니다.'));
        //     }
        //     socket.user = user; // 소켓 객체에 사용자 정보 추가
        //     userSockets[user.userId] = socket.id; // 사용자 ID와 소켓 ID 매핑
        //     next();
        // } catch (error) {
        //     if (error.name === 'TokenExpiredError') {
        //         return next(new Error('Access Token이 만료되었습니다.'));
        //     } else {
        //         return next(new Error('인증 오류'));
        //     }
        // }
    });

    // 사용자의 방 정보를 저장할 객체
    let userRooms = {};

    // connection event handler
    // connection이 수립되면 event handler function의 인자로 socket이 들어온다
    io.on('connection', (socket) => {
        // console.log(`인증된 사용자: ${socket.decoded.id}`);
        console.log('사용자가 연결되었습니다.', socket.id);

        // 채팅방 입장 처리
        socket.on('join room', async ({ userId, worryId }) => {
            try {
                // 데이터베이스에서 해당 worryId로 방을 검색
                const room = await prisma.rooms.findFirst({
                    where: {
                        worryId: worryId,
                    },
                });

                if (!room) {
                    // 해당 worryId로 방이 존재하지 않으면 데이터베이스에 새로운 방 생성
                    const newRoom = await prisma.rooms.create({
                        data: {
                            // roomId는 자동으로 생성되므로 명시하지 않음
                            worryId: worryId,
                        },
                    });
                    console.log(`새로운 1:1 채팅 방 ${newRoom.roomId}이 생성되었습니다.`);

                    // 새로 만든 채팅방에 입장
                    socket.join(newRoom.roomId.toString());
                    // userId와 새로운 방 ID를 userRooms 객체에 저장
                    userRooms[userId] = newRoom.roomId;

                    // 해당 채팅방에 있는 모든 사용자에게 메시지 전송
                    io.to(newRoom.roomId.toString()).emit(
                        'room message',
                        `사용자 ${userId}가 ${newRoom.roomId}방에 입장했습니다.`,
                    );
                    // 새로운 방에 입장했다는 것을 클라이언트에 알림
                    socket.emit('joined room', { roomId: newRoom.roomId });
                } else {
                    // 존재하는 방에 입장
                    socket.join(room.roomId.toString());
                    // userId와 방 ID를 userRooms 객체에 저장
                    userRooms[userId] = room.roomId;

                    console.log(`사용자 ${userId}가 1:1 채팅 방 ${room.roomId}에 입장했습니다.`);
                    io.to(room.roomId.toString()).emit(
                        'room message',
                        `사용자 ${userId}가 ${room.roomId}방에 입장했습니다.`,
                    );
                    // 기존 방에 입장했다는 것을 클라이언트에 알림
                    socket.emit('joined room', { roomId: room.roomId });
                }
            } catch (error) {
                console.error('채팅방 정보를 저장하는 데 문제가 발생했습니다:', error);
            }
        });

        // 채팅 메시지 전송
        socket.on('chatting', async ({ userId, name, msg }) => {
            console.log({ userId, name, msg }); // 로그 출력 시 data 대신 직접 파라미터 사용
            const roomId = userRooms[userId]; // userId를 통해 roomId 조회

            if (roomId) {
                io.to(roomId.toString()).emit('chatting', {
                    userId,
                    name,
                    msg,
                    time: new Date().toISOString(), // 현재 시각을 메시지에 포함
                });
            } else {
                console.log('사용자가 아직 채팅 방에 입장하지 않았습니다.');
            }

            try {
                // 채팅 내용 데이터베이스에 저장
                await prisma.chattings.create({
                    data: {
                        room: {
                            connect: {
                                roomId: roomId, // 여기서 roomId가 `undefined`가 아니어야 합니다.
                            },
                        },
                        text: msg,
                        // senderId: userId, // 임시로 userId로 설정
                        sender: {
                            connect: { userId: userId }, // 메시지 보낸 사용자와의 관계를 설정
                        },
                    },
                });
            } catch (error) {
                console.error('Error saving chat message to database:', error);
                // 클라이언트에게 예외를 전달하여 처리할 수 있도록 함
                io.to(socket.id).emit('chatting_error', 'An error occurred while saving chat message to database');
            }
        });

        // 사용자가 방을 퇴장하도록 요청할 때
        socket.on('leave room', () => {
            // 저장된 사용자 방 정보를 사용하여 퇴장 처리
            const room = userRooms[socket.id];
            if (room) {
                socket.leave(room);
                console.log(`사용자 (Socket ID: ${socket.id})가 방 ${room}에서 퇴장했습니다.`);
                io.to(room).emit('room message', `사용자 (Socket ID: ${socket.id})가 방에서 퇴장했습니다.`);

                // 사용자의 방 정보 삭제
                delete userRooms[socket.id];
            }
        });

        // 소켓 연결이 끊어질 때 (예: 사용자가 페이지를 떠날 때)
        socket.on('disconnect', () => {
            const room = userRooms[socket.id];
            if (room) {
                console.log(`사용자 (Socket ID: ${socket.id})가 방 ${room}에서 퇴장했습니다.`);
                io.to(room).emit('room message', `사용자 (Socket ID: ${socket.id})가 방에서 퇴장했습니다.`);

                // 사용자의 방 정보 삭제
                delete userRooms[socket.id];
            }
        });

        //     // 1:1 채팅 메시지 처리 (commentAuthorId에게만 메시지 전송)
        //     socket.on('private message', async ({ commentAuthorId, msg }) => {
        //         console.log(`메시지 받음: ${msg} from ${socket.id} to commentAuthorId: ${commentAuthorId}`);

        //         // commentAuthorId에 해당하는 사용자의 소켓 ID를 찾습니다.
        //         const receiverSocketId = userSockets[commentAuthorId];

        //         if (receiverSocketId) {
        //             // commentAuthorId에 해당하는 사용자에게만 메시지를 전송합니다.
        //             io.to(receiverSocketId).emit('private message', { from: socket.id, msg });
        //             // await saveChatMessage(socket.user.userId, msg); // DB에 메시지 저장
        //         } else {
        //             console.log(`commentAuthorId ${commentAuthorId} 사용자에게 메시지를 전달할 수 없습니다.`);
        //         }
        //     });

        //     // 방 퇴장 처리
        //     socket.on('leave room', (room) => {
        //         socket.leave(room);
        //         // console.log(`사용자 ${socket.user.userId} 가 방 ${room} 에서 퇴장했습니다.`);
        //         console.log(`사용자 ${socket.id} 가 방 ${room} 에서 퇴장했습니다.`);
        //         // io.to(room).emit('room message', `사용자 ${socket.user.userId} 가 방에서 퇴장했습니다.`);
        //         io.to(room).emit('room message', `사용자 ${socket.id} 가 방에서 퇴장했습니다.`);
        //     });

        //     // socket.on('disconnect', () => {
        //     //     console.log(`사용자 ${socket.user.userId}가 연결을 끊었습니다.`);
        //     //     delete userSockets[socket.user.userId]; // 필요한 정리 작업
        //     // });
        //     socket.on('disconnect', () => {
        //         // socket.user 객체가 존재하는지 확인
        //         // if (socket.user && socket.user.userId) {
        //         if (socket.user && socket.id) {
        //             // console.log(`사용자 ${socket.user.userId}가 연결을 끊었습니다.`);
        //             console.log(`사용자 ${socket.id}가 연결을 끊었습니다.`);
        //             // 필요한 정리 작업
        //             // delete userSockets[socket.user.userId];
        //             delete userSockets[socket.id];
        //         } else {
        //             // user 객체가 없는 경우, 다른 메시지를 출력하거나 다른 처리를 할 수 있습니다.
        //             console.log('알 수 없는 사용자가 연결을 끊었습니다.');
        //         }
        //     });

        // 테스트 메시지를 주기적으로 전송하는 함수
        function sendTestMessage() {
            io.emit('chat message', '서버에서 보내는 테스트 메시지');
            console.log('서버에서 테스트 메시지를 전송했습니다.');
        }

        // // 서버 상태 메시지를 주기적으로 전송하는 함수
        // function broadcastServerStatus() {
        //     const statusMessage = '현재 서버 상태는 양호합니다.';
        //     io.emit('server status', statusMessage);
        //     console.log('서버 상태 메시지를 전송했습니다.');
        // }

        // // 서버가 실행된 후 5초 후에 첫 메시지 전송, 그리고 10초마다 반복
        // setTimeout(() => {
        //     sendTestMessage();
        //     setInterval(sendTestMessage, 10000);

        //     // 서버 상태 메시지 전송 시작
        //     broadcastServerStatus();
        //     setInterval(broadcastServerStatus, 10000);
        // }, 5000);

        return io; // 필요에 따라 io 객체를 반환하여 외부에서 사용 가능하게 함
    });
};

export default initializeSocket;
