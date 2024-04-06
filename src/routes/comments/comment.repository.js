import { prisma } from '../../utils/prisma/index.js';

// worryId로 해당하는 고민찾기
export const findWorryById = async (worryId) => {
    return await prisma.worries.findUnique({ where: { worryId: parseInt(worryId) } });
};

// 모든 답변 전체 조회
export const findLatestCommentsAndWorriesForUser = async (userId) => {
    // 사용자가 고민자 혹은 답변자로 참여한 모든 고민 조회
    const userWorries = await prisma.worries.findMany({
        where: {
            OR: [
                { userId }, // 고민을 작성한 경우
                { commentAuthorId: userId }, // 답변자로 매칭된 경우
            ],
        },
        include: {
            comments: {
                where: {
                    userId: { not: userId }, // 사용자가 작성한 답변 제외
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: 1, // 각 고민에 대한 최신 답변만 선택
            },
        },
    });

    // 필요한 정보만 추출하여 배열로 반환
    const latestCommentsAndWorriesInfo = userWorries.map((worry) => {
        const latestComment = worry.comments[0] || null;
        return {
            worryId: worry.worryId,
            icon: worry.icon, // 각 worry에 해당하는 icon 정보 추가
            commentId: latestComment ? latestComment.commentId : null, // 첫번째 고민에 해당할때는 commentId 가 null
            createdAt: latestComment ? latestComment.createdAt : worry.createdAt,
        };
    });

    return latestCommentsAndWorriesInfo;
};

//commentId로 해당하는 답장 가져오기
export const getComment = async (commentId) => {
    return await prisma.comments.findUnique({
        where: { commentId },
        select: {
            commentId: true,
            content: true,
            createdAt: true,
            fontColor: true,
            worryId: true,
            deletedAt: true,
            userId: true,
            parentId: true,
            worry: { select: { userId: true } },
            parent: { select: { userId: true } },
        },
    });
};

// // 답장 상세조회
// export const getCommentDetails = async (commentId) => {
//     return await prisma.comments.findUnique({
//         where: { commentId: parseInt(commentId) },
//         select: {
//             commentId: true,
//             content: true,
//             createdAt: true,
//             fontColor: true,
//             parentId: true,
//             worryId: true,
//         },
//     });
// };

// 답장 보내기
// 부모 고민 또는 답변의 존재 여부를 확인하는 함수
export const findParentEntity = async (parentId, worryId) => {
    if (parentId) {
        return await prisma.comments.findUnique({
            where: { commentId: parentId },
            include: { worry: true },
        });
    } else {
        return await prisma.worries.findUnique({
            where: { worryId: parseInt(worryId) },
        });
    }
};

// 부모 답변에 대한 중복 답변 검증 함수
export const checkForExistingReply = async (worryId, userId, parentId = null) => {
    const condition = parentId
        ? { parentId, userId: parseInt(userId) }
        : { worryId: parseInt(worryId), userId: parseInt(userId) };
    return await prisma.comments.findFirst({
        where: condition,
    });
};

export const findLastReplyByWorryId = async (worryId) => {
    return await prisma.comments.findFirst({
        where: { worryId: parseInt(worryId) },
        orderBy: { createdAt: 'desc' },
    });
};

// 댓글(답변) 생성 함수
export const createReply = async ({ worryId, content, userId, parentId, fontColor }) => {
    return await prisma.comments.create({
        data: {
            worryId: parseInt(worryId),
            content,
            userId: parseInt(userId),
            parentId,
            fontColor,
        },
    });
};

// //commentId로 해당하는 답장 가져오기
// export const getComment = async (commentId) => {
//     return await prisma.comments.findUnique({
//         where: { commentId },
//         select: {
//             deletedAt: true,
//             userId: true,
//             parentId: true,
//             worry: { select: { userId: true } },
//             parent: { select: { userId: true } },
//         },
//     });
// };

// commentId에 해당하는 답장 삭제하기
export const deleteComment = async (commentId) => {
    await prisma.comments.update({
        where: { commentId },
        data: { deletedAt: new Date() },
    });
};

// 사용자 카운트 업데이트
export const updateUserCounts = async (commentId, userId) => {
    const comment = await prisma.comments.findUnique({
        where: { commentId },
        include: {
            parent: true,
            worry: true,
        },
    });

    if (!comment) {
        throw new Error('존재하지 않는 댓글입니다.');
    }

    // 최초 고민 작성자와 답변 작성자
    const worryAuthorId = comment.worry.userId;
    const commentAuthorId = comment.worry.commentAuthorId;

    // 요청자가 고민 작성자일 경우
    if (userId === worryAuthorId) {
        // 고민 작성자의 remainingWorries +1
        await prisma.users.update({
            where: { userId: worryAuthorId, remainingWorries: { lt: 5 } },
            data: { remainingWorries: { increment: 1 } },
        });
        // 해당 고민의 답변 작성자의 remainingAnswers +1
        await prisma.users.update({
            where: { userId: commentAuthorId, remainingAnswers: { lt: 10 } },
            data: { remainingAnswers: { increment: 1 } },
        });
    } else if (userId === commentAuthorId) {
        // 요청자가 답변 작성자일 경우
        // 답변 작성자의 remainingAnswers +1
        await prisma.users.update({
            where: { userId: commentAuthorId, remainingAnswers: { lt: 10 } },
            data: { remainingAnswers: { increment: 1 } },
        });
        // 고민 작성자의 remainingWorries +1
        await prisma.users.update({
            where: { userId: worryAuthorId, remainingWorries: { lt: 5 } },
            data: { remainingWorries: { increment: 1 } },
        });
    }
};

// 답장 신고하기
export const reportComment = async (commentId, userId, reportReason) => {
    await prisma.reports.create({
        data: {
            commentId,
            userId,
            reason: reportReason,
            reportedAt: new Date(),
        },
    });
};
