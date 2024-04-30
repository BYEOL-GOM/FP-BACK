// src/routes/chats/chat.router.js
import express from 'express';
import { prisma } from '../../utils/prisma/index.js';

const router = express.Router();

router.post('/createChatRoom', async (req, res) => {
    const { worryId, userId, commentAuthorId } = req.body;

    console.log('대화 요청 정보:', worryId, userId, commentAuthorId);

    try {
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
                    worryId: worryId,
                    userIds: `${userId}-${commentAuthorId}`, // 사용자 ID 조합으로 unique key 생성
                    title: 'Private Chat Room',
                },
            });
        }

        res.status(201).json({
            message: '대화방이 생성되었습니다.',
            roomId: room.roomId,
        });
    } catch (error) {
        console.error('대화방 생성 중 에러 발생:', error);
        res.status(500).json({ message: '서버 오류 발생' });
    }
});

// src/routes/chats/chat.router.js
router.get('/chatRooms', async (req, res) => {
    const { userId } = req.query;

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

        res.status(200).json(rooms);
    } catch (error) {
        console.error('채팅방 조회 중 에러 발생:', error);
        res.status(500).json({ message: '서버 오류 발생' });
    }
});

export default router;
