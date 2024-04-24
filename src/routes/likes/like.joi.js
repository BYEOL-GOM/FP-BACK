import Joi from 'joi';

// 답례 보내기의 유효성 검증 스키마 정의
export const likeSchema = Joi.object({
    worryId: Joi.number().integer().required(),
    commentId: Joi.number().integer().required(),
    content: Joi.string().min(1).required(),
});

// 보관함의 상세 조회를 위한 스키마
export const worryIdSchema = Joi.object({
    worryId: Joi.number().integer().min(1).required(), // worryId가 1 이상의 정수여야 함
});
