import * as chatService from './chat.service.js';
import { createChatRoomSchema, roomIdSchema } from './chat.joi.js';
import { AppError } from '../../utils/AppError.js';

// 채팅방 생성
export const createChatRoom = async (req, res, next) => {
    // body에서 worryId 추출 및 유효성 검사
    const { value, error } = createChatRoomSchema.validate({ worryId: req.body.worryId });
    if (error) {
        throw new AppError('데이터 형식이 일치하지 않습니다.', 400);
    }
    const { worryId } = value; // 직접 변환된 값 사용
    const userId = parseInt(res.locals.user.userId);
    // const userId = parseInt(req.body.userId, 10);

    try {
        const newRoomData = await chatService.createChatRoom(worryId, userId);

        return res.status(201).json(newRoomData);
    } catch (error) {
        console.error('채팅방 생성 중 에러 발생:', error);
        next(error);
    }
};

// 로그인한 유저에 해당하는 채팅방 전체 조회
export const getChatRooms = async (req, res, next) => {
    const userId = parseInt(res.locals.user.userId);
    // const userId = parseInt(req.body.userId, 10);

    // 페이지네이션
    const page = parseInt(req.query.page) || 1; // 페이지 번호, 기본값은 1
    const limit = parseInt(req.query.limit) || 10; // 페이지당 항목 수, 기본값은 10

    try {
        const data = await chatService.getChatRooms(page, limit, userId);

        res.status(200).json(data);
    } catch (error) {
        console.error('채팅방 조회 중 에러 발생:', error);
        next(error);
    }
};

// 채팅방 과거 메세지 전체 조회
export const getPastMessages = async (req, res, next) => {
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

    try {
        const result = await chatService.getPastMessages(roomId, userId, page, limit);
        return res.json(result);
    } catch (error) {
        console.error('과거 메시지를 가져오는 중 오류 발생:', error);
        next(error);
    }
};

// 채팅 신청 승인
export const acceptChat = async (req, res, next) => {
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
        const result = await chatService.acceptChat(roomId, userId);
        return res.status(200).json(result);
    } catch (error) {
        console.error('채팅방 수락 처리 중 에러 발생:', error);
        next(error);
    }
};

// 채팅 신청 거절
export const rejectChat = async (req, res, next) => {
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
        await chatService.rejectChat(roomId, userId);
        res.status(200).json({ message: '채팅방이 삭제되었습니다.' });
    } catch (error) {
        console.error('채팅방 거절 처리(삭제) 중 에러 발생:', error);
        next(error);
    }
};

// 채팅방 나가기
export const leaveChatRoom = async (req, res, next) => {
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
        const message = await chatService.leaveChatRoom(roomId, userId);
        return res.status(200).json({ message });
    } catch (error) {
        console.error('채팅방 나가기 처리 중 에러 발생:', error);
        next(error);
    }
};
