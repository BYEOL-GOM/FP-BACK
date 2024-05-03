import * as chatRepository from './chat.repository.js';
import { AppError } from '../../utils/AppError.js';

// 채팅방 생성
export const createChatRoomService = async (worryId, userId) => {
    try {
        const existingWorry = await chatRepository.findWorryById(worryId);
        if (!existingWorry) {
            throw new AppError('해당 고민이 존재하지 않아 채팅방을 생성할 수 없습니다.', 404);
        }
        // 사용자 ID 검증 (고민 등록자 확인)
        if (existingWorry.userId !== userId) {
            throw new AppError('고민을 등록한 유저만 채팅방을 생성할 수 있습니다.', 403);
        }
        // 채팅방이 이미 존재하는지 검사
        const existingRoom = await chatRepository.findRoomByWorryId(worryId);
        if (existingRoom) {
            throw new AppError(
                '이미 이 고민에 대한 채팅방이 존재합니다. 다른 고민을 선택하거나 기존의 채팅방을 이용해 주세요.',
                409,
            );
        }
        return await chatRepository.createRoom(worryId, userId);
    } catch (error) {
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
