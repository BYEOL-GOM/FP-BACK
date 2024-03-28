import { prisma } from '../../utils/prisma/index.js';

// 해당 고민 게시글 가져오기
export const getWorryById = async (worryId) => {
    const worry = await prisma.worries.findUnique({
        where: {
            worryId: parseInt(worryId),
        },
    });
    return worry;
};

// 선물 보내기
export const markWorryAsSolvedAndCreatePresent = async (worryId, commentId, userId, commentAuthorId) => {
    console.log('🩷🩷🩷레포지토리 : ', worryId, commentId, userId, commentAuthorId);
    // 고민을 업데이트하고, 선물을 생성하며, 사용자 엔티티를 업데이트하는 트랜잭션
    const transaction = await prisma.$transaction([
        prisma.worries.update({
            where: { worryId: parseInt(worryId) },
            data: {
                isSolved: true,
                presentCheck: true,
                solvedByUserId: userId, // 고민을 해결한 사용자 ID 업데이트
                solvingCommentId: parseInt(commentId), // 해결을 위한 댓글 ID 업데이트
                helperUserId: commentAuthorId, // 선물을 받는 사용자(답변자) ID 업데이트
            },
        }),
        prisma.presents.create({
            data: {
                senderId: parseInt(userId),
                receiverId: parseInt(commentAuthorId), // 댓글로부터 수신자 ID를 가져오는 로직
                commentId: parseInt(commentId),
            },
        }),
    ]);
    return transaction;
};

// commentId에 해당하는 댓글 찾기
export const findCommentById = async (commentId) => {
    return await prisma.comments.findUnique({
        where: { commentId: parseInt(commentId) },
        include: { worry: true },
    });
};

//선물을 보낸 A유저의 해결된 고민 목록 조회
export const findSolvedWorriesByUserId = async (userId) => {
    return await prisma.worries.findMany({
        where: {
            solvedByUserId: userId,
            presentCheck: true,
        },
        include: {
            comments: true, // 필요한 경우 추가 정보를 포함
        },
    });
};

// 선물을 받은 B유저가 해결한 고민 목록 조회
export const findHelpedSolveWorriesByUserId = async (userId) => {
    return await prisma.worries.findMany({
        where: {
            helperUserId: userId,
            presentCheck: true,
        },
        include: {
            comments: true, // 필요한 경우 추가 정보를 포함
        },
    });
};
