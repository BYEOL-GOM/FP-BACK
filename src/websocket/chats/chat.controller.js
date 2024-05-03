import * as chatService from './chat.service.js';
import { createChatRoomSchema, roomIdSchema } from './chat.joi.js';
import { AppError } from '../../utils/AppError.js';

// 채팅방 생성
export const createChatRoom = async (req, res, next) => {
    try {
        // body에서 worryId 추출 및 유효성 검사
        const { value, error } = createChatRoomSchema.validate({ worryId: req.body.worryId });
        if (error) {
            throw new AppError('데이터 형식이 일치하지 않습니다.', 400);
        }
        const { worryId } = value; // 직접 변환된 값 사용
        const userId = parseInt(res.locals.user.userId);
        // const userId = parseInt(req.body.userId, 10);

        const result = await chatService.createChatRoomService(worryId, userId);

        return res.status(201).json(result);
    } catch (error) {
        console.error('채팅방 생성 중 에러 발생:', error);
        next(error);
    }
};

// 로그인한 유저에 해당하는 채팅방 전체 조회
export const getChatRooms = async (req, res, next) => {
    try {
    } catch (error) {}
};

// 채팅방 과거 메세지 전체 조회
export const getPastMessages = async (req, res, next) => {
    try {
    } catch (error) {}
};

// 채팅 신청 승인
export const acceptChat = async (req, res, next) => {
    try {
    } catch (error) {}
};

// 채팅 신청 거절
export const rejectChat = async (req, res, next) => {
    try {
    } catch (error) {}
};

// 채팅방 나가기
export const leaveChatRoom = async (req, res, next) => {
    try {
    } catch (error) {}
};
