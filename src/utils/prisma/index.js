import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
    // Prisma를 이용해 데이터베이스를 접근할 때, SQL을 출력해줍니다.
    log: [
        {
            emit: 'event',
            level: 'query',
        },
        {
            emit: 'stdout',
            level: 'error',
        },
        {
            emit: 'stdout',
            level: 'info',
        },
        {
            emit: 'stdout',
            level: 'warn',
        },
    ],
}); // PrismaClient 인스턴스를 생성합니다.

prisma.$on('query', (e) => {
    console.log('Query: ' + e.query);
    console.log('Params: ' + e.params);
    console.log('Duration: ' + e.duration + 'ms');
});

// prisma DateTime 타입 한국 시간대로 설정하기
// prisma.$use(async (params, next) => {
//     // 현재 시간을 UTC에서 한국 시간대로 변환
//     const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

//     // Prisma의 create 및 update 작업에 대한 처리
//     if (params.action === 'create' || params.action === 'update') {
//         // params.args.data의 DateTime 속성에 대한 처리
//         Object.keys(params.args.data).forEach((key) => {
//             if (params.args.data[key] instanceof Date) {
//                 params.args.data[key] = new Date(now);
//             }
//         });
//     }

//     // Prisma의 find 작업에 대한 처리
//     if (params.action === 'findMany' || params.action === 'findFirst' || params.action === 'findUnique') {
//         // params.args.where의 DateTime 속성에 대한 처리
//         if (params.args.where) {
//             Object.keys(params.args.where).forEach((key) => {
//                 if (params.args.where[key] instanceof Object && params.args.where[key].hasOwnProperty('DateTime')) {
//                     params.args.where[key] = {
//                         ...params.args.where[key],
//                         DateTime: new Date(now),
//                     };
//                 }
//             });
//         }
//     }

//     return next(params);
// });

// export { prisma };
