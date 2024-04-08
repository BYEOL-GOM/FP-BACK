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

// 재귀함수
async function fetchCommentsRecursively(commentId) {
    const comment = await prisma.comments.findUnique({
        where: { commentId },
        select: {
            commentId: true,
            content: true,
            createdAt: true,
            // updatedAt: true,
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
                    // updatedAt: true,
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

// '내가 해결한 고민' 상세 조회
export const findHelpedSolveWorryDetailsById = async (worryId, userId) => {
    const worryDetails = await prisma.worries.findUnique({
        where: {
            worryId: worryId,
            commentAuthorId: userId,
            isSolved: true,
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
                    // updatedAt: true,
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

// // 좋아요를 가장 많이 받은 탑 5위 댓글 조회
// export const findTopLikedCommentAuthors = async (userId) => {
//     // 모든 좋아요와 관련된 댓글과 고민 정보를 가져옵니다.
//     const likes = await prisma.likes.findMany({
//         include: {
//             comment: {
//                 include: {
//                     worry: true, // 이 댓글이 속한 고민 정보를 포함합니다.
//                 },
//             },
//         },
//     });

//     // 좋아요 받은 commentAuthorId 별로 집계합니다.
//     const commentAuthorLikesCount = likes.reduce((acc, like) => {
//         const commentAuthorId = like.comment.worry.commentAuthorId;
//         if (!acc[commentAuthorId]) {
//             acc[commentAuthorId] = 0;
//         }
//         acc[commentAuthorId]++;
//         return acc;
//     }, {});

//     // 집계된 데이터를 배열로 변환하고 좋아요 수에 따라 정렬합니다.
//     const sortedAuthors = Object.entries(commentAuthorLikesCount)
//         .map(([commentAuthorId, likes]) => ({ commentAuthorId: parseInt(commentAuthorId), likes }))
//         .sort((a, b) => b.likes - a.likes);
//     // .slice(0, 5); // 상위 5명만 추출

//     // 로그인한 사용자가 있다면 해당 사용자의 좋아요 순위를 추가로 계산
//     if (userId !== undefined) {
//         const userLikes = commentAuthorLikesCount[userId];
//         const userInTop = sortedAuthors.find((author) => author.commentAuthorId === userId);

//         // 로그인한 사용자가 Top 5에 포함되지 않았고, 좋아요를 받았다면, 추가합니다.
//         if (!userInTop && userLikes !== undefined) {
//             const userRank = sortedAuthors.push({ commentAuthorId: userId, likes: userLikes });

//             // 다시 순위를 정렬하고, 로그인한 사용자가 Top 5 밖이어도 보여주기 위해 상위 5명 + 로그인한 사용자의 정보를 포함시킵니다.
//             sortedAuthors = sortedAuthors.sort((a, b) => b.likes - a.likes).slice(0, 5);

//             // 로그인한 사용자가 Top 5에 포함되지 않은 경우, 목록에 추가
//             if (
//                 sortedAuthors.length < 5 ||
//                 sortedAuthors.find((author) => author.commentAuthorId === userId) === undefined
//             ) {
//                 sortedAuthors.push({ commentAuthorId: userId, likes: userLikes, rank: userRank });
//             }
//         }
//     } else {
//         // 로그인하지 않았다면 상위 5명만 반환
//         sortedAuthors = sortedAuthors.slice(0, 5);
//     }

//     return sortedAuthors;
// };

// 좋아요를 가장 많이 받은 탑 5위 댓글 조회
export const findTopLikedCommentAuthors = async (userId) => {
    const likes = await prisma.likes.findMany({
        include: {
            comment: {
                include: {
                    worry: true,
                },
            },
        },
    });

    const commentAuthorLikesCount = likes.reduce((acc, like) => {
        const commentAuthorId = like.comment.worry.commentAuthorId;
        if (!acc[commentAuthorId]) {
            acc[commentAuthorId] = 0;
        }
        acc[commentAuthorId]++;
        return acc;
    }, {});

    let sortedAuthors = Object.entries(commentAuthorLikesCount)
        .map(([commentAuthorId, likes]) => ({ commentAuthorId: parseInt(commentAuthorId), likes }))
        .sort((a, b) => b.likes - a.likes);

    // 로그인하지 않았다면 상위 2명만 반환
    if (userId === undefined) {
        return sortedAuthors.slice(0, 2);
    }

    // 로그인한 사용자가 있다면 해당 사용자의 좋아요 순위를 추가로 계산
    const userLikes = commentAuthorLikesCount[userId];
    const userInTop = sortedAuthors.findIndex((author) => author.commentAuthorId === userId);

    // 로그인한 사용자가 Top 2에 포함되지 않았고, 좋아요를 받았다면 추가
    if (userInTop === -1 && userLikes !== undefined) {
        sortedAuthors.push({ commentAuthorId: userId, likes: userLikes });
    }

    // 다시 순위를 정렬하고 상위 2명 + 로그인한 사용자의 정보를 포함시킵니다 (로그인한 사용자가 상위 2명에 포함되지 않는 경우에만)
    sortedAuthors = sortedAuthors.sort((a, b) => b.likes - a.likes);

    // 로그인한 사용자가 Top 2 안에 포함되지 않았다면, 상위 2명과 로그인한 사용자를 포함하여 반환
    if (userInTop > 1 || userInTop === -1) {
        // 좋아요가 없는 경우 userId와 함께 0으로 표시
        const userEntry = { userId: userId || 0, likes: userLikes || 0 };
        return sortedAuthors
            .slice(0, 2)
            .concat(sortedAuthors.find((author) => author.commentAuthorId === userId) || userEntry);
        // return sortedAuthors.slice(0, 2).concat(sortedAuthors.find((author) => author.commentAuthorId === userId));
    }

    // 그렇지 않으면 상위 2명만 반환
    return sortedAuthors.slice(0, 2);
};
