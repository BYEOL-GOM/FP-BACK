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

// 좋아요 받은 답변 작성자 remainingStars +1 해주기
export const incrementStars = async (commentAuthorId) => {
    return await prisma.users.update({
        where: { userId: parseInt(commentAuthorId) },
        data: { remainingStars: { increment: 1 } },
    });
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
        await prisma.users.updateMany({
            where: { userId: worryUpdateResult.userId, remainingWorries: { lt: 5 } },
            data: { remainingWorries: { increment: 1 } },
        });

        // 답변자의 remainingAnswers(남은 답변 수) 증가시키기
        await prisma.users.updateMany({
            where: { userId: worryUpdateResult.commentAuthorId, remainingAnswers: { lt: 5 } },
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

// '나의 해결된 고민' 목록 전체 조회 -> '내가 등록한 고민' 목록 전체 조회
export const findSolvedWorriesByUserId = async (userId, page, limit) => {
    const skip = (page - 1) * limit;
    const worries = await prisma.worries.findMany({
        where: {
            // isSolved: true,
            userId: userId,
            deletedAt: null, // 신고,삭제되지 않은 고민만 검색
        },
        select: {
            worryId: true,
            userId: true,
            icon: true,
            content: true,
            createdAt: true,
            isSolved: true, // 해결 여부 포함
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
            // isSolved: true,
            userId: userId,
            deletedAt: null, // 신고,삭제되지 않은 고민에 대한 전체 항목 수를 조회
        },
    });

    return {
        page, // 현재 페이지 번호 추가
        limit, // 페이지당 항목 수 추가
        totalCount, // 전체 항목 수
        worries, // 현재 페이지의 데이터
    };
};

// '내가 해결한 고민' 목록 전체 조회 -> '내가 답변한 고민' 목록 전체 조회
export const findHelpedSolveWorriesByUserId = async (userId, page, limit) => {
    const skip = (page - 1) * limit;
    const worries = await prisma.worries.findMany({
        where: {
            // isSolved: true,
            commentAuthorId: userId,
            deletedAt: null, // 신고,삭제되지 않은 고민만 검색
            // solvingComment: {
            //     userId: userId,
            // },
        },
        select: {
            worryId: true,
            commentAuthorId: true,
            icon: true,
            content: true,
            createdAt: true,
            isSolved: true, // 해결 여부 포함
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
            // isSolved: true,
            deletedAt: null, // 신고,삭제되지 않은 고민에 대한 전체 항목 수를 조회
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

// 나의 해결된 고민 상세 조회 -> '내가 등록한 고민' 상세 조회
export const findSolvedWorryDetailsById = async (worryId, userId) => {
    const worryDetails = await prisma.worries.findUnique({
        where: {
            worryId: worryId,
            userId: userId,
            // isSolved: true,
        },
        select: {
            worryId: true,
            icon: true,
            content: true,
            createdAt: true,
            isSolved: true, // 해결 여부 포함
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

// '내가 해결한 고민' 상세 조회 -> '내가 답변한 고민' 상세 조회
export const findHelpedSolveWorryDetailsById = async (worryId, userId) => {
    const worryDetails = await prisma.worries.findUnique({
        where: {
            worryId: worryId,
            commentAuthorId: userId,
            // isSolved: true,
        },
        select: {
            worryId: true,
            icon: true,
            content: true,
            createdAt: true,
            isSolved: true, // 해결 여부 포함
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

    return worryDetails;
};

// 좋아요(답례)를 가장 많이 받은 상위 5명 유저 조회
// export const findTopLikedCommentAuthors = async (userId) => {
//     // 좋아요 데이터를 가져와서, 각 좋아요에 대한 댓글 작성자의 ID를 추출
//     const likes = await prisma.likes.findMany({
//         include: {
//             comment: {
//                 include: {
//                     worry: true,
//                 },
//             },
//         },
//     });

//     // 추출한 댓글 작성자 ID를 기반으로 각 댓글 작성자가 받은 좋아요 개수를 계산. commentAuthorLikesCount 객체에 저장
//     const commentAuthorLikesCount = likes.reduce((acc, like) => {
//         const commentAuthorId = like.comment.worry.commentAuthorId;
//         if (!acc[commentAuthorId]) {
//             acc[commentAuthorId] = 0;
//         }
//         acc[commentAuthorId]++;
//         return acc;
//     }, {});

//     // 작성자 ID와 좋아요 수를 객체로 매핑한 후 좋아요 수에 따라 내림차순으로 정렬합니다.
//     let sortedAuthors = Object.entries(commentAuthorLikesCount)
//         .map(([commentAuthorId, likes]) => ({ commentAuthorId: parseInt(commentAuthorId), likes }))
//         .sort((a, b) => b.likes - a.likes);

//     // 좋아요 수가 같은 경우 동일한 순위를 부여하기 위해 순위 할당 로직을 추가.
//     let rank = 1; // 초기 순위를 1로 설정합니다.
//     for (let i = 0; i < sortedAuthors.length; i++) {
//         if (i > 0 && sortedAuthors[i].likes === sortedAuthors[i - 1].likes) {
//             sortedAuthors[i].rank = rank; // 이전 사용자와 좋아요 수가 같다면 같은 순위를 부여
//         } else {
//             rank = i + 1; // 다른 좋아요 수를 가진 경우, 현재 인덱스에 1을 더한 값을 순위로 설정
//             sortedAuthors[i].rank = rank;
//         }
//     }

//     // 상위 5명의 작성자 정보만 추출.
//     let topFiveAuthors = sortedAuthors.slice(0, 5);

//     // 로그인한 사용자의 전체 순위 찾기
//     const userIndex = sortedAuthors.findIndex((author) => author.commentAuthorId === userId);
//     const userLikes = commentAuthorLikesCount[userId] || 0;

//     // 로그인한 사용자가 상위 5명 안에 있다면 userId 추가, 그렇지 않으면 상위 5명에 추가
//     if (userIndex !== -1 && userIndex < 5) {
//         topFiveAuthors[userIndex].userId = userId; // 사용자 ID 추가
//     } else if (userIndex >= 5 || userIndex === -1) {
//         topFiveAuthors.push({
//             userId: userId,
//             likes: userLikes,
//             rank: userIndex !== -1 ? sortedAuthors[userIndex].rank : sortedAuthors.length + 1, // 사용자의 전체 순위
//         });
//     }

//     return topFiveAuthors; // 계산된 상위 5명의 작성자 정보를 반환.
// };
//-------------------------------------------------------------------------------------------
// 좋아요(답례)를 가장 많이 받은 상위 5명 유저 조회
// export const findTopLikedCommentAuthors = async (userId) => {
//     // 좋아요 데이터를 가져와서, 각 좋아요에 대한 댓글 작성자의 ID를 추출
//     const likes = await prisma.likes.findMany({
//         include: {
//             comment: {
//                 include: {
//                     user: { select: { userId: true, nickname: true } }, // 각 댓글 작성자의 ID와 닉네임을 선택.
//                 },
//             },
//         },
//     });

//     // 추출한 댓글 작성자 ID를 기반으로 각 댓글 작성자가 받은 좋아요 개수를 계산. commentAuthorLikesCount 객체에 저장
//     1. 초기화: acc[commentAuthorId] 값이 존재하지 않는 경우 (즉, 아직 해당 작성자 ID로 누적된 좋아요가 없는 경우), 0으로 초기화. 이것은 해당 키가 객체에 존재하지 않을 때를 대비한 것.
//     2. 증가: 좋아요 수를 1 증가.
//     const commentAuthorLikesCount = likes.reduce((acc, like) => {
//         const commentAuthorId = like.comment.userId; // 댓글 작성자의 ID
//         if (!acc[commentAuthorId]) {
//             acc[commentAuthorId] = 0;
//         }
//         acc[commentAuthorId]++;
//         return acc;
//     }, {});

//     // 작성자 ID와 좋아요 수를 객체로 매핑한 후 좋아요 수에 따라 내림차순으로 정렬.
//     let sortedAuthors = Object.entries(commentAuthorLikesCount)
//     .map(([commentAuthorId, likes]) => ({ commentAuthorId: parseInt(commentAuthorId), likes }))
//     .sort((a, b) => b.likes - a.likes);

//     // 상위 5명의 작성자 정보만 추출.
//     let topFiveAuthors = sortedAuthors.slice(0, 5);

//     // 각 작성자의 닉네임을 가져와서 추가.
//     for (const author of topFiveAuthors) {
//         const user = await prisma.users.findUnique({
//             where: {
//                 userId: author.commentAuthorId,
//             },
//             select: {
//                 nickname: true,
//             },
//         });
//         if (user) {
//             // 만약 해당 작성자가 로그인한 사용자라면, userId 필드에 사용자 ID 추가
//             author.nickname = user.nickname;
//             if (author.commentAuthorId === userId) {
//                 author.userId = userId;
//             }
//         }
//         // if (!user) {
//             //     author.nickname = 'Unknown'; // 사용자가 데이터베이스에 없는 경우
//             // } else {
//                 //     author.nickname = user.nickname;
//                 //     if (author.commentAuthorId === userId) {
//                     //         author.userId = userId;
//                     //     }
//                     // }
//                 }
//                 // 로그인한 사용자의 닉네임을 가져오기
//                 const loginUser = await prisma.users.findUnique({
//                     where: {
//             userId: userId,
//         },
//         select: {
//             nickname: true,
//         },
//     });

//     // 만약 로그인한 사용자의 정보가 존재하지 않으면, userId에 해당하는 사용자의 닉네임을 가져와서 결과 배열에 추가.
//     if (!loginUser) {
//         const user = await prisma.users.findUnique({
//             where: {
//                 userId: userId,
//             },
//             select: {
//                 nickname: true,
//             },
//         });
//         if (user) {
//             topFiveAuthors.push({
//                 userId: userId,
//                 nickname: user.nickname,
//                 likes: commentAuthorLikesCount[userId] || 0,
//             });
//         }
//     }

//     // 로그인한 사용자의 전체 순위 찾기
//     const userIndex = sortedAuthors.findIndex((author) => author.commentAuthorId === userId);
//     const userLikes = commentAuthorLikesCount[userId] || 0;

//     // 로그인한 사용자가 상위 5명 안에 있다면 userId 추가, 그렇지 않으면 상위 5명에 추가
//     if (userIndex !== -1 && userIndex < 5) {
//         topFiveAuthors[userIndex].userId = userId; // 사용자 ID 추가
//     } else if (userIndex >= 5 || userIndex === -1) {
//         topFiveAuthors.push({
//             userId: userId,
//             likes: userLikes,
//             nickname: loginUser.nickname, // 사용자의 닉네임
//             rank: userIndex !== -1 ? sortedAuthors[userIndex].rank : sortedAuthors.length + 1, // 사용자의 전체 순위
//         });
//     }

//     // 상위 유저들의 순위(rank) 추가
//     topFiveAuthors.forEach((author, index) => {
//         author.rank = index + 1;
//     });

//     return topFiveAuthors; // 계산된 상위 5명의 작성자 정보를 반환.
// };
//-------------------------------------------------------------------------------------------
// 좋아요(답례)를 가장 많이 받은 상위 5명 유저 조회
export const findTopLikedCommentAuthors = async (userId) => {
    // 좋아요 데이터를 포함하여 모든 댓글을 조회, 각 좋아요에 대한 댓글 작성자의 ID, nickname을 추출
    const likes = await prisma.likes.findMany({
        include: {
            comment: {
                include: {
                    user: { select: { userId: true, nickname: true } }, // 댓글 작성자의 ID와 닉네임 포함하여 조회
                },
            },
        },
    });

    // 좋아요 받은 각 댓글 작성자 ID 별로 좋아요 수를 계산
    const commentAuthorLikesCount = likes.reduce((acc, like) => {
        const commentAuthorId = like.comment.user.userId; // 댓글 작성자의 ID 추출
        // 초기화와 증가: acc[commentAuthorId] 값이 존재하지 않으면 0을 사용하고, 존재하는 경우 그 값을 사용. 그리고 이 값을 1 증가.
        acc[commentAuthorId] = (acc[commentAuthorId] || 0) + 1; // 해당 ID의 좋아요 수를 누적
        return acc;
    }, {});

    // 좋아요 수에 따라 사용자를 내림차순으로 정렬
    let sortedAuthors = Object.entries(commentAuthorLikesCount)
        .map(([commentAuthorId, likes]) => ({ commentAuthorId: parseInt(commentAuthorId), likes }))
        .sort((a, b) => b.likes - a.likes);

    // 좋아요 수가 가장 많은 상위 5명을 추출
    let topFiveAuthors = sortedAuthors.slice(0, 5);

    // 상위 5명의 각 작성자에 대해 추가 정보를 데이터베이스에서 조회
    for (const author of topFiveAuthors) {
        const user = await prisma.users.findUnique({
            where: {
                userId: author.commentAuthorId,
            },
            select: {
                nickname: true,
            },
        });
        // 데이터베이스에서 상위 5명의 댓글 작성자의 정보를 가져와서, 각 작성자의 닉네임을 추가하고, 현재 로그인한 사용자가 해당 리스트에 포함되어 있는지 확인.
        if (user) {
            // 만약 해당 작성자가 로그인한 사용자라면, userId 필드에 사용자 ID 추가
            author.nickname = user.nickname; // 사용자 정보가 있으면 닉네임 설정
            if (author.commentAuthorId === userId) {
                author.userId = userId; // 현재 로그인한 사용자일 경우 userId 추가
            }
        }
    }

    // 로그인한 사용자의 닉네임을 데이터베이스에서 조회
    const loginUser = await prisma.users.findUnique({
        where: {
            userId: userId,
        },
        select: {
            nickname: true, // 닉네임만 선택적으로 조회
        },
    });

    // 로그인한 사용자의 전체 순위를 찾기
    const userIndex = sortedAuthors.findIndex((author) => author.commentAuthorId === userId); // sortedAuthors 배열에서 로그인한 사용자의 ID (userId)와 일치하는 댓글 작성자 ID를 가진 요소의 인덱스를 찾는다.
    const userLikes = commentAuthorLikesCount[userId] || 0; //  로그인한 사용자의 ID를 키로 사용하여 좋아요 수를 조회. 만약 해당 키에 대한 값이 존재하지 않으면 0을 기본 값으로 사용
    const userRank = userIndex !== -1 ? userIndex + 1 : sortedAuthors.length + 1; // 삼항 연산자를 사용하여 사용자의 순위 계산. 배열은 0부터 인덱스를 시작하므로 실제 순위를 얻기 위해 1을 더함.

    // 로그인한 사용자가 상위 5명에 포함되지 않은 경우 목록에 추가
    if (userIndex >= 5 || userIndex === -1) {
        topFiveAuthors.push({
            userId: userId,
            likes: userLikes,
            nickname: loginUser.nickname,
            rank: userRank, // 계산된 전체 순위
        });
    }

    // 최종적으로 반환된 상위 사용자 목록에 순위를 할당
    sortedAuthors.forEach((author, index) => {
        author.rank = index + 1; // 각 사용자에게 순위 할당
    });

    return topFiveAuthors;
};
