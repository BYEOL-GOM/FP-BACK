import { prisma } from '../../utils/prisma/index.js';

// worryId로 해당하는 고민찾기
export const findWorryById = async (worryId) => {
    return await prisma.worries.findUnique({ where: { worryId: parseInt(worryId) } });
};

// 모든 답변 전체 조회
export const findLatestCommentsAndWorriesForUser = async (userId) => {
    // 사용자에게 온 모든 고민 + 답변 조회
    const userWorriesAndComments = await prisma.worries.findMany({
        where: {
            OR: [
                { userId: userId }, // 사용자가 고민을 작성한 경우
                { commentAuthorId: userId }, // 사용자가 고민에 대한 최초의 답변자인 경우
            ],
        },
        include: {
            comments: {
                orderBy: {
                    createdAt: 'desc',
                },
            },
        },
    });

    // 고민과 답변에 대한 추가적인 로직 처리
    const filteredWorriesAndComments = userWorriesAndComments.flatMap((worry) => {
        const latestComment = worry.comments[0] || null;

        // 최초 고민 작성자가 사용자일경우, 최신 답변이 다른 사람에 의해 작성된 경우
        if (worry.userId === userId && latestComment && latestComment.userId !== userId) {
            return [
                {
                    worryId: worry.worryId,
                    icon: worry.icon,
                    commentId: latestComment.commentId,
                    createdAt: latestComment.createdAt,
                    unRead: latestComment.unRead,
                },
            ];
        }

        // 최초 고민의 답변자가 사용자일경우, 아직 답변(대댓글)이 없는 경우
        if (worry.commentAuthorId === userId && !latestComment) {
            return [
                {
                    worryId: worry.worryId,
                    icon: worry.icon,
                    commentId: null, // 아직 답변이 없으므로 null
                    createdAt: worry.createdAt,
                    unRead: worry.unRead, // 고민의 읽음/안 읽음 상태
                },
            ];
        }

        //최초 고민의 답변자가 사용자일경우, 이후 답변(대댓글)이 다른 사람에 의해 작성된 경우
        if (worry.commentAuthorId === userId && latestComment && latestComment.userId !== userId) {
            return worry.comments
                .filter((comment) => comment.userId !== userId)
                .map((comment) => ({
                    worryId: worry.worryId,
                    icon: worry.icon,
                    commentId: comment.commentId,
                    createdAt: comment.createdAt,
                    unRead: comment.unRead,
                }));
        }

        return []; // 위 조건에 맞지 않는 경우 빈 배열 반환
    });

    return filteredWorriesAndComments;
};

//commentId에 해당하는 답장 조회
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
            unRead: true,
            userId: true,
            parentId: true,
            worry: {
                select: {
                    userId: true,
                    icon: true,
                },
            },
            parent: { select: { userId: true } },
        },
    });
};

// 메세지 읽음상태로 업데이트 하기
export const updateCommentStatus = async (commentId) => {
    await prisma.comments.update({
        where: { commentId },
        data: { unRead: false },
    });
    // 업데이트 후 답장 정보 다시 조회
    return await prisma.comments.findUnique({
        where: { commentId },
        select: {
            commentId: true,
            content: true,
            createdAt: true,
            fontColor: true,
            worryId: true,
            deletedAt: true,
            unRead: true, // 이제 false로 업데이트된 상태를 확인할 수 있음
            userId: true,
            parentId: true,
            worry: { select: { userId: true } },
            parent: { select: { userId: true } },
        },
    });
};

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
            unRead: true, // 새로운 답장 '읽지 않음' 상태
        },
    });
};

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
