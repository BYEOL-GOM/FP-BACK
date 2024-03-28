import { prisma } from '../../utils/prisma/index.js';

// 랜덤으로 답변자 지정하기
export const getRandomUser = async (userId) => {
    try {
        const users = await prisma.users.findMany({
            where: {
                NOT: {
                    userId: userId, // 작성자 제외
                },
            },
        });

        if (users.length === 0) {
            throw new Error('회원가입한 유저가 없습니다.');
        }

        const randomIndex = Math.floor(Math.random() * users.length);
        return users[randomIndex].userId;
    } catch (error) {
        throw new Error('랜덤 답변자 선정 실패: ' + error.message);
    }
};

// 고민 등록
export const createWorry = async ({ content, icon, userId, randomAuthorId }) => {
    try {
        return await prisma.worries.create({
            data: {
                content,
                icon,
                userId,
                commentAuthorId: randomAuthorId,
            },
        });
    } catch (error) {
        throw new Error('고민등록에 실패하였습니다. ' + error.message);
    }
};

// 고민답변자Id기준으로 보는 고민 전체 조회

export const getWorriesByCommentAuthorId = async (userId) => {
    try {
        const worries = await prisma.worries.findMany({
            where: {
                commentAuthorId: userId,
            },
            select: {
                worryId: true,
                userId: true,
                icon: true,
            },
        });
        return worries;
    } catch (error) {
        throw new Error('Error retrieving worries by author ID: ' + error.message);
    }
};

// 고민 상세조회
export const getWorryDetail = async (worryId) => {
    try {
        return await prisma.worries.findUnique({
            where: {
                worryId,
            },
            select: {
                worryId: true,
                userId: true,
                commentAuthorId: true,
                content: true,
                createdAt: true,
            },
        });
    } catch (error) {
        throw new Error('고민 상세조회에 실패하였습니다 ' + error.message);
    }
};

//등록한지 24시간 이상 답변이 달리지 않은 고민들 조회

export const getOldWorries = async (date) => {
    try {
        return await prisma.worries.findMany({
            where: {
                NOT: {
                    comments: { some: { commentId: { not: null } } }, // At least one comment associated
                },
                createdAt: {
                    lt: date, // Created more than specified date
                },
            },
        });
    } catch (error) {
        throw new Error('Failed to fetch old worries without comments: ' + error.message);
    }
};

// 고민 소프트 삭제
export const softDeleteWorries = async (worries) => {
    try {
        await Promise.all(
            worries.map(async (worry) => {
                await prisma.worries.update({
                    where: { id: worry.id },
                    data: { deletedAt: new Date() }, // Soft delete by updating the deletedAt field
                });
            }),
        );
    } catch (error) {
        throw new Error('Failed to soft delete old worries: ' + error.message);
    }
};
