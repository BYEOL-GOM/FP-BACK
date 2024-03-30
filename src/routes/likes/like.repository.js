import { prisma } from '../../utils/prisma/index.js';

// 해당 고민 게시글 가져오기
export const findWorryById = async (worryId) => {
    const worry = await prisma.worries.findUnique({
        where: {
            worryId: parseInt(worryId),
        },
    });
    return worry;
};

// commentId가 유효한지 확인하는 함수
export const verifyCommentExists = async (commentId, worryId) => {
    const comment = await prisma.comments.findFirst({
        where: {
            AND: [{ commentId: parseInt(commentId) }, { worryId: parseInt(worryId) }],
        },
    });

    // 존재하면 true, 그렇지 않으면 false 반환
    return !!comment;
};

// 선물 보내기
export const markWorryAsSolvedAndCreateLike = async (worryId, commentId, userId, commentAuthorId) => {
    console.log('🩷🩷🩷레포지토리 : ', worryId, commentId, userId, commentAuthorId);
    // 고민을 업데이트하고, 선물을 생성하며, 사용자 엔티티를 업데이트하는 트랜잭션
    const [worryUpdateResult, likeCreationResult] = await prisma.$transaction([
        prisma.worries.update({
            where: { worryId: parseInt(worryId) },
            data: {
                isSolved: true,
                solvingCommentId: parseInt(commentId), // 해결을 위한 댓글 ID 업데이트
                // 'Worries' 모델에서 'userId'와 'helperUserId' 필드를 업데이트하는 부분이 불필요하거나 오류가 있는 경우, 여기서 조정 필요
            },
            select: {
                worryId: true,
                solvingCommentId: true,
                content: true,
                userId: true,
                commentAuthorId: true,
                icon: true,
                createdAt: true,
            },
        }),
        prisma.likes.create({
            data: {
                userId: parseInt(userId), // 선물을 보내는 사람 (좋아요를 누른 사용자)
                commentId: parseInt(commentId), // 좋아요가 적용되는 댓글 ID
            },
            // 선물 생성에 대한 필드를 선택하지 않아 최종 출력에서 제외
        }),
    ]);

    return [worryUpdateResult]; // worry 업데이트 결과만 포함하는 배열 반환
};

// commentId에 해당하는 댓글 찾기
export const findCommentById = async (commentId) => {
    return await prisma.comments.findUnique({
        where: { commentId: parseInt(commentId) },
        include: { worry: true },
    });
};

// '나의 해결된 고민' 목록 전체 조회
export const findSolvedWorriesByUserId = async (userId) => {
    return await prisma.worries.findMany({
        where: {
            isSolved: true,
            // presentCheck: true,
            userId: userId,
        },
        select: {
            worryId: true,
            icon: true,
            content: true,
            createdAt: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
};

// '나의 해결된 고민' 상세 조회
export const findSolvedWorryDetailsById = async (worryId) => {
    return await prisma.worries.findUnique({
        where: {
            worryId: worryId,
        },
        select: {
            worryId: true,
            content: true,
            createdAt: true,
            icon: true,
            userId: true,
            comments: {
                select: {
                    commentId: true,
                    content: true,
                    createdAt: true,
                    updatedAt: true,
                    parentId: true,
                    children: {
                        select: {
                            commentId: true,
                            content: true,
                            createdAt: true,
                            updatedAt: true,
                            parentId: true,
                        },
                    },
                },
            },
        },
    });
};

// '내가 해결한 고민' 목록 전체 조회
export const findHelpedSolveWorriesByUserId = async (userId) => {
    return await prisma.worries.findMany({
        where: {
            isSolved: true,
            commentAuthorId: userId,
        },
        select: {
            worryId: true,
            icon: true,
            content: true,
            createdAt: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
};

// '내가 해결한 고민' 상세 조회
export const findHelpedSolveWorryDetailsById = async (worryId) => {
    return await prisma.worries.findUnique({
        where: {
            worryId: worryId,
        },
        select: {
            worryId: true,
            content: true,
            createdAt: true,
            icon: true,
            userId: true,
            comments: {
                select: {
                    commentId: true,
                    content: true,
                    createdAt: true,
                    updatedAt: true,
                    parentId: true,
                    children: {
                        select: {
                            commentId: true,
                            content: true,
                            createdAt: true,
                            updatedAt: true,
                            parentId: true,
                        },
                    },
                },
            },
        },
    });
};
