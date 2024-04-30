// src/routes/chats/chat.router.js
import express from 'express';
import { prisma } from '../../utils/prisma/index.js';

const router = express.Router();

router.post('/createChatRoom', async (req, res) => {
    // const { userId, commentAuthorId } = req.body;
    const { worryId, userId, commentAuthorId } = req.body;
    const parsedWorryId = parseInt(worryId);
    const parsedUserId = parseInt(userId);
    const parsedCommentAuthorId = parseInt(commentAuthorId);

    console.log('대화 요청 정보:', worryId, userId, commentAuthorId);
    // console.log('대화 요청 정보:', worryId, userId, commentAuthorId);

    try {
        // 해당하는 사용자의 고민을 찾아서 해당하는 worryId 가져오기
        const userWorry = await prisma.worries.findFirst({
            where: {
                userId: userId,
            },
        });

        // 고민이 존재하면 해당하는 worryId 사용, 존재하지 않으면 null
        const worryId = userWorry ? userWorry.worryId : null;

        // 이미 존재하는 방 검색
        let room = await prisma.rooms.findFirst({
            where: {
                OR: [{ userIds: `${userId}-${commentAuthorId}` }, { userIds: `${commentAuthorId}-${userId}` }],
            },
        });

        // 방이 없다면 새로운 방 생성
        if (!room) {
            room = await prisma.rooms.create({
                data: {
                    worryId: parsedWorryId,
                    userIds: `${userId}-${commentAuthorId}`, // 사용자 ID 조합으로 unique key 생성
                },
            });
        }
        // 새로운 채팅방 생성
        // const room = await prisma.rooms.create({
        //     data: {
        //         // worryId: parsedWorryId,
        //         // 대화에 참여한 모든 사용자를 채팅방에 추가
        //         users: {
        //             connect: [{ userId: parsedUserId }, { userId: parsedCommentAuthorId }],
        //         },
        //     },
        // });

        res.status(201).json({
            worryId: parsedWorryId,
            roomId: room.roomId,
            userIds: room.userIds,
            message: '대화방이 생성되었습니다.',
        });
    } catch (error) {
        console.error('대화방 생성 중 에러 발생:', error);
        res.status(500).json({ message: '서버 오류 발생' });
    }
});

// src/routes/chats/chat.router.js
router.get('/chatRooms', async (req, res) => {
    // const { userId } = req.query;
    const userId = parseInt(req.body.userId, 10);

    try {
        const rooms = await prisma.rooms.findMany({
            where: {
                userIds: {
                    contains: userId.toString(),
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        // try {
        //     const rooms = await prisma.rooms.findMany({
        //         where: {
        //             participants: {
        //                 some: {
        //                     userId: userId,
        //                 },
        //             },
        //         },
        //         orderBy: {
        //             createdAt: 'desc',
        //         },
        //     });

        res.status(200).json(rooms);
    } catch (error) {
        console.error('채팅방 조회 중 에러 발생:', error);
        res.status(500).json({ message: '서버 오류 발생' });
    }
});

export default router;
