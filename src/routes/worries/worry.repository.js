import { prisma } from '../../utils/prisma/index.js';

// # 랜덤으로 답변자 선택
export const getRandomUser = async (userId) => {
    try {
        // 답변 가능한 사용자 조회 (remainingAnswers가 0보다 큰 사용자)
        const potentialResponders = await prisma.users.findMany({
            where: {
                userId: { not: userId },
                remainingAnswers: { gt: 0 },
            },
        });

        // // 사용 가능한 답변자가 없는 경우 에러 처리
        if (potentialResponders.length === 0) {
            const error = new Error('모든 답변자가 답장을 작성중입니다');
            error.status = 400;
            throw error;
        }
        // 랜덤 답변자 선택
        const randomIndex = Math.floor(Math.random() * potentialResponders.length);
        return potentialResponders[randomIndex].userId;
    } catch (error) {
        throw new Error(error.message);
    }
};

// # userId 로 유저 정보 조회
export const getUserById = async (userId) => {
    return await prisma.users.findUnique({ where: { userId } });
};

// # 고민 작성자의 remainingWorries -1 하기
export const decreaseRemainingWorries = async (userId) => {
    await prisma.users.update({
        where: { userId },
        data: { remainingWorries: { decrement: 1 } },
    });
};

// # 답변자의 remainingAnswers -1하기
export const decreaseRemainingAnswers = async (userId) => {
    await prisma.users.update({
        where: { userId },
        data: { remainingAnswers: { decrement: 1 } },
    });
};

// # 고민 등록
export const createWorry = async (content, icon, userId, randomAuthorId, fontColor) => {
    try {
        const createdWorry = await prisma.worries.create({
            data: {
                content,
                icon,
                userId,
                commentAuthorId: randomAuthorId,
                fontColor,
            },
        });
        return createdWorry;
    } catch (error) {
        throw new Error('고민등록에 실패하였습니다. ' + error.message);
    }
};

// # 고민 상세조회(삭제된 고민 제외)
export const getWorryDetail = async (worryId) => {
    try {
        return await prisma.worries.findUnique({
            where: {
                worryId,
                deletedAt: null,
            },
            select: {
                worryId: true,
                userId: true,
                createdAt: true,
                content: true,
                icon: true,
                fontColor: true,
                commentAuthorId: true,
                unRead: true,
            },
        });
    } catch (error) {
        throw new Error('고민 상세조회에 실패하였습니다 ' + error.message);
    }
};

// # 고민을 '읽음' 상태로 업데이트
export const updateWorryStatus = async (worryId) => {
    await prisma.worries.update({
        where: { worryId },
        data: { unRead: false },
    });
};

// # 생성된후 12시간 동안 답변이 없는 고민 or 12시간동안 답장이 오지 않는 메세지 조회
export const findOldMessages = async () => {
    const twentyFourHoursAgo = new Date(new Date().getTime() - 12 * 60 * 60 * 1000);

    return await prisma.worries.findMany({
        where: {
            OR: [
                {
                    // 답변이 없고 createdAt이 12시간 이상된 경우
                    createdAt: { lt: twentyFourHoursAgo },
                    comments: { none: {} },
                },
                {
                    // 답변이 있고 updatedAt이 12시간 이상된 경우
                    updatedAt: { lt: twentyFourHoursAgo },
                    comments: { some: {} },
                },
            ],
            deletedAt: null,
        },
        select: { worryId: true },
    });
};

// # worryId로 고민 조회 (삭제/미삭제 모두 포함)
export const getWorry = async (worryId) => {
    return await prisma.worries.findUnique({
        where: { worryId },
        select: {
            worryId: true,
            commentAuthorId: true,
            deletedAt: true,
            userId: true,
        },
    });
};

// # commentId로 답장 조회
export const getComment = async (commentId) => {
    return await prisma.comments.findUnique({
        where: { commentId },
    });
};

// # worryId에 해당하는 comments 모두 소프트 삭제
export const deleteAllCommentsForWorry = async (worryId) => {
    // worryId에 속한 모든 댓글을 소프트 삭제
    await prisma.comments.updateMany({
        where: { worryId },
        data: { deletedAt: new Date() },
    });
};

// # worryId에 해당하는 고민 메세지 삭제
export const deleteSelectedWorry = async (worryId) => {
    await prisma.worries.updateMany({
        where: { worryId },
        data: { deletedAt: new Date() },
    });
};

// # 사용자 카운트 업데이트
export const updateUserCounts = async (worryAuthorId, commentAuthorId) => {
    // 고민 작성자의 remainingWorries 증가
    await prisma.users.updateMany({
        where: { userId: worryAuthorId, remainingWorries: { lt: 5 } },
        data: { remainingWorries: { increment: 1 } },
    });

    // 답변 작성자가 고민 작성자와 다를 경우, 답변 작성자의 remainingAnswers 증가
    if (commentAuthorId !== worryAuthorId) {
        await prisma.users.updateMany({
            where: { userId: commentAuthorId, remainingAnswers: { lt: 10 } },
            data: { remainingAnswers: { increment: 1 } },
        });
    }
};

// # 신고 정보 저장하기
export const reportWorry = async (worryId, userId, reportReason) => {
    await prisma.reports.create({
        data: {
            worryId,
            userId,
            reason: reportReason,
            reportedAt: new Date(),
        },
    });
};

// # 답장 신고 정보 저장하기
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

// # 로켓 개수 확인
export const findRemainingWorriesByUserId = async (userId) => {
    const user = await prisma.users.findUnique({
        where: { userId },
        select: { remainingWorries: true },
    });

    return user?.remainingWorries;
};
