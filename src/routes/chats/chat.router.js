// src/routes/chats/chat.router.js
import express from 'express';
import { prisma } from '../../utils/prisma/index.js';
import authMiddleware from '../../middlewares/authMiddleware.js';

const router = express.Router();

// 채팅방 생성
router.post('/createChatRoom', async (req, res) => {
    // router.post('/createChatRoom', authMiddleware, async (req, res) => {
    const { worryId, userId, commentAuthorId } = req.body;
    const parsedWorryId = parseInt(worryId);
    const parsedUserId = parseInt(userId);
    const parsedCommentAuthorId = parseInt(commentAuthorId);

    console.log('대화 요청 정보(body):', worryId, userId, commentAuthorId);
    console.log('대화 요청 정보(Int):', parsedWorryId, parsedUserId, parsedCommentAuthorId);

    try {
        // 해당 고민이 존재하는지 확인
        const existingWorry = await prisma.worries.findUnique({
            where: {
                worryId: parsedWorryId,
            },
            select: {
                userId: true,
                commentAuthorId: true,
            },
        });
        console.log('⭐⭐⭐existingWorry >> ', existingWorry);

        if (!existingWorry) {
            return res.status(404).json({ message: '해당 고민이 존재하지 않습니다.' });
        }

        // 방이 이미 존재하는지 검사
        let room = await prisma.rooms.findUnique({
            where: {
                worryId: parsedWorryId,
            },
        });

        console.log('⭐⭐⭐테스트 1번. room >> ', room);

        // 채팅방이 존재하지 않는 경우, 새로운 채팅방 생성
        if (!room) {
            room = await prisma.rooms.create({
                data: {
                    worryId: parsedWorryId,
                    userId: parsedUserId, // 고민을 등록한 사용자 ID 할당
                    commentAuthorId: parsedCommentAuthorId, // 댓글 작성자 ID 할당
                },
            });
        }
        console.log('⭐⭐⭐테스트 2번. room >> ', room);

        res.status(201).json({
            worryId: room.worryId,
            userId: parsedUserId,
            commentAuthorId: parsedCommentAuthorId,
            roomId: room.roomId,
            message: '대화방이 생성되었습니다.',
        });
    } catch (error) {
        console.log('⭐⭐⭐테스트 3번. 에러 >> ', error.message);
        console.error('대화방 생성 중 에러 발생:', error);
        res.status(500).json({ message: '서버 오류 발생' });
    }
});

// src/routes/chats/chat.router.js
// 로그인한 유저에 해당하는 채팅방 전체 조회
router.get('/chatRooms', authMiddleware, async (req, res) => {
    // router.get('/chatRooms', async (req, res) => {
    const userId = parseInt(res.locals.user.userId);
    // const userId = parseInt(req.body.userId, 10);
    console.log('userId : ', userId);

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
                OR: [{ worry: { userId: userId } }, { worry: { commentAuthorId: userId } }],
                // OR: [{ userId: userId }, { commentAuthorId: userId }],
                status: {
                    in: ['ACCEPTED', 'PENDING'], // 'ACCEPTED'와 'PENDING' 상태만 포함
                },
            },
            include: {
                worry: {
                    select: {
                        // 필요한 필드만 선택
                        unRead: true,
                        isSolved: true,
                        solvingCommentId: true,
                    },
                },
            },
            skip: skip,
            take: limit,
            orderBy: {
                createdAt: 'desc',
            },
        });
        console.log('⭐⭐⭐테스트 6번. rooms >> ', rooms);

        // 각 방의 최신 코멘트 정보를 추가
        // const roomsWithLastComment = await Promise.all(
        //     rooms.map(async (room) => {
        //         const lastComment = await prisma.comments.findFirst({
        //             where: { worryId: room.worryId },
        //             orderBy: { createdAt: 'desc' },
        //         });
        //         return { ...room, lastComment };
        //     }),
        // );
        // 각 방의 최신 코멘트 정보를 추가
        const roomsWithLastComment = await Promise.all(
            rooms.map(async (room) => {
                const lastComment = await prisma.comments.findFirst({
                    where: { worryId: room.worryId },
                    orderBy: { createdAt: 'desc' },
                });
                return {
                    roomId: room.roomId,
                    status: room.status,
                    createdAt: room.createdAt,
                    updatedAt: room.updatedAt,
                    worryId: room.worryId,
                    userId: room.userId,
                    commentAuthorId: room.commentAuthorId,
                    unRead: room.worry.unRead,
                    isSolved: room.worry.isSolved,
                    solvingCommentId: room.worry.solvingCommentId,
                    comment_lastCommentId: lastComment.commentId,
                    comment_lastContent: lastComment.content,
                    // comment_createdAt: lastComment.createdAt,
                    comment_deletedAt: lastComment.deletedAt,
                    comment_fontColor: lastComment.fontColor,
                    comment_unRead: lastComment.unRead,
                    comment_reportReason: lastComment.reportReason,
                };
            }),
        );

        const totalCount = await prisma.rooms.count({
            where: {
                OR: [{ worry: { userId: userId } }, { worry: { commentAuthorId: userId } }],
                status: {
                    in: ['ACCEPTED', 'PENDING'],
                },
            },
        });
        console.log('⭐⭐⭐roomsWithLastComment : ', roomsWithLastComment);
        const pagination = { page, limit, totalCount };
        console.log('🖤🖤🖤pagination : ', pagination);

        // 개선된 JSON 응답 구조
        return res.status(200).json({
            page,
            limit,
            totalCount,
            rooms: roomsWithLastComment,
        });
    } catch (error) {
        console.log('⭐⭐⭐테스트 7번. error >> ', error.message);
        console.error('채팅방 조회 중 에러 발생:', error);
        res.status(500).json({ message: '서버 오류 발생' });
    }
});

export default router;
