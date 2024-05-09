import { createWorker } from './task-timeout';
import { sendMessage, cleanUp } from './client';

createWorker(async () => {
  try {
    const result = await sendMessage();
    console.log(result);
    return result;
  } catch (error: any) {
    console.log(error.message);
  }
}, cleanUp);
