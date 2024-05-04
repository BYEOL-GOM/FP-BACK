import * as chatRepository from './chat.repository.js';
import { AppError } from '../../utils/AppError.js';
import moment from 'moment-timezone';

// 채팅방 생성
export const createChatRoom = async (worryId, userId) => {
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

        // 채팅방이 존재하지 않는 경우, 새로운 채팅방 생성
        const newRoom = await chatRepository.createRoom(worryId, existingWorry.userId, existingWorry.commentAuthorId);

        // 응답 형식 조정
        const newRoomData = {
            worryId: newRoom.worryId,
            userId: newRoom.userId,
            commentAuthorId: newRoom.commentAuthorId,
            roomId: newRoom.roomId,
            message: '대화방이 생성되었습니다.',
        };
        return newRoomData;
    } catch (error) {
        throw error;
    }
};

// 로그인한 유저에 해당하는 채팅방 전체 조회
export const getChatRooms = async (page, limit, userId) => {
    try {
        // 페이지 번호 유효성 검사
        if (isNaN(page) || page < 1) {
            throw new AppError('유효하지 않은 페이지 번호입니다.', 400);
        }
        if (isNaN(limit) || limit < 1 || limit > 100) {
            throw new AppError('페이지당 항목 수가 유효하지 않습니다.', 400);
        }

        const rooms = await chatRepository.findRoomsByUser(page, limit, userId);

        if (rooms.length === 0) {
            return { page, limit, totalCount: 0, formattedPastMessages: [] };
        }
        const totalCount = await chatRepository.countRoomsByUser(userId);

        // 데이터 포맷 변경
        const formattedRooms = rooms.map((room) => {
            const isRead = room.chattings.length > 0 ? room.chattings.every((chat) => chat.isRead) : false; // 모든 메시지가 읽혔는지 확인
            const lastCommentContent = room.worry.comments.length > 0 ? room.worry.comments[0].content : 'No comments';
            const lastChatting = room.chattings.length > 0 ? room.chattings[0] : null;
            const lastChattingMessage = lastChatting ? lastChatting.text : null;

            return {
                userId: room.userId,
                commentAuthorId: room.commentAuthorId,
                worryId: room.worryId,
                solvingCommentId: room.worry.solvingCommentId,
                roomId: room.roomId,
                isRead: isRead,
                isSolved: room.worry.isSolved,
                isOwner: room.userId === userId,
                isAccepted: room.status === 'ACCEPTED',
                hasEntered: room.hasEntered,
                lastCommentContent: lastCommentContent,
                lastChattingMessage: lastChattingMessage,
                icon: room.worry.icon,
                status: room.status,
                updatedAt: moment(room.updatedAt).tz('Asia/Seoul').format('YYYY-MM-DDTHH:mm:ssZ'),
            };
        });

        return { page, limit, totalCount, rooms: formattedRooms };
    } catch (error) {
        throw error;
    }
};

// 채팅방 과거 메세지 전체 조회
export const getPastMessages = async (roomId, userId, page, limit) => {
    try {
        // 페이지 번호 유효성 검사
        if (isNaN(page) || page < 1) {
            throw new AppError('유효하지 않은 페이지 번호입니다.', 400);
        }
        if (isNaN(limit) || limit < 1 || limit > 100) {
            throw new AppError('페이지당 항목 수가 유효하지 않습니다.', 400);
        }

        // 채팅방이 존재하는지 확인
        const room = await chatRepository.findRoomByRoomId(roomId);
        if (!room) {
            throw new AppError('채팅방을 찾을 수 없습니다.', 404);
        }

        // 채팅방 과거 메세지 전체 조회
        const pastMessages = await chatRepository.findMessagesByRoomId(roomId, page, limit);
        // 채팅 메시지가 없는 경우
        if (pastMessages.length === 0) {
            return { page, limit, totalCount: 0, formattedPastMessages: [] };
        }

        // 채팅방 과거 메세지 전체 개수 세기
        const totalCount = await chatRepository.countMessagesByRoomId(roomId);

        // 결과 객체를 새로운 변수에 할당하여 반환 형식을 변경
        const formattedPastMessages = pastMessages.map((message) => ({
            chatId: message.chatId,
            userId: message.sender.userId,
            roomId: message.roomId,
            nickname: message.sender.nickname,
            text: message.text,
            isRead: message.isRead,
            createdAt: message.createdAt,
        }));

        return { page, limit, totalCount, formattedPastMessages };
    } catch (error) {
        throw error;
    }
};

// 채팅 신청 승인
export const acceptChat = async (roomId, userId) => {
    try {
        // 채팅방이 존재하는지 확인
        const room = await chatRepository.findRoomByRoomId(roomId);
        // 채팅방이 존재하지 않을 때
        if (!room) {
            throw new AppError('채팅방이 존재하지 않습니다.', 404);
        }
        // 현재 유저가 고민의 답변자가 아닐 때
        if (room.commentAuthorId !== userId) {
            throw new AppError('고민의 답변자만 승인할 수 있습니다.', 403);
        }

        const updatedRoom = await chatRepository.updateRoomStatus(roomId, 'ACCEPTED');
        if (!updatedRoom) {
            throw new AppError('채팅방 상태를 업데이트할 수 없습니다.', 422);
        }

        // 응답 객체에 isAccepted를 추가하여 반환 (프론트엔드를 위한 임시 컬럼 추가)
        updatedRoom.isAccepted = true;

        return { ...updatedRoom, message: '채팅방이 활성화되었습니다.' };
    } catch (error) {
        throw error;
    }
};

// 채팅 신청 거절
export const rejectChat = async (roomId, userId) => {
    try {
        // 채팅방이 존재하는지 확인
        const room = await chatRepository.findRoomByRoomId(roomId);
        // 채팅방이 존재하지 않을 때
        if (!room) {
            throw new AppError('채팅방이 존재하지 않습니다.', 404);
        }
        // 현재 유저가 고민의 답변자가 아닐 때
        if (room.commentAuthorId !== userId) {
            throw new AppError('고민의 답변자만 승인할 수 있습니다.', 403);
        }

        await chatRepository.deleteRoom(roomId);
    } catch (error) {
        throw error;
    }
};

// 채팅방 나가기
export const leaveChatRoom = async (roomId, userId) => {
    try {
        // 채팅방이 존재하는지 확인
        const room = await chatRepository.findRoomByRoomId(roomId);
        // 채팅방이 존재하지 않을 때
        if (!room) {
            throw new AppError('채팅방이 존재하지 않습니다.', 404);
        }

        // 사용자가 이미 채팅방에 없는 경우 에러 처리
        if (room.userId !== userId && room.commentAuthorId !== userId) {
            throw new Error('사용자가 이미 채팅방에 존재하지 않습니다.');
        }

        await chatRepository.updateRoomParticipant(roomId, userId, null);
        return `채팅방에서 사용자 ${userId}가 나갔습니다.`;
    } catch (error) {
        throw error;
    }
};
