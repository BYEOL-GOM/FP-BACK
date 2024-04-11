import { prisma } from '../../utils/prisma/index.js';

// 랜덤으로 답변자 선택
export const getRandomUser = async (userId) => {
    try {
        // 답변 가능한 사용자 조회 (remainingAnswers가 0보다 큰 사용자)
        const potentialResponders = await prisma.users.findMany({
            where: {
                userId: { not: userId },
                remainingAnswers: { gt: 0 },
            },
        });

        // 사용 가능한 답변자가 없는 경우 에러 처리
        if (potentialResponders.length === 0) {
            throw new Error('모든 답변자가 답장을 작성중입니다');
        }
        // 랜덤 답변자 선택
        const randomIndex = Math.floor(Math.random() * potentialResponders.length);
        return potentialResponders[randomIndex].userId;
    } catch (error) {
        throw new Error(error.message);
    }
};

// userId 로 user 조회
export const getUserById = async (userId) => {
    return await prisma.users.findUnique({ where: { userId } });
};

// userId에 해당하는 remainingWorries -1 하기
export const decreaseRemainingWorries = async (userId) => {
    await prisma.users.update({
        where: { userId },
        data: { remainingWorries: { decrement: 1 } },
    });
};

// userId에 해당하는 remainingAnswers -1하기
export const decreaseRemainingAnswers = async (userId) => {
    await prisma.users.update({
        where: { userId },
        data: { remainingAnswers: { decrement: 1 } },
    });
};

// 고민 등록
export const createWorry = async ({ content, icon, userId, randomAuthorId, fontColor }) => {
    try {
        const createdWorry = await prisma.worries.create({
            data: {
                content,
                icon,
                userId,
                commentAuthorId: randomAuthorId,
                fontColor,
            },
            select: {
                worryId: true,
                userId: true,
                commentAuthorId: true,
                content: true,
                createdAt: true,
                icon: true,
                fontColor: true,
            },
        });
        return createdWorry;
    } catch (error) {
        throw new Error('고민등록에 실패하였습니다. ' + error.message);
    }
};

// 고민 상세조회(삭제된 고민 제외)
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

// 고민을 읽음 상태로 업데이트
export const updateWorryStatus = async (worryId) => {
    await prisma.worries.update({
        where: { worryId },
        data: { unRead: false },
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
};

// 생성된지 24시간 이상된 답변 없는 고민 or 답변이 있지만 마지막 답변이 24시간 이상된 고민 찾기
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

// 오래된 고민 소프트 삭제
export const softDeleteWorryById = async (worryId) => {
    try {
        const existingWorry = await prisma.worries.findUnique({
            where: { worryId },
            select: { deletedAt: true, userId: true, commentAuthorId: true },
        });

        // 이미 삭제된 경우에는 더 이상 업데이트하지 않음
        if (existingWorry.deletedAt === null) {
            await prisma.worries.update({
                where: { worryId },
                data: { deletedAt: new Date() },
            });
            console.log(`오래된 고민 ${worryId}번 삭제 성공`);

            // 사용자의 remainingWorries +1
            await prisma.users.update({
                where: { userId: existingWorry.userId },
                data: { remainingWorries: { increment: 1 } },
            });

            // 답변자의 remainingAnswers +1
            if (existingWorry.commentAuthorId) {
                await prisma.users.update({
                    where: { userId: existingWorry.commentAuthorId },
                    data: { remainingAnswers: { increment: 1 } },
                });
            }
        } else {
            console.log(`오래된 고민 ${worryId}번은 이미 삭제되었습니다.`);
        }
    } catch (error) {
        console.error(`오래된 고민 ${worryId}번 삭제 실패:`, error);
        throw error;
    }
};

// worryId로 고민 조회 (삭제/미삭제 모두 포함)
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

// commentId로 답장 조회
export const getComment = async (commentId) => {
    return await prisma.comments.findUnique({
        where: { commentId },
    });
};

//worryId에 해당하는 comments 모두 소프트 삭제
export const deleteAllCommentsForWorry = async (worryId) => {
    // worryId에 속한 모든 댓글을 소프트 삭제
    await prisma.comments.updateMany({
        where: { worryId },
        data: { deletedAt: new Date() },
    });
};

// 고민 선택 삭제
export const deleteSelectedWorry = async (worryId) => {
    await prisma.worries.updateMany({
        where: { worryId },
        data: { deletedAt: new Date() },
    });
};

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

// 신고 정보 저장하기
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

// 로켓 개수 확인
export const findRemainingWorriesByUserId = async (userId) => {
    const user = await prisma.users.findUnique({
        where: { userId },
        select: { remainingWorries: true },
    });

    return user?.remainingWorries;
};
