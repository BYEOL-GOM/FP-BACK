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
export const markWorryAsSolvedAndCreateLike = async (worryId, commentId, userId) => {
    try {
        // 고민을 업데이트하고, 선물을 생성하며, 사용자 엔티티를 업데이트하는 트랜잭션
        const transactionResults = await prisma.$transaction([
            prisma.worries.update({
                where: { worryId: parseInt(worryId) },
                data: {
                    isSolved: true,
                    solvingCommentId: parseInt(commentId),
                },
                select: {
                    userId: true, // 업데이트된 worry에서 userId 추출
                    commentAuthorId: true, // 여기에 추가
                },
            }),
            prisma.likes.create({
                data: {
                    userId: parseInt(userId),
                    commentId: parseInt(commentId),
                },
            }),
        ]);

        const worryUpdateResult = transactionResults[0]; // 업데이트된 worry의 결과
        const likeCreationResult = transactionResults[1]; // 생성된 like의 결과

        // 사용자의 remainingWorries를 증가시킵니다.
        await prisma.users.update({
            where: { userId: worryUpdateResult.userId },
            data: { remainingWorries: { increment: 1 } },
        });

        // 답변자의 remainingAnswers 증가시키기
        await prisma.users.update({
            where: { userId: worryUpdateResult.commentAuthorId },
            data: { remainingAnswers: { increment: 1 } },
        });

        return { worryUpdateResult, likeCreationResult };
    } catch (error) {
        console.error('Error during transaction:', error);
        throw error;
    }
};

// commentId에 해당하는 댓글 찾기
export const findCommentById = async (commentId) => {
    return await prisma.comments.findUnique({
        where: { commentId: parseInt(commentId) },
        include: { worry: true },
    });
};

// '나의 해결된 고민' 목록 전체 조회
export const findSolvedWorriesByUserId = async (userId, page, limit) => {
    const skip = (page - 1) * limit;
    const worries = await prisma.worries.findMany({
        where: {
            isSolved: true,
            userId: userId,
        },
        select: {
            worryId: true,
            userId: true,
            icon: true,
            content: true,
            createdAt: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
        skip: skip,
        take: limit,
    });
    // 전체 항목 수를 조회합니다.
    const totalCount = await prisma.worries.count({
        where: {
            isSolved: true,
            userId: userId,
        },
    });

    return {
        page, // 현재 페이지 번호 추가
        limit, // 페이지당 항목 수 추가
        totalCount, // 전체 항목 수
        worries, // 현재 페이지의 데이터
    };
};

// '내가 해결한 고민' 목록 전체 조회
export const findHelpedSolveWorriesByUserId = async (userId, page, limit) => {
    const skip = (page - 1) * limit;
    const worries = await prisma.worries.findMany({
        where: {
            isSolved: true,
            commentAuthorId: userId,
            solvingComment: {
                userId: userId,
            },
        },
        select: {
            worryId: true,
            commentAuthorId: true,
            icon: true,
            content: true,
            createdAt: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
        skip: skip,
        take: limit,
    });
    // 전체 항목 수를 조회합니다.
    const totalCount = await prisma.worries.count({
        where: {
            isSolved: true,
            commentAuthorId: userId,
            // solvingComment: {
            //     commentAuthorId: userId,
            // },
        },
    });

    return {
        page, // 현재 페이지 번호 추가
        limit, // 페이지당 항목 수 추가
        totalCount, // 전체 항목 수
        worries, // 현재 페이지의 데이터
    };
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

// 좋아요를 가장 많이 받은 탑 5위 댓글 조회
export const findTopLikedCommentAuthors = async () => {
    // 모든 좋아요와 관련된 댓글과 고민 정보를 가져옵니다.
    const likes = await prisma.likes.findMany({
        include: {
            comment: {
                include: {
                    worry: true, // 이 댓글이 속한 고민 정보를 포함합니다.
                },
            },
        },
    });

    // 좋아요 받은 commentAuthorId 별로 집계합니다.
    const commentAuthorLikesCount = likes.reduce((acc, like) => {
        const commentAuthorId = like.comment.worry.commentAuthorId;
        if (!acc[commentAuthorId]) {
            acc[commentAuthorId] = 0;
        }
        acc[commentAuthorId]++;
        return acc;
    }, {});

    // 집계된 데이터를 배열로 변환하고 좋아요 수에 따라 정렬합니다.
    const sortedAuthors = Object.entries(commentAuthorLikesCount)
        .map(([commentAuthorId, likes]) => ({ commentAuthorId: parseInt(commentAuthorId), likes }))
        .sort((a, b) => b.likes - a.likes)
        .slice(0, 5); // 상위 5명만 추출

    return sortedAuthors;
};
