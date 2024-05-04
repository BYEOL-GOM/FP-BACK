import { prisma } from '../../utils/prisma/index.js';

// 해당 고민이 존재하는지 확인
export const findWorryById = async (worryId) => {
    return prisma.worries.findUnique({
        where: { worryId },
        select: { userId: true, commentAuthorId: true },
    });
};

// worryId로 채팅방 존재하는지 확인
export const findRoomByWorryId = async (worryId) => {
    return prisma.rooms.findUnique({
        where: { worryId: worryId },
    });
};

// 채팅방 생성
export const createRoom = async (worryId, userId, commentAuthorId) => {
    return await prisma.rooms.create({
        data: {
            worryId: worryId,
            userId: userId, // 고민을 등록한 사용자 ID 할당
            commentAuthorId: commentAuthorId, // 댓글 작성자 ID 할당
        },
    });
};

// 로그인한 유저에 해당하는 채팅방 전체 조회
export const findRoomsByUser = async (page, limit, userId) => {
    const skip = (page - 1) * limit;
    return await prisma.rooms.findMany({
        where: {
            OR: [{ userId: userId }, { commentAuthorId: userId }],
            status: { in: ['ACCEPTED', 'PENDING'] },
        },
        include: {
            worry: {
                select: {
                    solvingCommentId: true,
                    unRead: true,
                    isSolved: true,
                    icon: true,
                    comments: {
                        // 여기서 comments를 include 대신 select에 추가
                        select: {
                            content: true,
                        },
                        take: 1, // 가장 최근 답변 하나만 가져오기
                        orderBy: { createdAt: 'desc' },
                    },
                },
            },
            chattings: {
                where: {
                    senderId: {
                        not: userId,
                    },
                },
                take: 1, // 가장 최근 채팅메시지 하나만 가져오기
                orderBy: { createdAt: 'desc' },
            },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
    });
};

// userId에 해당하는 채팅방 총 개수 세기
export const countRoomsByUser = async (userId) => {
    return await prisma.rooms.count({
        where: {
            OR: [{ userId: userId }, { commentAuthorId: userId }],
            status: { in: ['ACCEPTED', 'PENDING'] },
        },
    });
};

// 채팅방이 존재하는지 확인
export const findRoomByRoomId = async (roomId) => {
    return prisma.rooms.findUnique({
        where: { roomId },
    });
};

// 채팅방 과거 메세지 전체 조회
export const findMessagesByRoomId = async (roomId, page, limit) => {
    const skip = (page - 1) * limit;
    return prisma.chattings.findMany({
        where: { roomId },
        include: {
            sender: {
                select: {
                    userId: true,
                    nickname: true,
                },
            },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
    });
};

// 채팅방 과거 메세지 전체 개수 세기
export const countMessagesByRoomId = async (roomId) => {
    return prisma.chattings.count({
        where: { roomId },
    });
};

// 채팅 신청 승인
export const updateRoomStatus = async (roomId, status) => {
    return prisma.rooms.update({
        where: { roomId },
        data: { status },
    });
};

// 채팅 신청 거절
export const deleteRoom = async (roomId) => {
    return prisma.rooms.delete({
        where: { roomId },
    });
};

// 채팅방 나가기
export const updateRoomParticipant = async (roomId, userId, newValue) => {
    const fieldsToUpdate = {};
    const room = await findRoomByRoomId(roomId);

    // userId가 방의 userId 또는 commentAuthorId와 일치하는 경우 해당 필드를 null로 업데이트
    if (room.userId === userId) {
        fieldsToUpdate.userId = null;
    } else if (room.commentAuthorId === userId) {
        fieldsToUpdate.commentAuthorId = null;
    }

    return prisma.rooms.update({
        where: { roomId: parseInt(roomId) },
        data: fieldsToUpdate,
    });
};
