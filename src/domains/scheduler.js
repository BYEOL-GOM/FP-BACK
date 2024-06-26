import cron from 'node-cron';
import { deleteOldMessages } from './worries/worry.service.js';

cron.schedule('0 15 * * *', async () => {
    console.log('매일 자정에 오래된 고민 삭제 작업을 시작합니다.');
    try {
        await deleteOldMessages();
        console.log('오래된 고민 삭제 작업이 성공적으로 완료되었습니다.');
    } catch (error) {
        console.error('오래된 고민 삭제 작업 중 오류가 발생했습니다:', error);
    }
});
