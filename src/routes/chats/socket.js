// src/routes/chats/socket.js
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../../utils/prisma/index.js';
import moment from 'moment-timezone';

//             // 사용자가 채팅하기 버튼을 누르면 실행
//             socket.on('join room', async (otherUserId) => {
//                 let room = await prisma.roomParticipants.findFirst({
//                     where: {
//                         userId: otherUserId,
//                         roomId: {
//                             in: prisma.roomParticipants
//                                 .findMany({
//                                     where: { userId: socket.user.userId },
//                                     select: { roomId: true },
//                                 })
//                                 .map((participant) => participant.roomId),
//                         },
//                     },
//                     include: { room: true },
//                 });
//                 if (!room) {
//                     // 방이 없으면 생성
//                     const newRoom = await prisma.rooms.create({ data: {} });
//                     // 두 사용자를 방에 추가
//                     await prisma.roomParticipants.createMany({
//                         data: [
//                             { roomId: newRoom.roomId, userId: socket.user.userId },
//                             { roomId: newRoom.roomId, userId: otherUserId },
//                         ],
//                     });
//                     room = newRoom;
//                 }
//                 // // 새로운 채팅방 생성
//                 // const newRoom = await prisma.rooms.create({
//                 //     data: {
//                 //         // title: 'New Chat Room', // 제목은 수정 가능
//                 //         // worryId: worryId, // worryId 포함
//                 //     },
//                 // });

//                 // 방에 입장
//                 socket.join(room.roomId.toString());
//                 userRooms[socket.id] = room.roomId;
//                 console.log('roomId : ', room.roomId);

//                 // 입장 성공 메시지 및 방 입장 알림 메시지 전송
//                 io.to(room.roomId.toString()).emit('room message', {
//                     message: `사용자 ${socket.user.id} (Socket ID: ${socket.id})가 방${newRoom.roomId}에 입장했습니다.`,
//                     roomId: room.roomId,
//                 });
//             });
//--------------------------------------------------------------------------------------------
// 20240430 첫 연결 성공. 토큰 확인. 에러 : 'join room' - 인증되지 않은 사용자입니다.
const initializeSocket = (server, corsOptions) => {
    const io = new SocketIOServer(server, {
        cors: corsOptions,
    });

    // 사용자와 소켓 간의 매핑을 저장할 객체
    const userSockets = {}; // 사용자와 소켓 간의 매핑을 저장할 객체
    // 사용자의 방 정보를 저장할 객체
    let userRooms = {};

    // connection event handler
    // connection이 수립되면 event handler function의 인자로 socket이 들어온다
    io.on('connection', async (socket) => {
        console.log('사용자가 연결되었습니다.', socket.id); // 소켓마다 고유의 식별자를 가짐 (20자)
        console.log('연결 횟수 >> ', io.engine.clientsCount); // 연결된 소켓의 개수

        // 인증 토큰 검증
        const token = socket.handshake.auth.token; // 클라이언트로부터 받은 토큰
        socket.emit('connected', { message: '백엔드 소켓 연결에 성공했습니다!' });

        // 토큰이 존재하는 경우에만 처리
        if (token) {
            const [bearer, tokenValue] = token.split(' ');
            if (bearer !== 'Bearer') {
                socket.emit('token error', { message: '토큰 타입이 Bearer 형식이 아닙니다' });
                console.log('token error', { message: '토큰 타입이 Bearer 형식이 아닙니다' });
                socket.disconnect();
                return;
            }
            console.log('⭐⭐⭐여기까지 와? 1번.');
            try {
                const decoded = jwt.verify(tokenValue, process.env.ACCESS_TOKEN_SECRET);
                const user = await prisma.users.findUnique({
                    where: {
                        userId: decoded.userId,
                    },
                });
                console.log('⭐⭐⭐여기까지 와? 2번.');

                if (!user) {
                    socket.emit('error', { message: '인증 오류: 사용자를 찾을 수 없습니다.' });
                    socket.disconnect();
                    return;
                }
                console.log('⭐⭐⭐여기까지 와? 3번.');

                // 유저 정보를 프론트엔드에게 전달
                socket.emit('userInfo', { userId: user.userId, username: user.nickname });
                console.log('userInfo', { userId: user.userId, username: user.nickname });

                // 유저 정보 설정
                socket.user = user; // 소켓 객체에 사용자 정보 추가
                userSockets[user.userId] = socket.id; // 사용자 ID와 소켓 ID 매핑
            } catch (error) {
                console.log('🚨🚨🚨비상비상 에러에러 4-0번.4-0번.');
                if (error.name === 'TokenExpiredError') {
                    console.log('🚨🚨🚨비상비상 에러에러 4-1번.4-1번.', error.message);
                    console.error('인증 오류:', error);
                    socket.emit('error', { message: '인증 오류: ' + error.message });
                    socket.disconnect();
                } else {
                    console.log('🚨🚨🚨비상비상 에러에러 4-2번.4-2번.', error.message);
                    console.error('기타 에러 발생:', error);
                    socket.emit('error', { message: '인증 오류: ' + error.message });
                    socket.disconnect();
                }
            }
        } else {
            // 토큰이 없는 경우 에러 처리
            console.log('🚨🚨🚨비상비상 에러에러 4-3번.4-3번.', error.message);
            console.error('error', error);
            socket.emit('error', { message: '인증 토큰이 없습니다.' });
            socket.disconnect();
        }
        console.log('⭐⭐⭐여기까지 와? 5번.');

        // 채팅방 참여 요청 처리
        socket.on('join room', async ({ roomId }) => {
            console.log('⭐⭐⭐여기까지 와? 6번.');
            console.log('Room join request for:', roomId);

            // 사용자 인증 확인
            if (!socket.user) {
                console.log('🚨🚨🚨비상비상 에러에러 6.5번.6.5번.', error.message);
                console.error('socket.user error:', error);
                socket.emit('error', { message: '인증되지 않은 사용자입니다.' });
                return;
            }

            console.log('socket.user : ', socket.user);
            console.log('⭐⭐⭐여기까지 와? 7번.');

            try {
                const room = await prisma.rooms.findUnique({
                    where: { roomId: parseInt(roomId) },
                });

                if (room) {
                    console.log('⭐⭐⭐여기까지 와? 8번.');
                    console.log(`User joined room: ${room.roomId}`);

                    socket.join(room.roomId.toString());
                    userRooms[socket.id] = room.roomId; // 소켓 ID와 방 ID를 매핑하여 저장

                    io.to(room.roomId.toString()).emit(
                        'room message',
                        `사용자 ${socket.user.userId} (Socket ID: ${socket.id})가 ${room.roomId || '채팅방'}에 입장했습니다.`,
                    );
                } else {
                    console.log('🚨🚨🚨비상비상 에러에러 9-1번.9-1번.', error.message);
                    socket.emit('error', { message: '채팅방이 존재하지 않습니다.' });
                    socket.disconnect();
                }
            } catch (error) {
                console.error('🚨🚨🚨비상비상 에러에러 9-2번.9-2번.', error.message);
                socket.emit('error', { message: '채팅방 참여 중 에러 발생.' });
                socket.disconnect();
            }
        });
        console.log('⭐⭐⭐여기까지 와? 10번.');
        //-----------------------------------------------------------------------------------
        //     if (occupants < 2) {
        //         console.log('🚨🚨🚨여기까지 와? 8번.');
        //         try {
        //             const room = await prisma.rooms.findUnique({
        //                 where: {
        //                     roomId: roomId,
        //                 },
        //             });
        //             if (!room) {
        //                 socket.emit('error', { message: '해당 방을 찾을 수 없습니다.' });
        //                 return;
        //             }
        //             socket.join(roomId.toString());
        //             userRooms[socket.user.userId] = roomId; // 수정된 부분: Socket ID가 아닌 사용자의 ID를 키로 사용합니다.
        //             socket.emit('joined room', { roomId: roomId });
        //             io.to(roomId.toString()).emit(
        //                 'room message',
        //                 `사용자 ${socket.user.userId} (Socket ID: ${socket.id})가 ${room.name}방에 입장했습니다.`,
        //             );
        //         } catch (error) {
        //             console.error('방 입장 중 에러:', error);
        //             socket.emit('error', { message: '방 입장 중 에러가 발생했습니다.' });
        //         }
        //     } else {
        //         socket.emit('error', { message: `방 ${roomId}이 꽉 찼습니다.` });
        //         console.log(`방 ${roomId}이(가) 꽉 찼습니다.`);
        //     }
        // });
        //-----------------------------------------------------------------------------------

        socket.on('chatting', async (data) => {
            console.log('⭐⭐⭐여기까지 와? 11번.');
            console.log('data : ', data);

            if (!socket.user) {
                socket.emit('error', { message: '인증되지 않은 사용자입니다.' });
                return;
            }
            console.log('⭐⭐⭐여기까지 와? 12번.');
            console.log('socket.user', socket.user);

            const roomId = userRooms[socket.id];
            if (roomId) {
                console.log('⭐⭐⭐여기까지 와? 13번.');
                try {
                    if (typeof data === 'string') {
                        data = JSON.parse(data);
                    }
                    // DB 저장용 한국 시간 포맷
                    const formattedDate = moment().tz('Asia/Seoul').format('YYYY-MM-DDTHH:mm:ssZ'); // 시간대 오프셋이 포함된 ISO-8601 형식

                    // 채팅 메시지 데이터베이스에 저장
                    const newChat = await prisma.chattings.create({
                        data: {
                            text: data.msg,
                            roomId: parseInt(roomId),
                            senderId: socket.user.userId,
                            createdAt: formattedDate, // moment로 포맷된 시간 저장
                        },
                    });
                    // 클라이언트에 전송할 메시지 데이터 포맷팅
                    const timeForClient = moment(newChat.createdAt).tz('Asia/Seoul').format('HH:mm'); // 클라이언트 전송용 포맷

                    console.log('⭐⭐⭐여기까지 와? 14번.');
                    console.log('New chat saved :', newChat);

                    // 다른 소켓에게 메시지 전송
                    io.to(roomId).emit('chatting', {
                        userId: socket.user.userId,
                        text: data.msg,
                        roomId: roomId,
                        time: timeForClient,
                    });
                } catch (error) {
                    console.error('🚨🚨🚨비상비상 에러에러 15-1번.15-1번.', error.message);
                    console.error('Database error:', error);
                    socket.emit('error', { message: '채팅 저장 중 에러 발생.' });
                }
            } else {
                console.error(
                    '🚨🚨🚨비상비상 에러에러 15-2번.15-2번. >> 어떤 방에도 속해있지 않습니다.',
                    error.message,
                );
                console.log(`사용자 ${socket.user.userId}는 어떤 방에도 속해있지 않습니다.`);
            }
        });

        console.log('⭐⭐⭐여기까지 와? 16번.');

        socket.on('leave room', () => {
            console.log('⭐⭐⭐여기까지 와? 17번.');
            if (!socket.user) {
                socket.emit('error', { message: '인증되지 않은 사용자입니다.' });
                return;
            }
            const roomId = userRooms[socket.id];
            if (roomId) {
                console.log('⭐⭐⭐여기까지 와? 18번.');

                socket.leave(roomId.toString());
                socket.emit('leaved room', { roomId: roomId });
                io.to(roomId.toString()).emit(
                    'room message',
                    `사용자 ${socket.user.userId} (Socket ID: ${socket.id})가 방 ${roomId}에서 퇴장했습니다.`,
                );
                delete userRooms[socket.id];
            }
        });
        console.log('⭐⭐⭐여기까지 와? 19번.');

        socket.on('disconnect', () => {
            console.log('⭐⭐⭐여기까지 와? 20번.');
            const roomId = userRooms[socket.id];
            if (roomId) {
                io.to(roomId.toString()).emit(
                    'room message',
                    `사용자 ${socket.user.userId} (Socket ID: ${socket.id})가 방에서 퇴장했습니다.`,
                );
                delete userRooms[socket.id];
            }
        });
    });
    return io; // 필요에 따라 io 객체 반환
};

export default initializeSocket;

//--------------------------------------------------------------------------------------------
// const initializeSocket = (httpServer) => {
//     const io = new SocketIOServer(httpServer, {
//         cors: {
//             origin: '*', // 필요에 따라 CORS 설정 조정
//             methods: ['GET', 'POST'],
//             credentials: true, // 쿠키를 포함한 요청을 허용할지 여부
//         },
//     });

//     // 소켓 연결 전 인증 및 사용자 정보 설정
//     io.use(async (socket, next) => {
//         console.log('임시 연결 허용: 인증 과정을 생략합니다.');
//         next(); // 모든 사용자의 연결을 허용
//         // 아직 프론트엔드와 연결 전이니 아래 토큰 검증 로직은 우선 생략.
//         // const token = socket.handshake.auth.token; // 클라이언트로부터 받은 토큰
//         // if (!token) {
//         //     return next(new Error('인증 토큰이 없습니다.'));
//         // }
//         // try {
//         //     const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
//         //     const user = await prisma.Users.findUnique({
//         //         where: {
//         //             userId: decoded.userId,
//         //         },
//         //     });
//         //     console.log('🤍🤍🤍userId : ', userId);
//         //     if (!user) {
//         //         return next(new Error('인증 오류: 사용자를 찾을 수 없습니다.'));
//         //     }
//         //     socket.user = user; // 소켓 객체에 사용자 정보 추가
//         //     userSockets[user.userId] = socket.id; // 사용자 ID와 소켓 ID 매핑
//         //     next();
//         // } catch (error) {
//         //     if (error.name === 'TokenExpiredError') {
//         //         return next(new Error('Access Token이 만료되었습니다.'));
//         //     } else {
//         //         return next(new Error('인증 오류'));
//         //     }
//         // }
//     });

//     // 사용자의 방 정보를 저장할 객체
//     let userRooms = {};

//     // connection event handler
//     // connection이 수립되면 event handler function의 인자로 socket이 들어온다
//     io.on('connection', (socket) => {
//         // console.log(`인증된 사용자: ${socket.decoded.id}`);
//         console.log('사용자가 연결되었습니다.', socket.id);

//         // 채팅방 입장 처리
//         socket.on('join room', async ({ userId, worryId }) => {
//             try {
//                 // 데이터베이스에서 해당 worryId로 방을 검색
//                 const room = await prisma.rooms.findFirst({
//                     where: {
//                         worryId: worryId,
//                     },
//                 });

//                 if (!room) {
//                     // 해당 worryId로 방이 존재하지 않으면 데이터베이스에 새로운 방 생성
//                     const newRoom = await prisma.rooms.create({
//                         data: {
//                             // roomId는 자동으로 생성되므로 명시하지 않음
//                             worryId: worryId,
//                         },
//                     });
//                     console.log(`새로운 1:1 채팅 방 ${newRoom.roomId}이 생성되었습니다.`);

//                     // 새로 만든 채팅방에 입장
//                     socket.join(newRoom.roomId.toString());
//                     // userId와 새로운 방 ID를 userRooms 객체에 저장
//                     userRooms[userId] = newRoom.roomId;

//                     // 해당 채팅방에 있는 모든 사용자에게 메시지 전송
//                     io.to(newRoom.roomId.toString()).emit(
//                         'room message',
//                         `사용자 ${userId}가 ${newRoom.roomId}방에 입장했습니다.`,
//                     );
//                     // 새로운 방에 입장했다는 것을 클라이언트에 알림
//                     socket.emit('joined room', { roomId: newRoom.roomId });
//                 } else {
//                     // 존재하는 방에 입장
//                     socket.join(room.roomId.toString());
//                     // userId와 방 ID를 userRooms 객체에 저장
//                     userRooms[userId] = room.roomId;

//                     console.log(`사용자 ${userId}가 1:1 채팅 방 ${room.roomId}에 입장했습니다.`);
//                     io.to(room.roomId.toString()).emit(
//                         'room message',
//                         `사용자 ${userId}가 ${room.roomId}방에 입장했습니다.`,
//                     );
//                     // 기존 방에 입장했다는 것을 클라이언트에 알림
//                     socket.emit('joined room', { roomId: room.roomId });
//                 }
//             } catch (error) {
//                 console.error('채팅방 정보를 저장하는 데 문제가 발생했습니다:', error);
//             }
//         });

//         // 채팅 메시지 전송
//         socket.on('chatting', async ({ userId, name, msg }) => {
//             console.log({ userId, name, msg }); // 로그 출력 시 data 대신 직접 파라미터 사용
//             const roomId = userRooms[userId]; // userId를 통해 roomId 조회

//             if (roomId) {
//                 io.to(roomId.toString()).emit('chatting', {
//                     userId,
//                     name,
//                     msg,
//                     time: moment(new Date().toISOString()), // 현재 시각을 메시지에 포함
//                 });
//             } else {
//                 console.log('사용자가 아직 채팅 방에 입장하지 않았습니다.');
//             }

//             try {
//                 // 채팅 내용 데이터베이스에 저장
//                 await prisma.chattings.create({
//                     data: {
//                         room: {
//                             connect: {
//                                 roomId: roomId, // 여기서 roomId가 `undefined`가 아니어야 합니다.
//                             },
//                         },
//                         text: msg,
//                         // senderId: userId, // 임시로 userId로 설정
//                         sender: {
//                             connect: { userId: userId }, // 메시지 보낸 사용자와의 관계를 설정
//                         },
//                     },
//                 });
//             } catch (error) {
//                 console.error('Error saving chat message to database:', error);
//                 // 클라이언트에게 예외를 전달하여 처리할 수 있도록 함
//                 io.to(socket.id).emit('chatting_error', 'An error occurred while saving chat message to database');
//             }
//         });

//         // 사용자가 방을 퇴장하도록 요청할 때
//         socket.on('leave room', ({ userId }) => {
//             // 저장된 사용자 방 정보를 사용하여 퇴장 처리
//             const roomId = userRooms[userId]; // userId를 통해 roomId를 찾습니다.
//             // if (room) {
//             //     socket.leave(room);
//             //     console.log(`사용자 (Socket ID: ${socket.id})가 방 ${room}에서 퇴장했습니다.`);
//             //     io.to(room).emit('room message', `사용자 (Socket ID: ${socket.id})가 방에서 퇴장했습니다.`);

//             //     // 사용자의 방 정보 삭제
//             //     delete userRooms[socket.id];
//             // }
//             if (roomId) {
//                 // 사용자를 방에서 제거
//                 socket.leave(roomId.toString());
//                 console.log(`사용자 ${userId}가 방 ${roomId}에서 퇴장했습니다.`);

//                 // 방에 남은 사용자들에게 메시지를 전송합니다.
//                 io.to(roomId.toString()).emit('room message', `사용자 ${userId}가 방 ${roomId}에서 퇴장했습니다.`);

//                 // 사용자의 방 정보를 userRooms 객체에서 삭제합니다.
//                 delete userRooms[userId];
//             } else {
//                 console.log('사용자가 아직 어떤 채팅 방에도 속해있지 않습니다.');
//             }
//         });

//         // 소켓 연결이 끊어질 때 (예: 사용자가 페이지를 떠날 때)
//         socket.on('disconnect', () => {
//             const room = userRooms[socket.id];
//             if (room) {
//                 console.log(`사용자 (Socket ID: ${socket.id})가 방 ${room}에서 퇴장했습니다.`);
//                 io.to(room).emit('room message', `사용자 (Socket ID: ${socket.id})가 방에서 퇴장했습니다.`);

//                 // 사용자의 방 정보 삭제
//                 delete userRooms[socket.id];
//             }
//         });

//         //     // 1:1 채팅 메시지 처리 (commentAuthorId에게만 메시지 전송)
//         //     socket.on('private message', async ({ commentAuthorId, msg }) => {
//         //         console.log(`메시지 받음: ${msg} from ${socket.id} to commentAuthorId: ${commentAuthorId}`);

//         //         // commentAuthorId에 해당하는 사용자의 소켓 ID를 찾습니다.
//         //         const receiverSocketId = userSockets[commentAuthorId];

//         //         if (receiverSocketId) {
//         //             // commentAuthorId에 해당하는 사용자에게만 메시지를 전송합니다.
//         //             io.to(receiverSocketId).emit('private message', { from: socket.id, msg });
//         //             // await saveChatMessage(socket.user.userId, msg); // DB에 메시지 저장
//         //         } else {
//         //             console.log(`commentAuthorId ${commentAuthorId} 사용자에게 메시지를 전달할 수 없습니다.`);
//         //         }
//         //     });

//         //     // 방 퇴장 처리
//         //     socket.on('leave room', (room) => {
//         //         socket.leave(room);
//         //         // console.log(`사용자 ${socket.user.userId} 가 방 ${room} 에서 퇴장했습니다.`);
//         //         console.log(`사용자 ${socket.id} 가 방 ${room} 에서 퇴장했습니다.`);
//         //         // io.to(room).emit('room message', `사용자 ${socket.user.userId} 가 방에서 퇴장했습니다.`);
//         //         io.to(room).emit('room message', `사용자 ${socket.id} 가 방에서 퇴장했습니다.`);
//         //     });

//         //     // socket.on('disconnect', () => {
//         //     //     console.log(`사용자 ${socket.user.userId}가 연결을 끊었습니다.`);
//         //     //     delete userSockets[socket.user.userId]; // 필요한 정리 작업
//         //     // });
//         //     socket.on('disconnect', () => {
//         //         // socket.user 객체가 존재하는지 확인
//         //         // if (socket.user && socket.user.userId) {
//         //         if (socket.user && socket.id) {
//         //             // console.log(`사용자 ${socket.user.userId}가 연결을 끊었습니다.`);
//         //             console.log(`사용자 ${socket.id}가 연결을 끊었습니다.`);
//         //             // 필요한 정리 작업
//         //             // delete userSockets[socket.user.userId];
//         //             delete userSockets[socket.id];
//         //         } else {
//         //             // user 객체가 없는 경우, 다른 메시지를 출력하거나 다른 처리를 할 수 있습니다.
//         //             console.log('알 수 없는 사용자가 연결을 끊었습니다.');
//         //         }
//         //     });

//         // 테스트 메시지를 주기적으로 전송하는 함수
//         function sendTestMessage() {
//             io.emit('chat message', '서버에서 보내는 테스트 메시지');
//             console.log('서버에서 테스트 메시지를 전송했습니다.');
//         }

//         // // 서버 상태 메시지를 주기적으로 전송하는 함수
//         // function broadcastServerStatus() {
//         //     const statusMessage = '현재 서버 상태는 양호합니다.';
//         //     io.emit('server status', statusMessage);
//         //     console.log('서버 상태 메시지를 전송했습니다.');
//         // }

//         // // 서버가 실행된 후 5초 후에 첫 메시지 전송, 그리고 10초마다 반복
//         // setTimeout(() => {
//         //     sendTestMessage();
//         //     setInterval(sendTestMessage, 10000);

//         //     // 서버 상태 메시지 전송 시작
//         //     broadcastServerStatus();
//         //     setInterval(broadcastServerStatus, 10000);
//         // }, 5000);

//         return io; // 필요에 따라 io 객체를 반환하여 외부에서 사용 가능하게 함
//     });
// };

// export default initializeSocket;
