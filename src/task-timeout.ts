/* eslint-disable @typescript-eslint/no-explicit-any */
import { Worker, parentPort } from 'node:worker_threads';
import { TimeoutError } from './timeout-error';

export type AsyncTask<T> = (...args: any) => Promise<T>;

interface WorkerResult<T> {
  result?: T;
  error?: unknown;
}

enum MessageTypes {
  StartTask,
  Result,
  Shutdown,
  ShutdownCompleted
}

interface WorkerMessage {
  messageType: MessageTypes;
  data: unknown;
}

type TaskCallback<T> = (value: WorkerResult<T>) => void;

function createWorkerThread<T>(workerFile: string, callback: TaskCallback<T>) {
  const worker = new Worker(workerFile);
  worker.on('message', (workerMessage: WorkerMessage) => {
    switch(workerMessage.messageType) {
      case MessageTypes.Result:
        const workerResult = workerMessage.data as WorkerResult<T>;

        //notify our promise
        callback(workerResult);
        break;
    }
  });

  return worker;
}

/**
 * creates a promise with timeout support
 * @param workerFile script file containing the task to run wrapped in createWorker
 * @param timeout the task timeout in ms
 * @returns the wrapped task function as a promise
 */
export function createTaskWithTimeout<T>(
  workerFile: string,
  timeout: number
): { runner: AsyncTask<T>, cleanUp: () => Promise<void>} {
  let worker: Worker;
  
  const cleanUp = () => new Promise<void>((resolve) => {
    console.log('clean up');
    if (worker) {
      worker.on('message', (msg) => {
        if (msg.messageType === MessageTypes.ShutdownCompleted) {
          resolve();
        }
      });

      console.log('start cleaning');
      worker.postMessage({ messageType: MessageTypes.Shutdown});
    } else {
      resolve();
    }
  });

  const fn: AsyncTask<T> = (...args) =>
    new Promise<T>((resolve, reject) => {
      // pass args to worker thread
      // wait for message event from worker thread
      // resolve/reject with result
      let timerId: number;
      const resultCallback = (workerResult: WorkerResult<T>) => {
        if (timerId) {
          clearTimeout(timerId);
          timerId = 0;
        }
        if (workerResult) {
          if (workerResult.error) {
            reject(workerResult.error);
          } else {
            resolve(workerResult.result as unknown as T);
          }
        }
      };

      worker = createWorkerThread(workerFile, resultCallback);
      
      const msg: WorkerMessage = {
        messageType: MessageTypes.StartTask,
        data: args,
      };
      // start the task
      worker.postMessage(msg);

      // setup timeout
      timerId = setTimeout(() => {
        console.log('timeout');
        // terminate worker
        worker.terminate().then(() => {
          // recreate worker
          worker = createWorkerThread(workerFile, resultCallback);
        });
        timerId = 0;
        reject(new TimeoutError('Task timeout exceeded'));
      }, timeout) as unknown as number;
    });


  return { runner: fn, cleanUp};
}

/**
 * create worker thread handler to be run within the worker
 * @param task async background function to run
 */
export function createWorker<T>(task: AsyncTask<T>, cleanUp: () => Promise<void> | undefined) {
  parentPort?.on('message', async (msg: WorkerMessage) => {
    switch (msg.messageType) {
      case MessageTypes.StartTask:
        const args = msg.data as any[];
        let taskResult: WorkerResult<T>;
        try {
          taskResult = { result: await task(...args) };
        } catch (error: unknown) {
          taskResult = { result: undefined, error };
        }
    
        const resultMsg: WorkerMessage = {
          messageType: MessageTypes.Result,
          data: taskResult,
        };
        parentPort?.postMessage(resultMsg);
        break;

      case MessageTypes.Shutdown:
        console.log('here');
        if (cleanUp) {
          await cleanUp();
        }
        parentPort?.postMessage({ messageType: MessageTypes.ShutdownCompleted});
        break;
    }
  });
}
