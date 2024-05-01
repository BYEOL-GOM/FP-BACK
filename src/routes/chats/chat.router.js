// src/routes/chats/chat.router.js
import express from 'express';
import { prisma } from '../../utils/prisma/index.js';
import authMiddleware from '../../middlewares/authMiddleware.js';

const router = express.Router();

// 채팅방 생성
router.post('/createChatRoom', authMiddleware, async (req, res) => {
    // router.post('/createChatRoom', async (req, res) => {
    const { worryId, userId, commentAuthorId } = req.body;
    const parsedWorryId = parseInt(worryId);
    const parsedUserId = parseInt(userId);
    const parsedCommentAuthorId = parseInt(commentAuthorId);

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
        console.log('⭐⭐⭐테스트 room >> ', room);

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
                    orderBy: {
                        createdAt: 'desc',
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

        // // 각 방의 최신 코멘트 정보를 추가
        // const roomsWithLastComment = await Promise.all(
        //     rooms.map(async (room) => {
        //         const lastComment = await prisma.comments.findFirst({
        //             where: { worryId: room.worryId },
        //             orderBy: { createdAt: 'desc' },
        //         });
        //         const isOwner = room.userId === userId; // 고민을 등록한 사람인지 여부
        //         const isAccepted = room.status === 'ACCEPTED'; // 승인된 상태인지 여부
        //         return {
        //             userId: room.userId,
        //             commentAuthorId: room.commentAuthorId,
        //             worryId: room.worryId,
        //             solvingCommentId: room.worry.solvingCommentId,
        //             roomId: room.roomId,
        //             // unRead: room.worry.unRead,
        //             unRead: lastComment.unRead, // 안 읽었는지 여부
        //             isSolved: room.worry.isSolved, // 좋아요를 받았는지 여부
        //             isOwner: isOwner, // 사용자가 고민을 등록한 사람인지를 나타내는 필드 추가
        //             isAccepted: isAccepted, // 채팅 신청 승인 상태 여부
        //             icon: room.worry.icon,
        //             status: room.status,
        //             updatedAt: room.updatedAt,
        //         };
        //     }),
        // );
        // 모든 채팅방에 대해 동시에 처리하기 위해 Promise.all()을 사용하여 각 채팅방 정보를 처리하고 결과를 반환
        // -> 모든 채팅방 정보를 동시에 처리하여 빠르게 결과를 얻을 수 있다.
        const updatedRooms = await Promise.all(
            // 각 채팅방에 대해 반복
            rooms.map(async (room) => {
                // const unRead = room.chattings.some((chat) => chat.unRead); // 각 채팅방의 읽지 않은 메시지가 있는지 확인
                const isRead = room.chattings.every((chat) => chat.isRead); // 모든 메시지가 읽혔는지 확인
                return {
                    userId: room.userId, // 채팅방을 생성한 사용자의 ID
                    commentAuthorId: room.commentAuthorId, // 채팅방에 작성된 댓글의 작성자 ID
                    worryId: room.worryId,
                    solvingCommentId: room.worry.solvingCommentId,
                    roomId: room.roomId,
                    // unRead: unRead,
                    isRead: isRead,
                    isSolved: room.worry.isSolved,
                    isOwner: room.userId === userId,
                    isAccepted: room.status === 'ACCEPTED',
                    icon: room.worry.icon,
                    status: room.status,
                    updatedAt: room.updatedAt,
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
        console.log('updatedRooms : ', updatedRooms);
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

export default router;
