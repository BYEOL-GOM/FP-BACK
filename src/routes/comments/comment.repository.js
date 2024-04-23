import { prisma } from '../../utils/prisma/index.js';

// # 유저가 참여한 모든 고민(worries)과 답장(comments)
export const getAllWorriesAndComments = async (userId) => {
    return await prisma.worries.findMany({
        where: {
            deletedAt: null, // 삭제되지 않은 고민(worries)만 조회
            OR: [
                { userId: userId }, // 유저가 첫 고민을 작성한 경우
                { commentAuthorId: userId }, // 타인의 첫고민에 유저가 답변자로 매칭된 경우
            ],
            NOT: {
                isSolved: true, // 해결된 고민은 제외
                comments: {
                    every: { unRead: false }, // 모든 답변이 읽힌 경우 제외
                },
            },
        },
        include: {
            comments: {
                where: {
                    deletedAt: null, // 삭제되지 않은 답변(comments)만 조회
                },
                orderBy: {
                    createdAt: 'desc', // 최신 답변 순으로 정렬
                },
            },
        },
    });
};

// # commentId에 해당하는 답장 상세
export const getComment = async (commentId, prismaClient) => {
    return await prismaClient.comments.findUnique({
        where: { commentId },
        select: {
            commentId: true,
            content: true,
            createdAt: true,
            fontColor: true,
            worryId: true,
            deletedAt: true,
            unRead: true,
            userId: true,
            parentId: true,
            worry: {
                select: {
                    userId: true,
                    content: true, // 고민의 내용도 조회
                    icon: true,
                    commentAuthorId: true,
                    isSolved: true,
                },
            },
            parent: { select: { userId: true, content: true } }, // 대댓글의 경우, 부모 댓글의 작성자id (userId) 조회
        },
    });
};

// # 메세지를 '읽음'상태로 업데이트
export const updateCommentStatus = async (commentId, prismaClient) => {
    await prismaClient.comments.update({
        where: { commentId },
        data: { unRead: false },
    });
};

// # worryId로 해당하는 고민찾기
export const findWorryById = async (worryId, prismaClient) => {
    return await prismaClient.worries.findUnique({ where: { worryId: parseInt(worryId) } });
};

// # worryId에 해당하는 마지막 답장
export const findLastReplyByWorryId = async (worryId, prismaClient) => {
    return await prismaClient.comments.findFirst({
        where: { worryId: parseInt(worryId) },
        orderBy: { createdAt: 'desc' },
    });
};

// # 중복 답변 존재 여부
export const checkForExistingReply = async (worryId, userId, parentId = null, prismaClient) => {
    const condition = parentId
        ? { parentId, userId: parseInt(userId) } // 재고민 or 재답변인 경우, parentId 와 userId
        : { worryId: parseInt(worryId), userId: parseInt(userId) }; // 첫번째 답변인 경우, worryId 와 userId
    return await prismaClient.comments.findFirst({
        where: condition,
    });
};

// # 답변 생성
export const createReply = async (worryId, content, userId, parentId, fontColor, prismaClient) => {
    return await prismaClient.comments.create({
        data: {
            worryId: parseInt(worryId),
            content,
            userId: parseInt(userId),
            parentId,
            fontColor,
            unRead: true, // 새로운 답장 '읽지 않음' 상태
        },
    });
};

// # 고민 테이블 updatedAt 업데이트
export const updateWorryUpdatedAt = async (worryId, prismaClient) => {
    return prismaClient.worries.update({
        where: { worryId: parseInt(worryId) },
        data: { updatedAt: new Date() },
    });
};
// # 사용자 정보 가져오기
export const getUserById = async (userId, prismaClient) => {
    return await prismaClient.users.findUnique({
        where: { userId },
    });
};

// # 유저의 별 개수 업데이트
export const updateRemainingStars = async (userId, remainingStars, prismaClient) => {
    return await prismaClient.users.update({
        where: { userId },
        data: { remainingStars },
    });
};

// # 별수확하고 fruit 업데이트
export const updateFruitCount = async (userId, fuitToAdd) => {
    return await prisma.users.update({
        where: { userId: userId },
        data: {
            fruit: {
                increment: fuitToAdd,
            },
        },
    });
};
