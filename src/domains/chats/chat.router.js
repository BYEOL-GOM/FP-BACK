import express from 'express';
import {
    createChatRoom,
    getChatRooms,
    getPastMessages,
    acceptChat,
    rejectChat,
    leaveChatRoom,
} from './chat.controller.js';
import authMiddleware from '../../middlewares/authMiddleware.js';

let router = express.Router();

// 채팅방 생성
router.post('/createChatRoom', authMiddleware, createChatRoom);
// router.post('/createChatRoom', createChatRoom);

// 로그인한 유저에 해당하는 채팅방 전체 조회
router.get('/chatRooms', authMiddleware, getChatRooms);
// router.get('/chatRooms', getChatRooms);

// 채팅방 과거 메세지 전체 조회
router.get('/rooms/:roomId', authMiddleware, getPastMessages);
// router.get('/rooms/:roomId', getPastMessages);

// 채팅 신청 승인
router.put('/acceptChat/:roomId', authMiddleware, acceptChat);
// router.put('/acceptChat/:roomId', acceptChat);

// 채팅 신청 거절
router.delete('/rejectChat/:roomId', authMiddleware, rejectChat);
// router.delete('/rejectChat/:roomId', rejectChat);

// 채팅방 나가기
router.delete('/rooms/:roomId/leave', authMiddleware, leaveChatRoom);
// router.delete('/rooms/:roomId/leave', leaveChatRoom);

export default router;
