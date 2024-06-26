import { prisma } from '../../utils/prisma/index.js';
import moment from 'moment';

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

// 최신(마지막) 답변 가져오기
export const findLastReplyByWorryId = async (worryId) => {
    const lastReply = await prisma.comments.findFirst({
        where: { worryId: parseInt(worryId) },
        orderBy: { createdAt: 'desc' },
    });

    return lastReply;
};

export const getCommentAndWorryInfo = async function getCommentAndWorryInfo(commentId) {
    const commentInfo = await prisma.comments.findUnique({
        where: { commentId: parseInt(commentId) },
        select: {
            userId: true, // 댓글 작성자 ID
            worry: {
                select: {
                    commentAuthorId: true, // 고민을 해결한 답변자 ID
                },
            },
        },
    });
    return commentInfo;
};

// 좋아요(선물) 보내기
export const markWorryAsSolvedAndCreateLike = async (worryId, commentId, userId, content) => {
    try {
        // 고민을 업데이트하고, 사용자 엔티티를 업데이트하며, 답변을 생성하는 트랜잭션
        const transactionResults = await prisma.$transaction([
            prisma.worries.update({
                where: { worryId: parseInt(worryId) },
                data: {
                    isSolved: true,
                    solvingCommentId: parseInt(commentId),
                },
                select: {
                    userId: true, // 업데이트된 worry에서 userId 추출
                    commentAuthorId: true, // 답변을 작성한 사용자 ID
                    solvingCommentId: true,
                },
            }),
        ]);

        // 좋아요 생성
        const likeCreationResult = await prisma.likes.create({
            data: {
                userId: parseInt(transactionResults[0].commentAuthorId), // 좋아요 받는 사용자 (답변자)
                commentId: parseInt(commentId),
            },
        });

        // 해당 worryId에 대한 최신 답변 조회
        const lastReply = await prisma.comments.findFirst({
            where: { worryId: parseInt(worryId) },
            orderBy: { createdAt: 'desc' },
        });

        // 최신 답변에 대한 답변 생성
        const replyCreationResult = await prisma.comments.create({
            data: {
                worryId: parseInt(worryId),
                userId: parseInt(userId), // 답변 작성자
                parentId: lastReply ? lastReply.commentId : null, // 최신 답변의 ID를 부모 ID로 설정
                fontColor: 'default', // 기본 폰트 색상 or 요청에서 받은 값 사용
                unRead: true,
                content: content, // 답변 내용
            },
        });

        // 사용자의 remainingWorries(남은 고민 수)를 증가시키기
        await prisma.users.update({
            where: { userId: transactionResults[0].userId },
            data: { remainingWorries: { increment: 1 } },
        });

        // 답변자의 remainingAnswers(남은 답변 수) 증가시키기
        await prisma.users.update({
            where: { userId: transactionResults[0].commentAuthorId },
            data: { remainingAnswers: { increment: 1 } },
        });

        return { worryUpdateResult: transactionResults[0], likeCreationResult, replyCreationResult };
    } catch (error) {
        console.error('Transaction error: ', error);
        throw error;
    }
};

// 좋아요 받은 답변 작성자 remainingStars +1 해주기
export const incrementStars = async (commentAuthorId) => {
    return await prisma.users.update({
        where: { userId: parseInt(commentAuthorId) },
        data: { remainingStars: { increment: 1 } },
    });
};

// '내가 등록한 고민' 목록 전체 조회
export const findSolvedWorriesByUserId = async (userId, page, limit) => {
    const skip = (page - 1) * limit;

    const worriesResponse = await prisma.worries.findMany({
        where: {
            userId: userId,
        },
        include: {
            reports: {
                select: {
                    reportId: true,
                },
            },
            comments: {
                // 댓글도 포함시켜서 불러오기
                include: {
                    reports: {
                        select: {
                            reportId: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        skip: skip,
        take: limit,
    });

    console.log('🩶🩶🩶Worries Response Before Formatting:', worriesResponse);

    const worries = worriesResponse.map((worry) => {
        const formattedDeletedAt = worry.deletedAt ? moment(worry.deletedAt).format('YYYY-MM-DD HH:mm:ss') : null;

        // 모든 댓글의 reportId 수집하여 신고 여부 확인
        // const hasReport = worry.comments.some((comment) => comment.reports.length > 0);
        const hasReport = worry.comments.some((comment) => comment.reports.length > 0) || worry.reports.length > 0;

        return {
            worryId: worry.worryId,
            userId: worry.userId,
            icon: worry.icon,
            content: worry.content,
            createdAt: worry.createdAt,
            isSolved: worry.isSolved,
            deletedAt: formattedDeletedAt,
            hasReport, // 신고된 댓글이 하나라도 있으면 true, 없으면 false
        };
    });

    const totalCount = await prisma.worries.count({
        where: {
            userId: userId,
        },
    });

    console.log('🩷🩷🩷worries : ', worries);

    return {
        page,
        limit,
        totalCount,
        worries,
    };
};

// '내가 답변한 고민' 목록 전체 조회
export const findHelpedSolveWorriesByUserId = async (userId, page, limit) => {
    const skip = (page - 1) * limit;

    const worriesResponse = await prisma.worries.findMany({
        where: {
            commentAuthorId: userId, // 답변 작성자의 ID를 필터링
        },
        include: {
            reports: {
                select: {
                    reportId: true,
                },
            },
            comments: {
                // 댓글도 포함시켜서 불러오기
                include: {
                    reports: {
                        select: {
                            reportId: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        skip: skip,
        take: limit,
    });

    const worries = worriesResponse.map((worry) => {
        const formattedDeletedAt = worry.deletedAt ? moment(worry.deletedAt).format('YYYY-MM-DD HH:mm:ss') : null;

        // 댓글에 대한 신고 여부 확인
        const hasReport = worry.comments.some((comment) => comment.reports.length > 0) || worry.reports.length > 0;

        return {
            worryId: worry.worryId,
            commentAuthorId: worry.commentAuthorId, // 'commentAuthorId' 필드를 올바르게 매핑합니다.
            icon: worry.icon,
            content: worry.content,
            createdAt: worry.createdAt,
            isSolved: worry.isSolved,
            deletedAt: formattedDeletedAt,
            hasReport, // 신고된 댓글이 하나라도 있으면 true, 없으면 false
        };
    });

    const totalCount = await prisma.worries.count({
        where: {
            commentAuthorId: userId, // 답변 작성자의 ID를 필터링
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
async function fetchCommentsRecursively(commentId, reportIds) {
    // reportIds 매개변수 추가
    const comment = await prisma.comments.findUnique({
        where: { commentId },
        select: {
            commentId: true,
            userId: true, // 댓글 작성자 ID
            content: true,
            createdAt: true,
            // updatedAt: true,
            deletedAt: true, // 댓글 삭제 여부 추가
            reports: {
                select: {
                    reportId: true, // 댓글에 대한 신고 ID
                },
            },
            parentId: true, // 부모 댓글 ID
            children: true, // 자식 댓글 선택
        },
    });

    // 신고 ID 설정
    const reportId = comment.reports.length > 0 ? comment.reports[0].reportId : null;
    if (reportId) {
        reportIds.add(reportId); // 수집된 reportId를 세트에 추가
    }

    if (comment && comment.children && comment.children.length > 0) {
        for (let i = 0; i < comment.children.length; i++) {
            // 각 자식 댓글에 대해 재귀적으로 처리
            comment.children[i] = await fetchCommentsRecursively(comment.children[i].commentId, reportIds);
        }
    }

    // 반환 객체 구성 수정
    return {
        userId: comment.userId,
        commentId: comment.commentId,
        content: comment.content,
        createdAt: comment.createdAt,
        deletedAt: comment.deletedAt,
        reportId, // 명시적으로 reportId 추가
        parentId: comment.parentId,
        children: comment.children,
    };
}

// '내가 등록한 고민' 상세 조회
export const findSolvedWorryDetailsById = async (worryId, userId) => {
    const reportIds = new Set(); // reportId를 저장할 세트 초기화

    const worryDetails = await prisma.worries.findUnique({
        where: {
            worryId: worryId,
            userId: userId,
        },
        select: {
            worryId: true,
            userId: true,
            icon: true,
            content: true,
            createdAt: true,
            isSolved: true, // 해결 여부 포함
            deletedAt: true, // 고민 삭제 여부
            reports: {
                select: {
                    reportId: true, // 고민에 대한 신고 ID
                },
            },
            comments: {
                where: { parentId: null }, // 최초 댓글만 선택
                select: {
                    commentId: true,
                    userId: true, // 댓글 작성자 ID
                    content: true,
                    createdAt: true,
                    // updatedAt: true,
                    deletedAt: true, // 댓글 삭제 여부 추가
                    reports: {
                        select: {
                            reportId: true, // 댓글에 대한 신고 ID
                        },
                    },
                },
                orderBy: { createdAt: 'asc' },
            },
        },
    });

    // // 각 최초 댓글에 대해 대댓글을 재귀적으로 조회
    if (worryDetails && worryDetails.comments) {
        for (let i = 0; i < worryDetails.comments.length; i++) {
            worryDetails.comments[i] = await fetchCommentsRecursively(worryDetails.comments[i].commentId, reportIds);
        }
    }

    // 신고 여부를 true 또는 false로 반환
    const hasReports = reportIds.size > 0 || worryDetails.reports.length > 0; // 댓글이나 고민 자체에 신고가 있는지 확인

    return {
        // reportIds: reportIds.size === 1 ? reportIds.values().next().value : Array.from(reportIds), // 수집된 reportId들을 배열로 변환하여 추가
        hasReports, // 신고가 하나라도 있으면 true, 아니면 false
        ...worryDetails,
    };
};

// '내가 답변한 고민' 상세 조회
export const findHelpedSolveWorryDetailsById = async (worryId, userId) => {
    const reportIds = new Set(); // reportId를 저장할 세트 초기화

    const worryDetails = await prisma.worries.findUnique({
        where: {
            worryId: worryId,
            commentAuthorId: userId,
        },
        select: {
            worryId: true,
            userId: true,
            commentAuthorId: true, // 답변 작성자 ID
            icon: true,
            content: true,
            createdAt: true,
            isSolved: true, // 해결 여부 포함
            deletedAt: true, // 고민 삭제 여부
            reports: {
                select: {
                    reportId: true, // 고민에 대한 신고 ID
                },
            },
            comments: {
                where: { parentId: null }, // 최초 답변만 선택
                select: {
                    commentId: true,
                    userId: true, // 답변 작성자 ID
                    content: true,
                    createdAt: true,
                    // updatedAt: true,
                    deletedAt: true, // 댓글 삭제 여부 추가
                    reports: {
                        select: {
                            reportId: true, // 댓글에 대한 신고 ID
                        },
                    },
                },
                orderBy: { createdAt: 'asc' },
            },
        },
    });

    // // 각 최초 댓글에 대해 대댓글을 재귀적으로 조회
    if (worryDetails && worryDetails.comments) {
        for (let i = 0; i < worryDetails.comments.length; i++) {
            worryDetails.comments[i] = await fetchCommentsRecursively(worryDetails.comments[i].commentId, reportIds);
        }
    }

    // 신고 여부를 true 또는 false로 반환
    const hasReports = reportIds.size > 0 || worryDetails.reports.length > 0; // 댓글이나 고민 자체에 신고가 있는지 확인

    return {
        // reportIds: reportIds.size === 1 ? reportIds.values().next().value : Array.from(reportIds), // 수집된 reportId들을 배열로 변환하여 추가
        hasReports, // 신고가 하나라도 있으면 true, 아니면 false
        ...worryDetails,
    };
};

// 좋아요(답례)를 가장 많이 받은 상위 5명 유저 조회, 좋아요가 0개라도 랭커에 반영
export const findTopLikedCommentAuthors = async (userId) => {
    // 좋아요 데이터를 포함하여 모든 댓글을 조회, 각 좋아요에 대한 댓글 작성자의 ID, nickname을 추출
    const likes = await prisma.likes.findMany({
        include: {
            comment: {
                include: {
                    user: { select: { userId: true, nickname: true } },
                },
            },
        },
    });

    // 좋아요 받은 각 댓글 작성자 ID 별로 좋아요 수를 계산
    const commentAuthorLikesCount = likes.reduce((acc, like) => {
        const commentAuthorId = like.comment.user.userId; // 댓글 작성자의 ID 추출
        // 초기화와 증가: acc[commentAuthorId] 값이 존재하지 않으면 0을 사용하고, 존재하는 경우 그 값을 사용. 그리고 이 값을 1 증가.
        acc[commentAuthorId] = (acc[commentAuthorId] || 0) + 1;
        return acc; // 해당 ID의 좋아요 수를 누적
    }, {});

    // 모든 사용자를 조회하여 좋아요 수가 없는 사용자도 목록에 포함
    const allUsers = await prisma.users.findMany({
        select: { userId: true, nickname: true },
    });

    // 모든 사용자에 대해 좋아요 수를 매핑
    allUsers.forEach((user) => {
        user.likes = commentAuthorLikesCount[user.userId] || 0; // 해당 사용자 ID에 대응되는 좋아요 수를 찾는다. 해당 사용자가 좋아요를 받지 못했다면, undefined가 될 것. 이 경우 || 연산자(논리 OR)가 작동하여 user.likes에 0을 할당.
    });

    // 사용자를 좋아요 수에 따라 내림차순으로 정렬하고, 좋아요가 0인 경우 userId 기준 오름차순으로 정렬
    const sortedAuthors = allUsers.sort((a, b) => {
        // 좋아요가 둘 다 0인 경우, userId 기준 오름차순 정렬
        if (a.likes === 0 && b.likes === 0) {
            return a.userId - b.userId;
        }
        // 그 외의 경우, 좋아요 수 기준 내림차순 정렬
        return b.likes - a.likes;
    });

    // 좋아요 수가 가장 많은 상위 5명을 추출
    const topFiveAuthors = sortedAuthors.slice(0, 5);

    // 로그인한 사용자의 닉네임을 데이터베이스에서 조회
    const loginUser = await prisma.users.findUnique({
        where: {
            userId: userId,
        },
        select: {
            nickname: true,
        },
    });

    // 로그인한 사용자의 상세 정보 생성 및 전체 순위 지정
    sortedAuthors.forEach((user, index) => {
        user.rank = index + 1; // 전체 정렬된 목록에 대해 순위 지정
    });

    // 로그인한 사용자의 상세 정보 생성
    const loggedInUserDetails = {
        userId: userId,
        likes: commentAuthorLikesCount[userId] || 0,
        nickname: loginUser.nickname,
        rank: sortedAuthors.find((user) => user.userId === userId).rank, // 로그인한 사용자의 순위를 찾아서 할당
    };

    // 상위 5명 목록과 로그인한 사용자 정보를 하나의 배열로 결합하여 반환
    const combinedResults = [...topFiveAuthors, loggedInUserDetails].map((user) => ({
        userId: user.userId,
        nickname: user.nickname,
        likes: user.likes,
        rank: user.rank,
    }));

    return combinedResults;
};
