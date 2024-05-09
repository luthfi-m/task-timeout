import { AsyncTask, createTaskWithTimeout } from "./task-timeout";
import { TimeoutError } from "./timeout-error";

export class TaskRunner<T> {
  private runner: AsyncTask<T>
  private dataQueue: any[] = new Array();
  private isRunning: boolean = false;
  private cleanUp: () => Promise<void>;

  constructor(workerFile: string, timeout: number) {
    const { runner, cleanUp } = createTaskWithTimeout<T>(workerFile, timeout);
    this.runner = runner;
    this.cleanUp = cleanUp;
  }

  private startTask = async(workData: any) => {
    try {
      await this.runner(workData); 
    } catch (error) {
      //TODO: decide on what to do with errors, should we put the work data back to queue?
      if (error instanceof(TimeoutError)) {
        
      }
    }
  }

  private startLoop = async () => {
    this.isRunning = true;
    while (this.dataQueue.length > 0) {
      const workData = this.dataQueue.shift();
      await this.startTask(workData);
    }
    this.isRunning = false;
  }

  add = (data: any) => {
    this.dataQueue.push(data);
    if (this.isRunning) {
      return;
    }
    setImmediate(this.startLoop);
  }

  stop = async () => {
    const sleep = (delay: number) => new Promise((r) => { setTimeout(r, delay)});
    while (this.isRunning) {
      await sleep(500);
    }
    await this.cleanUp();
  }
}
