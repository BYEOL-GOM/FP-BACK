// src/routes/chats/chat.router.js
import express from 'express';
import { prisma } from '../../utils/prisma/index.js';

const router = express.Router();

// 채팅방 생성
router.post('/createChatRoom', async (req, res) => {
    const { worryId } = req.body;
    const parsedWorryId = parseInt(worryId);

    console.log('대화 요청 정보(body):', worryId);
    console.log('대화 요청 정보(Int):', parsedWorryId);

    try {
        // 해당 고민이 존재하는지 확인
        const existingWorry = await prisma.worries.findUnique({
            where: {
                worryId: parsedWorryId,
            },
        });

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

        // 방이 없다면 새로운 방 생성
        if (!room) {
            room = await prisma.rooms.create({
                data: {
                    worryId: parsedWorryId,
                },
            });
        }
        console.log('⭐⭐⭐테스트 2번. room >> ', room);

        res.status(201).json({
            worryId: parsedWorryId,
            roomId: room.roomId,
            message: '대화방이 생성되었습니다.',
        });
    } catch (error) {
        console.log('⭐⭐⭐테스트 3번. 에러 >> ', error.message);
        console.error('대화방 생성 중 에러 발생:', error);
        res.status(500).json({ message: '서버 오류 발생' });
    }
});
// 채팅방 생성
// router.post('/createChatRoom', async (req, res) => {
//     // const { userId, commentAuthorId } = req.body;
//     const { worryId, userId, commentAuthorId } = req.body;
//     const parsedWorryId = parseInt(worryId);
//     const parsedUserId = parseInt(userId);
//     const parsedCommentAuthorId = parseInt(commentAuthorId);

//     console.log('대화 요청 정보(body):', worryId, userId, commentAuthorId);
//     console.log('대화 요청 정보(Int):', parsedWorryId, parsedUserId, parsedCommentAuthorId);
//     // console.log('대화 요청 정보:', worryId, userId, commentAuthorId);

//     try {
//         // 해당하는 사용자의 고민을 찾아서 해당하는 worryId 가져오기
//         const userWorry = await prisma.worries.findFirst({
//             where: {
//                 userId: userId,
//             },
//         });
//         console.log('⭐⭐⭐테스트 1번. userWorry >> ', userWorry);

//         // 고민이 존재하면 해당하는 worryId 사용, 존재하지 않으면 null
//         const worryId = userWorry ? userWorry.worryId : null;

//         console.log('⭐⭐⭐테스트 2번. worryId >> ', worryId);

//         // 이미 존재하는 방 검색
//         let room = await prisma.rooms.findFirst({
//             where: {
//                 OR: [{ userIds: `${userId}-${commentAuthorId}` }, { userIds: `${commentAuthorId}-${userId}` }],
//             },
//         });

//         console.log('⭐⭐⭐테스트 3번. room >> ', room);

//         // 방이 없다면 새로운 방 생성
//         if (!room) {
//             room = await prisma.rooms.create({
//                 data: {
//                     worryId: parsedWorryId,
//                     userIds: `${userId}-${commentAuthorId}`, // 사용자 ID 조합으로 unique key 생성
//                 },
//             });
//         }
//         console.log('⭐⭐⭐테스트 4번. room >> ', room);
//         // 새로운 채팅방 생성
//         // const room = await prisma.rooms.create({
//         //     data: {
//         //         // worryId: parsedWorryId,
//         //         // 대화에 참여한 모든 사용자를 채팅방에 추가
//         //         users: {
//         //             connect: [{ userId: parsedUserId }, { userId: parsedCommentAuthorId }],
//         //         },
//         //     },
//         // });

//         res.status(201).json({
//             worryId: parsedWorryId,
//             roomId: room.roomId,
//             userIds: room.userIds,
//             message: '대화방이 생성되었습니다.',
//         });
//     } catch (error) {
//         console.log('⭐⭐⭐테스트 5번. 에러 >> ', error.message);
//         console.error('대화방 생성 중 에러 발생:', error);
//         res.status(500).json({ message: '서버 오류 발생' });
//     }
// });
//------------------------------------------------------------------------------------------------

// src/routes/chats/chat.router.js
// // 로그인한 유저에 해당하는 채팅방 전체 조회
router.get('/chatRooms', async (req, res) => {
    const userId = parseInt(req.query.userId, 10); // Query string에서 userId를 받아야 합니다.

    console.log('userId : ', userId);

    try {
        const rooms = await prisma.rooms.findMany({
            where: {
                OR: [{ worry: { userId: userId } }, { worry: { commentAuthorId: userId } }],
            },
            include: {
                worry: true, // Worry 정보도 포함하여 반환
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        console.log('⭐⭐⭐테스트 6번. rooms >> ', rooms);

        res.status(200).json(rooms);
    } catch (error) {
        console.log('⭐⭐⭐테스트 7번. error >> ', error.message);
        console.error('채팅방 조회 중 에러 발생:', error);
        res.status(500).json({ message: '서버 오류 발생' });
    }
});
// 로그인한 유저에 해당하는 채팅방 전체 조회
// router.get('/chatRooms', async (req, res) => {
//     // const { userId } = req.query;
//     const userId = parseInt(req.body.userId, 10);

//     console.log('userId : ', userId);

//     try {
//         const rooms = await prisma.rooms.findMany({
//             where: {
//                 userIds: {
//                     contains: userId.toString(),
//                 },
//             },
//             orderBy: {
//                 createdAt: 'desc',
//             },
//         });
//         console.log('⭐⭐⭐테스트 6번. rooms >> ', rooms);
//         // try {
//         //     const rooms = await prisma.rooms.findMany({
//         //         where: {
//         //             participants: {
//         //                 some: {
//         //                     userId: userId,
//         //                 },
//         //             },
//         //         },
//         //         orderBy: {
//         //             createdAt: 'desc',
//         //         },
//         //     });

//         res.status(200).json(rooms);
//     } catch (error) {
//         console.log('⭐⭐⭐테스트 7번. error >> ', error.message);
//         console.error('채팅방 조회 중 에러 발생:', error);
//         res.status(500).json({ message: '서버 오류 발생' });
//     }
// });

export default router;
