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
export const markWorryAsSolvedAndCreateLike = async (worryId, commentId, userId, content) => {
    try {
        // 고민을 업데이트하고, 선물을 생성하며, 사용자 엔티티를 업데이트하고, 답변을 생성하는 트랜잭션
        const transactionResults = await prisma.$transaction([
            // 고민 업데이트
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
            // 선물 보내기
            prisma.likes.create({
                data: {
                    userId: parseInt(userId),
                    commentId: parseInt(commentId),
                },
            }),
        ]);

        // 해당 worryId에 대한 최신 답변 조회
        const lastReply = await prisma.comments.findFirst({
            where: { worryId: parseInt(worryId) },
            orderBy: { createdAt: 'desc' },
        });

        // 최신 답변에 대한 답변 생성
        const replyCreationResult = await prisma.comments.create({
            data: {
                worryId: parseInt(worryId),
                content: content, // 답변 내용
                userId: parseInt(userId), // 답변 작성자
                parentId: lastReply ? lastReply.commentId : null, // 최신 답변의 ID를 부모 ID로 설정
                fontColor: 'default', // 기본 폰트 색상 or 요청에서 받은 값 사용
                unRead: true,
            },
        });

        // 결과 객체 업데이트
        const worryUpdateResult = transactionResults[0]; // 업데이트된 worry의 결과
        const likeCreationResult = transactionResults[1]; // 생성된 like의 결과
        // const replyCreationResult = transactionResults[2]; // 생성된 답변의 결과

        // 사용자의 remainingWorries(남은 고민 수)를 증가시킵니다.
        await prisma.users.update({
            where: { userId: worryUpdateResult.userId, remainingWorries: { lt: 5 } },
            data: { remainingWorries: { increment: 1 } },
        });

        // 답변자의 remainingAnswers(남은 답변 수) 증가시키기
        await prisma.users.update({
            where: { userId: worryUpdateResult.commentAuthorId, remainingAnswers: { lt: 10 } },
            data: { remainingAnswers: { increment: 1 } },
        });

        return { worryUpdateResult, likeCreationResult };
    } catch (error) {
        console.error('트랜잭션 중 오류 발생 : ', error);
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

// 좋아요를 가장 많이 받은 탑 2위 댓글 조회
export const findTopLikedCommentAuthors = async (userId) => {
    // 좋아요 데이터를 가져와서, 각 좋아요에 대한 댓글 작성자의 ID를 추출
    const likes = await prisma.likes.findMany({
        include: {
            comment: {
                include: {
                    worry: true,
                },
            },
        },
    });

    // 추출한 댓글 작성자 ID를 기반으로 각 댓글 작성자가 받은 좋아요 개수를 계산. commentAuthorLikesCount 객체에 저장
    const commentAuthorLikesCount = likes.reduce((acc, like) => {
        const commentAuthorId = like.comment.worry.commentAuthorId;
        if (!acc[commentAuthorId]) {
            acc[commentAuthorId] = 0;
        }
        acc[commentAuthorId]++;
        return acc;
    }, {});

    // 결과를 commentAuthorId와 좋아요 수로 구성된 객체로 변환하고, 좋아요 수에 따라 내림차순으로 정렬
    let sortedAuthors = Object.entries(commentAuthorLikesCount)
        // .map(([commentAuthorId, likes]) => ({ userId: parseInt(commentAuthorId), likes }))
        .map(([commentAuthorId, likes]) => ({ commentAuthorId: parseInt(commentAuthorId), likes }))
        .sort((a, b) => b.likes - a.likes)
        .slice(0, 2);

    // 로그인한 사용자가 있고 상위 랭커 2명에 포함되어 있는지 확인
    if (userId !== undefined) {
        const userLikes = commentAuthorLikesCount[userId];
        const userInTop = sortedAuthors.findIndex((author) => author.commentAuthorId === userId);

        // 좋아요가 없는 경우 likes를 0으로 설정
        const likesForCurrentUser = userLikes !== undefined ? userLikes : 0;

        // 로그인한 사용자가 상위 랭커 2명에 포함되어 있지 않은 경우
        if (userInTop === -1) {
            // 상위 랭커 2명과 로그인한 사용자 정보를 포함하여 반환
            sortedAuthors.push({ userId: userId, likes: likesForCurrentUser });
        } else {
            // 상위 랭커 2명에 포함되어 있는 경우 해당 정보만 업데이트
            sortedAuthors[userInTop].userId = userId;
            sortedAuthors[userInTop].likes = likesForCurrentUser;
        }
    }

    return sortedAuthors;
};
