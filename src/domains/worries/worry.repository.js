import { prisma } from '../../utils/prisma/index.js';

// # 랜덤으로 답변자 선택
export const getRandomUser = async (userId, prismaClient) => {
    // 답변 가능한 사용자 조회 (remainingAnswers가 0보다 큰 사용자)
    const potentialResponders = await prismaClient.users.findMany({
        where: {
            userId: { not: userId },
            remainingAnswers: { gt: 0 },
        },
    });
    return potentialResponders;
};

// # userId 로 유저 정보 조회
export const getUserById = async (userId, prismaClient) => {
    //트랜잭션 & 비트랜잭션 컨텐스트에서 모두 활용
    return await prismaClient.users.findUnique({ where: { userId } });
};

// # 고민 작성자의 remainingWorries -1 하기
export const decreaseRemainingWorries = async (userId, prismaClient) => {
    await prismaClient.users.update({
        where: { userId },
        data: { remainingWorries: { decrement: 1 } },
    });
};

// # 답변자의 remainingAnswers -1하기
export const decreaseRemainingAnswers = async (userId, prismaClient) => {
    await prismaClient.users.update({
        where: { userId },
        data: { remainingAnswers: { decrement: 1 } },
    });
};

// # 고민 등록
export const createWorry = async (content, icon, userId, randomAuthorId, fontColor, prismaClient) => {
    return await prismaClient.worries.create({
        data: {
            content,
            icon,
            userId,
            commentAuthorId: randomAuthorId,
            fontColor,
        },
    });
};

// # 고민 상세조회(삭제된 고민 제외)
export const getWorryDetail = async (worryId, prismaClient) => {
    return await prismaClient.worries.findUnique({
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
};

// # 고민을 '읽음' 상태로 업데이트
export const updateWorryStatus = async (worryId, prismaClient) => {
    await prismaClient.worries.update({
        where: { worryId },
        data: { unRead: false },
    });
};

// # 생성된후 12시간 동안 답변이 없는 고민 or 12시간동안 답장이 오지 않는 메세지 조회
export const findOldMessages = async (prismaClient) => {
    const twentyFourHoursAgo = new Date(new Date().getTime() - 12 * 60 * 60 * 1000);

    return await prismaClient.worries.findMany({
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
export const getWorry = async (worryId, prismaClient) => {
    return await prismaClient.worries.findUnique({
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
export const getComment = async (commentId, prismaClient) => {
    return await prismaClient.comments.findUnique({
        where: { commentId },
    });
};

// # worryId에 해당하는 comments 모두 소프트 삭제
export const deleteAllCommentsForWorry = async (worryId, prismaClient) => {
    // worryId에 속한 모든 댓글을 소프트 삭제
    await prismaClient.comments.updateMany({
        where: { worryId },
        data: { deletedAt: new Date() },
    });
};

// # worryId에 해당하는 고민 메세지 삭제
export const deleteSelectedWorry = async (worryId, prismaClient) => {
    await prismaClient.worries.updateMany({
        where: { worryId },
        data: { deletedAt: new Date() },
    });
};

// # 사용자 카운트 업데이트
export const updateUserCounts = async (worryAuthorId, commentAuthorId, prismaClient) => {
    // 고민 작성자의 remainingWorries 증가
    await prismaClient.users.updateMany({
        where: { userId: worryAuthorId, remainingWorries: { lt: 5 } },
        data: { remainingWorries: { increment: 1 } },
    });
    // 답변 작성자의 remainigAnswers 증가
    await prismaClient.users.updateMany({
        where: { userId: commentAuthorId, remainingAnswers: { lt: 5 } },
        data: { remainingAnswers: { increment: 1 } },
    });
};

// # 신고 정보 저장하기
export const reportWorry = async (worryId, userId, reportReason, prismaClient) => {
    await prismaClient.reports.create({
        data: {
            worryId,
            userId,
            reason: reportReason,
            reportedAt: new Date(),
        },
    });
};

// # 답장 신고 정보 저장하기
export const reportComment = async (commentId, userId, reportReason, prismaClient) => {
    await prismaClient.reports.create({
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
