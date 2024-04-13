import { prisma } from '../../utils/prisma/index.js';

// # 유저에게 온 전체 최신 메세지 조회
export const getAllLatestMessages = async (userId) => {
    // 유저가 참여한 모든 고민(worries)과 답장(comments)
    const allWorriesAndComments = await prisma.worries.findMany({
        where: {
            deletedAt: null, // 삭제되지 않은 고민(worries)만 조회
            // isSolved: false, // 해결되지 않은 고민(답례 받지 않은)만 조회
            // NOT: [
            //     {
            //         comments: {
            //             some: {
            //                 unRead: false,
            //                 isSolved: true,
            //             },
            //         },
            //     },
            // ],
            OR: [
                { userId: userId }, // 유저가 첫 고민을 작성한 경우
                { commentAuthorId: userId }, // 타인의 첫고민에 유저가 답변자로 매칭된 경우
            ],
        },
        include: {
            comments: {
                where: {
                    deletedAt: null, // 삭제되지 않은 답변(comments)만 조회
                },
                orderBy: {
                    createdAt: 'desc', // 최신 답변 순으로 정렬
                },
            },
        },
    });

    // 각 고민에 해당하는 최신 답장
    const filteredWorriesAndComments = allWorriesAndComments.flatMap((worry) => {
        const latestComment = worry.comments[0] || null; // 첫 고민일 경우는 lastestComment 는 null, 그 외에는 0번째(가장 최신) 답변

        // 1 ) 유저에게 온 첫 고민 메세지  =>  유저가 최초 고민의 답변자 + 아직 답장을 보내지 않은 경우
        if (worry.commentAuthorId === userId && !latestComment) {
            return [
                {
                    worryId: worry.worryId,
                    icon: worry.icon,
                    commentId: null, // 최초 고민 메세지의 commentId 는 null
                    createdAt: worry.createdAt,
                    unRead: worry.unRead,
                },
            ];
        }

        // 2 )  자신의 고민에 대한 최신 답장  =>  유저가 최초 고민 작성자 + (해당 worryId의) 최신 답장은 다른사람(Not 유저)이 작성한 경우
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

        // 3 )  유저에게 온 재고민  =>  유저가 최초 고민의 답변자로 지정 + 최초 답장 보냄 + 이후 최신 답장(재고민)을 다른사람(Not 유저)이 작성한 경우
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

// # commentId에 해당하는 답장 상세
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
                    commentAuthorId: true,
                    isSolved: true,
                },
            },
            parent: { select: { userId: true } }, // 대댓글의 경우, 부모 댓글의 작성자id (userId) 조회
        },
    });
};

// # 메세지를 '읽음'상태로 업데이트
export const updateCommentStatus = async (commentId) => {
    await prisma.comments.update({
        where: { commentId },
        data: { unRead: false },
    });
};

// # worryId로 해당하는 고민찾기
export const findWorryById = async (worryId) => {
    return await prisma.worries.findUnique({ where: { worryId: parseInt(worryId) } });
};

// # worryId에 해당하는 마지막 답장
export const findLastReplyByWorryId = async (worryId) => {
    return await prisma.comments.findFirst({
        where: { worryId: parseInt(worryId) },
        orderBy: { createdAt: 'desc' },
    });
};

// # 중복 답변 존재 여부
export const checkForExistingReply = async (worryId, userId, parentId = null) => {
    const condition = parentId
        ? { parentId, userId: parseInt(userId) } // 재고민 or 재답변인 경우, parentId 와 userId
        : { worryId: parseInt(worryId), userId: parseInt(userId) }; // 첫번째 답변인 경우, worryId 와 userId
    return await prisma.comments.findFirst({
        where: condition,
    });
};

// # 답변 생성
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

// # 고민 테이블 updatedAt 업데이트
export const updateWorryUpdatedAt = async (worryId) => {
    return prisma.worries.update({
        where: { worryId: parseInt(worryId) },
        data: { updatedAt: new Date() },
    });
};

export const deleteSelectedWorryAndComments = async (worryId) => {
    // 고민에 속한 모든 답변 삭제
    await prisma.comments.updateMany({
        where: { worryId },
        data: { deletedAt: new Date() },
    });
    // 고민 삭제
    await prisma.worries.update({
        where: { worryId },
        data: { deletedAt: new Date() },
    });
};

// # commentId에 해당하는 답장 소프트 삭제
export const deleteComment = async (commentId) => {
    await prisma.comments.update({
        where: { commentId },
        data: { deletedAt: new Date() },
    });
};

// # commentId에 해당하는  worryId 소프트 삭제
export const deleteWorry = async (worryId) => {
    await prisma.worries.update({
        where: { worryId },
        data: { deletedAt: new Date() },
    });
};
// # 사용자 카운트 업데이트
export const updateUserCounts = async (comment, userId) => {
    // 최초 고민 작성자와 최초 답변 작성자
    const worryAuthorId = comment.worry.userId; // 고민을 작성한 사용자 ID
    const commentAuthorId = comment.worry.commentAuthorId; // 최초 고민에 답변을 단 사용자 ID

    // 최초 고민 작성자의 remainingWorries +1
    await prisma.users.updateMany({
        where: { userId: worryAuthorId, remainingWorries: { lt: 5 } }, // 최대 고민 가능 횟수(5) 미만인 경우에만 증가
        data: { remainingWorries: { increment: 1 } },
    });
    // 최초 답변자의 remainingAnswers +1
    await prisma.users.updateMany({
        where: { userId: commentAuthorId, remainingAnswers: { lt: 10 } }, // 최대 답변 가능 횟수(10) 미만인 경우에만 증가
        data: { remainingAnswers: { increment: 1 } },
    });
};

// # 답장 신고하기
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
