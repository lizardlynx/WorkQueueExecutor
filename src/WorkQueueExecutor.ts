export class WorkQueueExecutor<TV, RV> {
  private queue: TV[] = [];
  private queueSize: number;
  private queueTimeout: number;
  private maxWorkersNum: number;
  private jobHandlerFunction: (arg: TV, queueExec: WorkQueueExecutor<TV, RV>) => Promise<RV>;
  private executorsPollTaken: number = 0;
  private results: RV[] = [];
  private tasksInPoll: Promise<RV>[] = [];
  private emptyPoll = false;
  
  constructor(queueSize: number, queueTimeout: number, maxWorkersNum: number, jobHandlerFunction: (arg: TV, queueExec: WorkQueueExecutor<TV, RV>) => Promise<RV>) {
    this.queueSize = queueSize;
    if (queueTimeout > 2147483647) this.queueTimeout = 2147483647;
    else this.queueTimeout = queueTimeout;
    
    this.maxWorkersNum = maxWorkersNum;
    this.jobHandlerFunction = jobHandlerFunction; 
  }

  public getTasksRunning(): Promise<RV>[] {
    return this.tasksInPoll;
  }

  private addTaskToPoll(task: TV): void { 
    this.executorsPollTaken++;
    const promise = this.jobHandlerFunction(task, this);
    this.tasksInPoll.push(promise);
    promise.then(res => {
      this.results.push(res);
      this.executorsPollTaken--;
      this.getNextTask();
    });
  }

  private getNextTask(): TV | null {    
    if (this.queue.length > 0) {
      const task = this.queue.splice(0, 1)[0];
      this.addTaskToPoll(task);
    }
    if (this.executorsPollTaken == 0)
      this.emptyPoll = true;
    return null;
  }

  private initPoll() {
    this.emptyPoll = false;
    for (let i = 0; i < this.maxWorkersNum; i++)
      this.getNextTask();
  }

  public addTask(task: TV): void {
    if (this.queue.length == this.queueSize) {
      throw new Error('Queue is full! Cannot accept task.');
    }
    this.queue.push(task);
  }

  private async notifier(): Promise<boolean> {    
    do {
      await Promise.allSettled(this.tasksInPoll);
    } while(!this.emptyPoll);
    return true;
  }

  public async getResults(): Promise<RV[]> {
    this.initPoll();
    try {
      await Promise.race([this.notifier(), this.timeoutPromise()]);
      return this.results;  
    } catch (err) {
      throw new Error('Timeout!')
    }
  }
  
  private timeoutPromise(): Promise<void> {
    return new Promise((resolve, reject) => {  
      const timeout = this.queueTimeout;
      setTimeout(() => reject('Timeout'), timeout);
    });
  }
}
