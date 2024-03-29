import * as PresentRepository from './present.repository.js';

// 해당 고민 게시글 가져오기
export const getWorryById = async (worryId) => {
    const worry = await PresentRepository.findWorryById(worryId);
    if (!worry) {
        const err = new Error('해당하는 답변의 고민 게시글이 존재하지 않습니다.');
        err.status = 404;
        throw err;
    }
    return worry;
};

// 선물 보내기
export const sendPresent = async (worryId, commentId, userId, commentAuthorId) => {
    console.log('💛💛💛서비스 : ', worryId, commentId, userId, commentAuthorId);

    // 해당 고민 게시글 가져오기
    const worry = await PresentRepository.findWorryById(worryId);

    // 고민이 해결되었거나 선물을 이미 보냈다면 에러 처리
    if (worry.isSolved && worry.presentCheck) {
        const err = new Error('이미 선물이 전송되었습니다.');
        err.status = 400;
        throw err;
    }

    // 고민(worry)을 해결된 상태로 변경하고, 선물 생성
    const present = await PresentRepository.markWorryAsSolvedAndCreatePresent(
        worryId,
        commentId,
        userId,
        commentAuthorId,
    );

    return present;
};

// '나의 해결된 고민' 목록 전체 조회
export const getSolvedWorriesByUserId = async (userId) => {
    return PresentRepository.findSolvedWorriesByUserId(userId);
};

// '나의 해결된 고민' 상세 조회
export const getSolvedWorryDetailsById = async (worryId) => {
    return PresentRepository.findSolvedWorryDetailsById(worryId);
};

// '내가 해결한 고민' 목록 전체 조회
export const getHelpedSolveWorriesByUserId = async (userId) => {
    return PresentRepository.findHelpedSolveWorriesByUserId(userId);
};

// '내가 해결한 고민' 상세 조회
export const getHelpedSolveWorryDetailsById = async (worryId) => {
    return PresentRepository.findHelpedSolveWorryDetailsById(worryId);
};
