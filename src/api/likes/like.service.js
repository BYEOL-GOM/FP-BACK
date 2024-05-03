import * as LikeRepository from './like.repository.js';

// 선물 보내기
export const sendLike = async (worryId, commentId, userId, content) => {
    console.log('💛💛💛서비스 : ', worryId, commentId, userId, content);

    // 해당 고민 게시글 가져오기 및 유효성 검사
    const worry = await LikeRepository.findWorryById(worryId);
    if (!worry) {
        const err = new Error('해당 고민 게시글을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }

    // 선물 보내는 유저가 고민 게시글의 작성자가 아니라면 에러
    if (worry.userId !== userId) {
        const err = new Error('선물을 보낼 권한이 없습니다. 게시글의 작성자만 선물을 보낼 수 있습니다.');
        err.status = 403; // Forbidden access
        throw err;
    }

    // 선물을 이미 보냈다(고민 해결)면 에러 처리
    if (worry.isSolved) {
        const err = new Error('해당 답변에 대한 선물을 이미 보냈습니다.');
        err.status = 400;
        throw err;
    }

    // commentId 유효성 검사
    const commentExists = await LikeRepository.verifyCommentExists(commentId, worryId);
    if (!commentExists) {
        const err = new Error('유효하지 않은 댓글입니다.');
        err.status = 400;
        throw err;
    }

    // 해당 worryId에 대한 최신 답변 조회
    const lastReply = await LikeRepository.findLastReplyByWorryId(worryId);
    // lastReply 값이 null 또는 undefined인 경우를 처리
    if (!lastReply) {
        console.error('No replies found for the given worryId:', worryId);
        const err = new Error('해당 고민 ID에 대한 답변을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }

    // 좋아요(답례) 보내기. (고민(worry)을 해결된 상태로 변경)
    const present = await LikeRepository.markWorryAsSolvedAndCreateLike(worryId, commentId, userId, content);

    // 답변 작성자의 별 개수 (remainingStars) +1 추가하기
    const incrementStar = await LikeRepository.incrementStars(worry.commentAuthorId);

    console.log('💛💛💛서비스 - present : ', present);
    console.log('💛💛💛서비스 - lastReply : ', lastReply);

    // 최신 답변 정보를 포함하여 결과 반환
    return {
        present,
        lastReply: lastReply
            ? {
                  commentId: lastReply.commentId, // 혹은 다른 식별자 필드
                  content: lastReply.content,
                  userId: lastReply.userId,
                  createdAt: lastReply.createdAt,
              }
            : null, // 최신 답변이 없을 경우를 대비한 처리
    };
};

// '나의 해결된 고민' 목록 전체 조회 -> '내가 등록한 고민' 목록 전체 조회
export const getSolvedWorriesByUserId = async (userId, page, limit) => {
    return LikeRepository.findSolvedWorriesByUserId(userId, page, limit);
};

// '내가 해결한 고민' 목록 전체 조회 -> '내가 답변한 고민' 목록 전체 조회
export const getHelpedSolveWorriesByUserId = async (userId, page, limit) => {
    return LikeRepository.findHelpedSolveWorriesByUserId(userId, page, limit);
};

// '나의 해결된 고민' 상세 조회 -> '내가 등록한 고민' 상세 조회
export const getSolvedWorryDetailsById = async (worryId, userId) => {
    return LikeRepository.findSolvedWorryDetailsById(worryId, userId);
};

// '내가 해결한 고민' 상세 조회 -> '내가 답변한 고민' 상세 조회
export const getHelpedSolveWorryDetailsById = async (worryId, userId) => {
    return LikeRepository.findHelpedSolveWorryDetailsById(worryId, userId);
};

// 좋아요를 가장 많이 받은 탑 5위 댓글 조회
export const getTopLikedCommentAuthors = async (userId) => {
    return await LikeRepository.findTopLikedCommentAuthors(userId);
};
