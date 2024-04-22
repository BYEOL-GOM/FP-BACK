import Joi from 'joi';

export const createWorrySchema = Joi.object({
    content: Joi.string().min(1).required(),
    icon: Joi.string().required(),
    fontColor: Joi.string().required(),
    // userId: Joi.number().integer(), // * 로컬에서 테스트 할때(=userId 바디로 넣을때) 이부분 살려서 하지 않으면 '데이터 형식 불일치 오류'가 납니다 :)
});

export const worryIdSchema = Joi.object({
    worryId: Joi.number().integer().required(),
});

export const worryParamsSchema = Joi.object({
    worryId: Joi.number().integer().required(),
    commentId: Joi.number().integer().optional(),
});

export const reportReasonSchema = Joi.object({
    reportReason: Joi.string().min(1).required(),
    // userId: Joi.number().integer(), // * 로컬에서 테스트 할때(=userId 바디로 넣을때) 이부분 살려서 하지 않으면 '신고 이유를 작성해주세요.'오류 가 납니다 :)
});
