// src/routes/chats/chat.js
import express from 'express';
import { prisma } from '../../utils/prisma/index.js';
import authMiddleware from '../../middlewares/authMiddleware.js';
import moment from 'moment-timezone';

const router = express.Router();

// 채팅방 생성
router.post('/createChatRoom', authMiddleware, async (req, res) => {
    // router.post('/createChatRoom', async (req, res) => {
    const worryId = parseInt(req.body.worryId);
    const userId = parseInt(res.locals.user.userId);
    // const userId = parseInt(req.body.userId, 10);

    if (isNaN(worryId) || worryId < 1) {
        return res.status(400).json({ message: '유효하지 않은 고민 ID가 제공되었습니다.' });
    }

    try {
        // 해당 고민이 존재하는지 확인
        const existingWorry = await prisma.worries.findUnique({
            where: { worryId: worryId },
            select: { userId: true, commentAuthorId: true },
        });
        if (!existingWorry) {
            return res.status(404).json({ message: '해당 고민이 존재하지 않습니다.' });
        }
        // 사용자 ID 검증 (고민 등록자 확인)
        if (existingWorry.userId !== userId) {
            return res.status(403).json({ message: '고민 등록자만이 채팅방을 생성할 수 있습니다.' });
        }

        // 방이 이미 존재하는지 검사
        let room = await prisma.rooms.findUnique({
            where: { worryId: worryId },
        });

        // 채팅방이 존재하지 않는 경우, 새로운 채팅방 생성
        if (!room) {
            room = await prisma.rooms.create({
                data: {
                    worryId: worryId,
                    userId: existingWorry.userId, // 고민을 등록한 사용자 ID 할당
                    commentAuthorId: existingWorry.commentAuthorId, // 댓글 작성자 ID 할당
                },
            });
        }
        console.log('⭐⭐⭐테스트 room >> ', room);

        return res.status(201).json({
            worryId: room.worryId,
            userId: room.userId,
            commentAuthorId: room.commentAuthorId,
            roomId: room.roomId,
            status: room.status,
            message: '대화방이 생성되었습니다.',
        });
    } catch (error) {
        console.error('채팅방 생성 중 에러 발생:', error);
        res.status(500).json({ message: '서버 오류 발생' });
    }
});

// src/routes/chats/chat.router.js
// 로그인한 유저에 해당하는 채팅방 전체 조회
router.get('/chatRooms', authMiddleware, async (req, res) => {
    // router.get('/chatRooms', async (req, res) => {
    const userId = parseInt(res.locals.user.userId);
    // const userId = parseInt(req.body.userId, 10);

    // 페이지네이션
    const page = parseInt(req.query.page) || 1; // 페이지 번호, 기본값은 1
    const limit = parseInt(req.query.limit) || 10; // 페이지당 항목 수, 기본값은 10
    const skip = (page - 1) * limit;

    // 페이지 번호 유효성 검사
    if (isNaN(page) || page < 1) {
        const err = new Error('유효하지 않은 페이지 번호입니다.');
        err.status = 400;
        throw err;
    }

    try {
        const rooms = await prisma.rooms.findMany({
            where: {
                OR: [{ userId: userId }, { commentAuthorId: userId }],
                status: { in: ['ACCEPTED', 'PENDING'] },
            },
            include: {
                worry: {
                    select: {
                        // 필요한 필드만 선택
                        solvingCommentId: true,
                        unRead: true,
                        isSolved: true,
                        icon: true,
                    },
                },
                // 특정 사용자가 속한 채팅방에 다른 사용자가 보낸 메시지만 조회
                chattings: {
                    where: {
                        senderId: {
                            not: userId, // 사용자 자신이 보낸 메시지 제외
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
            skip: skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        });

        // 각 채팅방에 대해 반복하고, 각 방의 현재 상태를 확인하여 처리
        const updatedRooms = rooms.map((room) => {
            const isRead = room.chattings.every((chat) => chat.isRead); // 모든 메시지가 읽혔는지 확인
            return {
                userId: room.userId,
                commentAuthorId: room.commentAuthorId,
                worryId: room.worryId,
                solvingCommentId: room.worry.solvingCommentId,
                roomId: room.roomId,
                isRead: isRead, // 메시지 읽음 상태 표시
                isSolved: room.worry.isSolved,
                isOwner: room.userId === userId,
                isAccepted: room.status === 'ACCEPTED',
                hasEntered: room.hasEntered, // 사용자가 방에 입장했는지 여부 표시
                icon: room.worry.icon,
                status: room.status,
                updatedAt: room.updatedAt,
            };
        });

        const totalCount = await prisma.rooms.count({
            where: {
                // OR: [{ worry: { userId: userId } }, { worry: { commentAuthorId: userId } }],
                OR: [{ userId: userId }, { commentAuthorId: userId }],
                status: { in: ['ACCEPTED', 'PENDING'] },
            },
        });
        const pagination = { page, limit, totalCount };
        console.log('🖤🖤🖤pagination : ', pagination);

        return res.status(200).json({
            page,
            limit,
            totalCount,
            rooms: updatedRooms,
        });
    } catch (error) {
        console.error('채팅방 조회 중 에러 발생:', error);
        res.status(500).json({ message: '서버 오류 발생' });
    }
});

// src/routes/chats/chat.router.js
// 채팅방 과거 메세지 전체 조회
router.get('/rooms/:roomId', authMiddleware, async (req, res) => {
    // router.get('/rooms/:roomId', async (req, res) => {
    const roomId = parseInt(req.params.roomId);
    const userId = parseInt(res.locals.user.userId);
    // const userId = parseInt(req.body.userId, 10);

    // 페이지네이션
    const page = parseInt(req.query.page) || 1; // 페이지 번호, 기본값은 1
    const limit = parseInt(req.query.limit) || 10; // 페이지당 항목 수, 기본값은 10
    const skip = (page - 1) * limit;

    // 페이지 번호 유효성 검사
    if (isNaN(page) || page < 1) {
        const err = new Error('유효하지 않은 페이지 번호입니다.');
        err.status = 400;
        throw err;
    }

    try {
        const pastMessages = await prisma.chattings.findMany({
            where: {
                roomId: parseInt(roomId),
            },
            include: {
                sender: {
                    select: {
                        userId: true,
                        nickname: true,
                    },
                },
            },
            skip: skip,
            take: limit,
            orderBy: { createdAt: 'asc' },
        });

        const totalCount = await prisma.chattings.count({
            where: {
                roomId: parseInt(roomId),
            },
        });
        const pagination = { page, limit, totalCount };

        // 결과 객체를 새로운 변수에 할당하여 반환 형식을 변경합니다.
        const formattedPastMessages = pastMessages.map((message) => {
            return {
                chatId: message.chatId,
                userId: message.sender.userId,
                // senderId: message.senderId,
                roomId: message.roomId,
                nickname: message.sender.nickname,
                text: message.text,
                isRead: message.isRead,
                createdAt: moment(message.createdAt).tz('Asia/Seoul').format('HH:mm z'),
            };
        });

        return res.json({ page, limit, totalCount, formattedPastMessages });
    } catch (error) {
        console.error('과거 메시지를 가져오는 중 오류 발생:', error);
        res.status(500).json({ error: '과거 메시지를 가져오는 중 오류가 발생했습니다.' });
    }
});

// 채팅 신청 수락
router.put('/acceptChat/:roomId', authMiddleware, async (req, res) => {
    // router.put('/acceptChat/:roomId', async (req, res) => {
    const roomId = parseInt(req.params.roomId);
    const userId = parseInt(res.locals.user.userId);
    // const userId = parseInt(req.body.userId, 10);

    if (isNaN(roomId)) {
        return res.status(400).json({ message: '유효하지 않은 방 ID입니다.' });
    }

    try {
        const room = await prisma.rooms.findUnique({
            where: { roomId: roomId },
        });
        console.log('accept-room', room);

        if (!room) {
            return res.status(404).json({ message: '채팅방이 존재하지 않습니다.' });
        }

        if (room.commentAuthorId !== userId) {
            return res.status(403).json({ message: '이 작업을 수행할 권한이 없습니다.' });
        }
        console.log('accept-room.commentAuthorId', room.commentAuthorId);

        const updatedRoom = await prisma.rooms.update({
            where: { roomId: roomId },
            data: {
                status: 'ACCEPTED',
            },
        });

        // 응답 객체에 isAccepted를 추가하여 반환
        updatedRoom.isAccepted = true;

        return res.status(200).json({ ...updatedRoom, message: '채팅방이 활성화되었습니다.' });
    } catch (error) {
        console.error('채팅방 수락 처리 중 에러 발생:', error);
        res.status(500).json({ message: '서버 오류 발생' });
    }
});

// 채팅 신청 거절
router.delete('/rejectChat/:roomId', authMiddleware, async (req, res) => {
    // router.delete('/rejectChat/:roomId', async (req, res) => {
    const roomId = parseInt(req.params.roomId);
    const userId = parseInt(res.locals.user.userId);
    // const userId = parseInt(req.body.userId, 10);

    if (isNaN(roomId)) {
        return res.status(400).json({ message: '유효하지 않은 방 ID입니다.' });
    }

    try {
        const room = await prisma.rooms.findUnique({
            where: { roomId: roomId },
        });
        console.log('reject-room', room);

        if (!room) {
            return res.status(404).json({ message: '채팅방이 존재하지 않습니다.' });
        }

        if (room.commentAuthorId !== userId) {
            return res.status(403).json({ message: '이 작업을 수행할 권한이 없습니다.' });
        }
        console.log('reject-room.commentAuthorId', room.commentAuthorId);

        await prisma.rooms.delete({
            where: { roomId: roomId },
        });
        return res.status(200).json({ message: '채팅방이 삭제되었습니다.' });
    } catch (error) {
        console.error('채팅방 거절 처리 중 에러 발생:', error);
        res.status(500).json({ message: '서버 오류 발생' });
    }
});

// // 채팅방 수락 또는 거절
// // router.put('/respondToChat/:roomId', authMiddleware, async (req, res) => {
// router.put('/respondToChat/:roomId', async (req, res) => {
//     const roomId = parseInt(req.params.roomId);
//     // const userId = parseInt(res.locals.user.userId);
//     const userId = parseInt(req.body.userId, 10);

//     if (isNaN(roomId)) {
//         return res.status(400).json({ message: '유효하지 않은 방 ID입니다.' });
//     }

//     try {
//         const room = await prisma.rooms.findUnique({
//             where: { roomId: roomId },
//         });

//         if (!room) {
//             return res.status(404).json({ message: '채팅방이 존재하지 않습니다.' });
//         }

//         // 수락/거절은 답변자만 가능
//         if (room.commentAuthorId !== userId) {
//             return res.status(403).json({ message: '이 작업을 수행할 권한이 없습니다.' });
//         }

//         if (room.status === 'ACCEPTED') {
//             const updatedRoom = await prisma.rooms.update({
//                 where: { roomId: roomId },
//                 data: {
//                     status: 'ACCEPTED',
//                     isAccepted: true,
//                 },
//             });
//             return res.status(200).json({ updatedRoom, message: '채팅방이 활성화되었습니다.' });
//         } else if (decision === 'REJECT') {
//             await prisma.rooms.delete({
//                 where: { roomId: roomId },
//             });
//             return res.status(200).json({ message: '채팅방이 삭제되었습니다.' });
//         } else {
//             return res.status(400).json({ message: '유효하지 않은 결정입니다.' });
//         }
//     } catch (error) {
//         console.error('채팅방 응답 처리 중 에러 발생:', error);
//         res.status(500).json({ message: '서버 오류 발생' });
//     }
// });

export default router;
