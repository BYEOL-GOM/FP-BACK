import * as worryRepository from './worry.repository.js';

//고민 등록
export const createWorry = async ({ content, icon, userId }) => {
    try {
        // Get a random user ID for the responder
        const randomAuthorId = await worryRepository.getRandomUser(userId);

        // Create the worry with the random author ID
        return await worryRepository.createWorry({ content, icon, userId, randomAuthorId });
    } catch (error) {
        throw new Error('고민 등록 실패' + error.message);
    }
};

// 고민 상세조회
export const getWorryDetail = async (worryId) => {
    try {
        return await worryRepository.getWorryDetail(worryId);
    } catch (error) {
        throw new Error('고민 상세조회 실패: ' + error.message);
    }
};

// 오래된 고민 삭제
export const deleteWorryService = async (worryId) => {
    try {
        // 24시간 전의 시간 계산
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // 24시간 이내에 답변이 오지 않은 고민들을 가져옴
        const oldworries = await prisma.worries.findMany({
            where: {
                lastReplyTime: {
                    lt: twentyFourHoursAgo,
                },
            },
        });

        // 24시간 이내에 답변이 오지 않은 고민들을 소프트 삭제
        await Promise.all(
            oldworries.map(async (worry) => {
                await prisma.worries.update({
                    where: { worryId: worry.worryId },
                    data: { deletedAt: new Date() }, // deletedAt 필드를 현재 시간으로 업데이트하여 소프트 삭제
                });
            }),
        );
    } catch (error) {
        throw new Error('Error soft deleting old concerns: ' + error.message);
    }
};
