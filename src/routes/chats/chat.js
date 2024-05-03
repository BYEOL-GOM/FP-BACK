// src/routes/chats/chat.js
import express from 'express';
import { prisma } from '../../utils/prisma/index.js';
import authMiddleware from '../../middlewares/authMiddleware.js';
import moment from 'moment-timezone';

const router = express.Router();

// 채팅방 생성
router.post('/createChatRoom', authMiddleware, async (req, res) => {
    // body에서 worryId 추출 및 유효성 검사
    const { value, error } = createChatRoomSchema.validate({ worryId: req.body.worryId });
    if (error) {
        throw new AppError('데이터 형식이 일치하지 않습니다.', 400);
    }
    const { worryId } = value; // 직접 변환된 값 사용
    const userId = parseInt(res.locals.user.userId);
    // const userId = parseInt(req.body.userId, 10);

    try {
        // 해당 고민이 존재하는지 확인
        const existingWorry = await prisma.worries.findUnique({
            where: { worryId: worryId },
            select: { userId: true, commentAuthorId: true },
        });
        if (!existingWorry) {
            throw new AppError('해당 고민이 존재하지 않아 채팅방을 생성할 수 없습니다.', 404);
        }
        // 사용자 ID 검증 (고민 등록자 확인)
        if (existingWorry.userId !== userId) {
            throw new AppError('고민을 등록한 유저만 채팅방을 생성할 수 있습니다.', 403);
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
        } else {
            throw new AppError(
                '이미 이 고민에 대한 채팅방이 존재합니다. 다른 고민을 선택하거나 기존의 채팅방을 이용해 주세요.',
                409,
            );
        }

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
        next(error);
    }
});

// 로그인한 유저에 해당하는 채팅방 전체 조회
// router.get('/chatRooms', authMiddleware, async (req, res) => {
router.get('/chatRooms', async (req, res) => {
    // const userId = parseInt(res.locals.user.userId);
    const userId = parseInt(req.body.userId, 10);

    // 페이지네이션
    const page = parseInt(req.query.page) || 1; // 페이지 번호, 기본값은 1
    const limit = parseInt(req.query.limit) || 10; // 페이지당 항목 수, 기본값은 10
    const skip = (page - 1) * limit;

    // 페이지 번호 유효성 검사
    if (isNaN(page) || page < 1) {
        throw new AppError('유효하지 않은 페이지 번호입니다.', 400);
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new AppError('페이지당 항목 수가 유효하지 않습니다.', 400);
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
                        solvingCommentId: true,
                        unRead: true,
                        isSolved: true,
                        icon: true,
                        comments: {
                            // 여기서 comments를 include 대신 select에 추가합니다.
                            select: {
                                content: true,
                            },
                            take: 1,
                            orderBy: { createdAt: 'desc' },
                        },
                    },
                },
                chattings: {
                    where: {
                        senderId: {
                            not: userId,
                        },
                    },
                    take: 1, // 가장 최근 메시지 하나만 가져오기
                    orderBy: { createdAt: 'desc' },
                },
            },
            skip: skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        });

        // 채팅방이 없는 경우 빈 배열 반환
        if (rooms.length === 0) {
            return res.status(200).json({
                page,
                limit,
                totalCount: 0,
                rooms: [],
            });
        }

        // 각 채팅방에 대해 반복하고, 각 방의 현재 상태를 확인하여 처리
        const updatedRooms = rooms.map((room) => {
            // roomId와 worryId는 항상 존재해야 함
            if (!room.roomId || !room.worryId) {
                throw new AppError('데이터 무결성 오류: 필수 채팅방 데이터가 누락되었습니다.', 409);
            }

            const lastCommentContent = room.worry.comments.length > 0 ? room.worry.comments[0].content : 'No comments';
            const lastChatting = room.chattings.length > 0 ? room.chattings[0] : 'No messages';
            const lastChattingMessage = lastChatting.text;
            const isRead = room.chattings.every((chat) => chat.isRead); // 모든 메시지가 읽혔는지 확인
            const formattedUpdatedAt = moment(room.updatedAt).tz('Asia/Seoul').format('YYYY-MM-DDTHH:mm:ssZ'); // 뒤에 +09:00
            // const formattedUpdatedAt = moment(room.updatedAt).tz('Asia/Seoul').format('YYYY-MM-DDTHH:mm:ss');
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
                lastCommentContent: lastCommentContent,
                lastChattingMessage: lastChattingMessage,
                icon: room.worry.icon,
                status: room.status,
                updatedAt: formattedUpdatedAt,
            };
        });

        const totalCount = await prisma.rooms.count({
            where: {
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
        next(error);
    }
});

// src/routes/chats/chat.router.js
// 채팅방 과거 메세지 전체 조회
router.get('/rooms/:roomId', authMiddleware, async (req, res) => {
    // 스키마를 이용하여 요청 파라미터 유효성 검사
    const { value, error } = roomIdSchema.validate({ roomId: req.params.roomId });
    // 유효성 검사 실패 시 에러 처리
    if (error) {
        throw new AppError('데이터 형식이 일치하지 않습니다.', 400);
    }
    const { roomId } = value;
    const userId = parseInt(res.locals.user.userId);
    // const userId = parseInt(req.body.userId, 10);

    // 페이지네이션
    const page = parseInt(req.query.page) || 1; // 페이지 번호, 기본값은 1
    const limit = parseInt(req.query.limit) || 10; // 페이지당 항목 수, 기본값은 10
    const skip = (page - 1) * limit;

    // 페이지 번호 유효성 검사
    if (isNaN(page) || page < 1) {
        throw new AppError('유효하지 않은 페이지 번호입니다.', 400);
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new AppError('페이지당 항목 수가 유효하지 않습니다.', 400);
    }

    try {
        // 채팅방이 존재하는지 확인
        const room = await prisma.rooms.findUnique({
            where: { roomId: roomId },
        });
        // 요청한 채팅방이 존재하지 않는 경우
        if (!room) {
            throw new AppError('채팅방을 찾을 수 없습니다.', 404);
        }

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

        // 채팅 메시지가 없는 경우
        if (pastMessages.length === 0) {
            return res.json({ page, limit, totalCount: 0, formattedPastMessages: [] });
        }

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
                roomId: message.roomId,
                nickname: message.sender.nickname,
                text: message.text,
                isRead: message.isRead,
                createdAt: message.createdAt,
            };
        });

        return res.json({ page, limit, totalCount, formattedPastMessages });
    } catch (error) {
        console.error('과거 메시지를 가져오는 중 오류 발생:', error);
        next(error);
    }
});

// 채팅 신청 승인
router.put('/acceptChat/:roomId', authMiddleware, async (req, res) => {
    // 스키마를 이용하여 요청 파라미터 유효성 검사
    const { value, error } = roomIdSchema.validate({ roomId: req.params.roomId });
    // 유효성 검사 실패 시 에러 처리
    if (error) {
        throw new AppError('데이터 형식이 일치하지 않습니다.', 400);
    }
    const { roomId } = value;
    const userId = parseInt(res.locals.user.userId);
    // const userId = parseInt(req.body.userId, 10);

    try {
        const room = await prisma.rooms.findUnique({
            where: { roomId: roomId },
        });
        // 채팅방이 존재하지 않을 때
        if (!room) {
            throw new AppError('채팅방이 존재하지 않습니다.', 404);
        }

        // 현재 유저가 고민의 답변자가 아닐 때
        if (room.commentAuthorId !== userId) {
            throw new AppError('고민의 답변자만 승인할 수 있습니다.', 403);
        }
        console.log('accept-room.commentAuthorId', room.commentAuthorId);

        const updatedRoom = await prisma.rooms.update({
            where: { roomId: roomId },
            data: {
                status: 'ACCEPTED',
            },
        });
        if (!updatedRoom) {
            throw new AppError('채팅방 상태를 업데이트할 수 없습니다.', 422);
        }
        // 응답 객체에 isAccepted를 추가하여 반환 (프론트엔드를 위한 임시 컬럼 추가)
        updatedRoom.isAccepted = true;

        return res.status(200).json({ ...updatedRoom, message: '채팅방이 활성화되었습니다.' });
    } catch (error) {
        console.error('채팅방 수락 처리 중 에러 발생:', error);
        next(error);
    }
});

// 채팅 신청 거절
router.delete('/rejectChat/:roomId', authMiddleware, async (req, res) => {
    // 스키마를 이용하여 요청 파라미터 유효성 검사
    const { value, error } = roomIdSchema.validate({ roomId: req.params.roomId });
    // 유효성 검사 실패 시 에러 처리
    if (error) {
        throw new AppError('데이터 형식이 일치하지 않습니다.', 400);
    }
    const { roomId } = value;
    const userId = parseInt(res.locals.user.userId);
    // const userId = parseInt(req.body.userId, 10);

    try {
        const room = await prisma.rooms.findUnique({
            where: { roomId: roomId },
        });
        // 채팅방이 존재하지 않을 때
        if (!room) {
            throw new AppError('채팅방이 존재하지 않습니다.', 404);
        }

        // 현재 유저가 고민의 답변자가 아닐 때
        if (room.commentAuthorId !== userId) {
            throw new AppError('고민의 답변자만 승인할 수 있습니다.', 403);
        }
        console.log('reject-room.commentAuthorId', room.commentAuthorId);

        await prisma.rooms.delete({
            where: { roomId: roomId },
        });
        return res.status(200).json({ message: '채팅방이 삭제되었습니다.' });
    } catch (error) {
        console.error('채팅방 거절 처리(삭제) 중 에러 발생:', error);
        next(error);
    }
});

// 채팅방 나가기 API
router.delete('/rooms/:roomId/leave', authMiddleware, async (req, res) => {
    // 스키마를 이용하여 요청 파라미터 유효성 검사
    const { value, error } = roomIdSchema.validate({ roomId: req.params.roomId });
    // 유효성 검사 실패 시 에러 처리
    if (error) {
        throw new AppError('데이터 형식이 일치하지 않습니다.', 400);
    }
    const { roomId } = value;
    const userId = parseInt(res.locals.user.userId);
    // const userId = parseInt(req.body.userId, 10);

    try {
        const room = await prisma.rooms.findUnique({
            where: { roomId: roomId },
        });
        // 채팅방이 존재하지 않을 때
        if (!room) {
            throw new AppError('채팅방이 존재하지 않습니다.', 404);
        }

        // userId 혹은 commentAuthorId가 현재 유저 ID와 일치하는지 확인 후 해당 필드를 null로 업데이트
        if (room.userId === userId) {
            await prisma.rooms.update({
                where: { roomId: roomId },
                data: { userId: null },
            });
        } else if (room.commentAuthorId === userId) {
            await prisma.rooms.update({
                where: { roomId: roomId },
                data: { commentAuthorId: null },
            });
        } else {
            // 사용자가 이미 채팅방에 없는 경우 에러 처리
            throw new AppError('사용자가 이미 채팅방에 존재하지 않습니다.', 400);
        }

        return res.status(200).json({ message: `채팅방에서 사용자 ${userId}가 나갔습니다.` });
    } catch (error) {
        console.error('채팅방 나가기 처리 중 에러 발생:', error);
        next(error);
    }
});

export default router;
