import * as worryRepository from './worry.repository.js';
import { AppError } from '../../utils/AppError.js';
import { prisma } from '../../utils/prisma/index.js';

// # 고민 등록
export const createWorry = async (content, icon, userId, fontColor) => {
    return await prisma.$transaction(async (prisma) => {
        const user = await worryRepository.getUserById(userId, prisma);
        if (!user) {
            throw new AppError('존재하지 않는 사용자 입니다', 404);
        }
        if (user.remainingWorries <= 0) {
            throw new AppError('최대 고민 작성수를 초과하였습니다', 400);
        }
        const potentialResponders = await worryRepository.getRandomUser(userId, prisma);
        if (potentialResponders.length === 0) {
            throw new AppError('모든 답변자가 답장을 작성중입니다', 400);
        }
        // 답변자 Id 랜덤 지정
        const randomIndex = Math.floor(Math.random() * potentialResponders.length);
        const randomAuthorId = potentialResponders[randomIndex].userId;

        // 금지어 포함 여부 확인
        const isBannedWordIncluded = global.bannedWords.some((word) => content.includes(word));

        if (isBannedWordIncluded) {
            throw new AppError('금지어가 포함된 내용은 등록할 수 없습니다', 400);
        }

        // 고민 생성
        const worry = await worryRepository.createWorry(content, icon, userId, randomAuthorId, fontColor, prisma);

        // 사용자의 remainingWorries -1 하기
        await worryRepository.decreaseRemainingWorries(userId, prisma);

        // 답변자의 remainingAnswers -1 하기
        await worryRepository.decreaseRemainingAnswers(randomAuthorId, prisma);

        // 수정된 사용자 정보로  현재 남은 고민 횟수 확인
        const updatedUser = await worryRepository.getUserById(userId, prisma);

        return {
            worryId: worry.worryId,
            userId: worry.userId,
            commentAuthorId: randomAuthorId,
            createdAt: worry.createdAt,
            fontColor: worry.fontColor,
            remainingWorries: updatedUser.remainingWorries,
        };
    });
};

// # 고민 상세조회
export const getWorryDetail = async (worryId, userId) => {
    return await prisma.$transaction(async (prisma) => {
        let worry = await worryRepository.getWorryDetail(worryId, prisma);
        if (!worry) {
            throw new AppError('해당하는 고민이 존재하지 않습니다', 404);
        }
        if (worry.commentAuthorId !== userId) {
            throw new AppError('고민을 조회할 권한이 없습니다', 403);
        }
        // 고민을 "읽음" 상태로 업데이트
        if (worry.unRead) {
            await worryRepository.updateWorryStatus(worryId, prisma);
            worry = await worryRepository.getWorryDetail(worryId, prisma);
        }
        return worry;
    });
};

// # 답장이 없는 오래된 메세지 삭제하기
export const deleteOldMessages = async () => {
    return await prisma.$transaction(async (prisma) => {
        const oldWorries = await worryRepository.findOldMessages(prisma);

        for (const worry of oldWorries) {
            if (!worry.deletedAt) {
                await worryRepository.deleteSelectedWorry(worry.worryId, prisma); // 고민 삭제
                await worryRepository.deleteAllCommentsForWorry(worry.worryId, prisma); // 고민의 모든 댓글 삭제
                await worryRepository.updateUserCounts(worry.userId, worry.commentAuthorId, prisma); // 사용자 카운터 업데이트
            }
        }
        return oldWorries.length; // 삭제된 고민의 수
    });
};

// # 곤란한 메세지 삭제
export const deleteSelectedWorry = async (worryId, userId, commentId) => {
    return await prisma.$transaction(async (prisma) => {
        const selectedWorry = await worryRepository.getWorry(worryId, prisma);
        if (!selectedWorry) {
            throw new AppError('해당하는 메세지가 존재하지 않습니다', 404);
        }

        if (selectedWorry.deletedAt !== null) {
            throw new AppError('해당 메세지는 이미 삭제되었습니다', 409);
        }

        // 0 ) 고민의 작성자도, 지정된 답변자도 아닌 경우, 작성 권한 없음
        if (selectedWorry.userId !== userId && selectedWorry.commentAuthorId !== userId) {
            throw new AppError('메세지를 삭제할수 있는 권한이 없습니다', 403);
        }

        // worryId 소프트 삭제
        await worryRepository.deleteSelectedWorry(worryId, prisma);
        // 첫고민이 아닐경우 ,worryId 와 그에 해당하는 모든 commentId 소프트 삭제
        if (commentId) {
            await worryRepository.deleteAllCommentsForWorry(worryId, prisma);
        }
        // 사용자 카운트 업데이트
        await worryRepository.updateUserCounts(selectedWorry.userId, selectedWorry.commentAuthorId, prisma);

        return;
    });
};

// # 불쾌한 메세지 신고하기
export const reportMessage = async (worryId, userId, commentId, reportReason) => {
    return await prisma.$transaction(async (prisma) => {
        const selectedWorry = await worryRepository.getWorry(worryId, prisma);
        if (!selectedWorry) {
            throw new AppError('해당하는 메세지가 존재하지 않습니다', 404);
        }

        // 고민이 이미 삭제되었거나 신고되었는지 확인
        if (selectedWorry.deletedAt !== null) {
            throw new AppError('해당 메세지는 이미 신고되었습니다', 409);
        }

        // 0 ) 고민의 작성자도, 지정된 답변자도 아닌 경우, 신고 권한 없음
        if (selectedWorry.userId !== userId && selectedWorry.commentAuthorId !== userId) {
            throw new AppError('메세지를 신고할수 있는 권한이 없습니다', 403);
        }

        if (commentId) {
            const selectedComment = await worryRepository.getComment(commentId, prisma);
            if (!selectedComment) {
                throw new AppError('해당하는 메세지가 존재하지 않습니다', 404);
            }
            // 답장 신고: 답장을 작성한 사용자 ID를 사용
            await worryRepository.reportComment(commentId, selectedComment.userId, reportReason, prisma);
        } else {
            // 고민 신고: 고민을 작성한 사용자 ID를 사용
            await worryRepository.reportWorry(worryId, selectedWorry.userId, reportReason, prisma);
        }

        await worryRepository.deleteSelectedWorry(worryId, prisma);
        if (commentId) {
            await worryRepository.deleteAllCommentsForWorry(worryId, prisma);
        }
        await worryRepository.updateUserCounts(selectedWorry.userId, selectedWorry.commentAuthorId, prisma);
    });
};

// # 로켓(고민등록 가능) 개수 확인
export const findRemainingWorriesByUserId = async (userId) => {
    const remainingWorries = await worryRepository.findRemainingWorriesByUserId(userId);
    return remainingWorries;
};
