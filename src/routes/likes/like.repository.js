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
        totalCount,
        worries,
    };
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
            commentAuthorId: true,
            icon: true,
            content: true,
            createdAt: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
};

// 재귀함수
async function fetchCommentsRecursively(commentId) {
    const comment = await prisma.comments.findUnique({
        where: { commentId },
        select: {
            commentId: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            userId: true, // 댓글 작성자 ID
            parentId: true, // 부모 댓글 ID
            children: true, // 자식 댓글 선택
        },
    });

    if (comment && comment.children && comment.children.length > 0) {
        for (let i = 0; i < comment.children.length; i++) {
            // 각 자식 댓글에 대해 재귀적으로 처리
            comment.children[i] = await fetchCommentsRecursively(comment.children[i].commentId);
        }
    }

    return comment;
}

// 나의 해결된 고민 상세조회
export const findSolvedWorryDetailsById = async (worryId, userId) => {
    const worryDetails = await prisma.worries.findUnique({
        where: {
            worryId: worryId,
            userId: userId,
            isSolved: true,
        },
        select: {
            worryId: true,
            content: true,
            createdAt: true,
            icon: true,
            userId: true,
            comments: {
                where: { parentId: null }, // 최초 댓글만 선택
                select: {
                    commentId: true,
                    content: true,
                    createdAt: true,
                    updatedAt: true,
                    userId: true, // 댓글 작성자 ID
                },
                orderBy: { createdAt: 'asc' },
            },
        },
    });

    // 각 최초 댓글에 대해 대댓글을 재귀적으로 조회
    if (worryDetails && worryDetails.comments) {
        for (let i = 0; i < worryDetails.comments.length; i++) {
            worryDetails.comments[i] = await fetchCommentsRecursively(worryDetails.comments[i].commentId);
        }
    }

    return worryDetails;
};

// // '나의 해결된 고민' 상세 조회
// export const findSolvedWorryDetailsById = async (worryId) => {
//     return await prisma.worries.findUnique({
//         where: {
//             worryId: worryId,
//             isSolved: true, // 해결된 고민만 조회하도록 조건 추가해야함 => 선물받은 대화만 보여주게 나중에 살리기
//         },
//         select: {
//             worryId: true,
//             content: true,
//             createdAt: true,
//             icon: true,
//             userId: true,
//             comments: {
//                 where: {
//                     parentId: null, // 최초 댓글만 선택
//                 },
//                 select: {
//                     commentId: true,
//                     content: true,
//                     createdAt: true,
//                     updatedAt: true,
//                     userId: true, // 댓글 작성자 ID 추가
//                     children: {
//                         select: {
//                             commentId: true,
//                             content: true,
//                             createdAt: true,
//                             updatedAt: true,
//                             parentId: true, // 대댓글의 부모 댓글 ID
//                             userId: true, // 대댓글 작성자 ID 추가
//                         },
//                         orderBy: {
//                             createdAt: 'asc', // 대댓글의 생성 순서대로 정렬
//                         },
//                     },
//                 },
//                 orderBy: {
//                     createdAt: 'asc', // 댓글의 생성 순서대로 정렬
//                 },
//             },
//         },
//     });
// };

// '내가 해결한 고민' 상세 조회
export const findHelpedSolveWorryDetailsById = async (worryId, userId) => {
    const worryDetails = await prisma.worries.findUnique({
        where: {
            worryId: worryId,
            commentAuthorId: userId,
        },
        select: {
            worryId: true,
            content: true,
            createdAt: true,
            icon: true,
            userId: true,
            commentAuthorId: true, // 답변 작성자 ID
            comments: {
                where: { parentId: null }, // 최초 답변만 선택
                select: {
                    commentId: true,
                    content: true,
                    createdAt: true,
                    updatedAt: true,
                    userId: true, // 답변 작성자 ID
                },
                orderBy: { createdAt: 'asc' },
            },
        },
    });

    // 각 최초 댓글에 대해 대댓글을 재귀적으로 조회
    if (worryDetails && worryDetails.comments) {
        for (let i = 0; i < worryDetails.comments.length; i++) {
            worryDetails.comments[i] = await fetchCommentsRecursively(worryDetails.comments[i].commentId);
        }
    }

    if (worryDetails && worryDetails.commentAuthorId !== userId) {
        throw new Error("Access denied. You're not the solver of this worry.");
    }

    return worryDetails;
};
