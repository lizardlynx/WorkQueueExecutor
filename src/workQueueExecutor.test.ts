import { WorkQueueExecutor } from './WorkQueueExecutor';


function handlerFunc(arg: string, queueExec: WorkQueueExecutor<string, string>): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("Completed task:  "+arg)
    }, 1000);
  })
}

function handlerFuncComplex(arg: Record<number, string>, queueExec: WorkQueueExecutor<Record<number, string>, number[]>): Promise<number[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const keys = Object.keys(arg).map(el => +el);
      resolve(keys);
    }, 1000);
  })
}

function handlerFuncAddInnerTask(arg: string, queueExec: WorkQueueExecutor<string, string>): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (arg == 'start task') queueExec.addTask('Inner Task'); 
      resolve("Completed task:  "+arg)
    }, 1000);
  })
}

describe('WorkQueueExecutor', () => {
  afterEach(() => {
    jest.clearAllMocks();
  })

  test('capable of working with complex TaskValue and ResultValue (not just strings)', async () => {
    const timeout = 5000;
    const testQueue = new WorkQueueExecutor<Record<number, string>, number[]>(3, timeout, 5, handlerFuncComplex);
    testQueue.addTask({1: '1', 2: '2', 3: '3'});
    const results = await testQueue.getResults();
    expect(results).toEqual([[1, 2, 3]]);
  });

  test('returns all ResultValue-s in same order in which respective TaskValue-s were added', async () => {
    const timeout = 5000;
    const testQueue = new WorkQueueExecutor<string, string>(3, timeout, 5, handlerFunc);
    testQueue.addTask('task1');
    testQueue.addTask('task2');
    testQueue.addTask('task3');
    const results = await testQueue.getResults();
    expect(results).toEqual(['Completed task:  task1', 'Completed task:  task2', 'Completed task:  task3']);
  });


  test('does not work longer than QUEUE_TIMEOUT', async () => {
    const timeout = 50;
    const testQueue = new WorkQueueExecutor<string, string>(3, timeout, 5, handlerFunc);
    testQueue.addTask('task1');
    testQueue.addTask('task2');
    testQueue.addTask('task3');

    await expect(() => testQueue.getResults()).rejects.toEqual(new Error('Timeout!'));
  });

  test('does not accept more elements than QUEUE_SIZE', () => {
    const testQueue = new WorkQueueExecutor<string, string>(3, 1000, 5, handlerFunc);
    testQueue.addTask('task1');
    testQueue.addTask('task2');
    testQueue.addTask('task3');
    expect(() => testQueue.addTask('task4')).toThrow();
  });

  test('does not execute more parallel tasks than MAX_WORKERS_NUM', () => {
    const maxWorkersNum = 2;
    const testQueue = new WorkQueueExecutor<string, string>(5, 1000, maxWorkersNum, handlerFunc);
    testQueue.addTask('task1');
    testQueue.addTask('task2');
    testQueue.addTask('task3');

    testQueue.getResults();
    const tasksRunning = testQueue.getTasksRunning();
    
    expect(tasksRunning.length).toBeLessThanOrEqual(maxWorkersNum);
  });

  function pause(ms: number): Promise<number>{
    return new Promise((resolve, reject) => {
      setTimeout(resolve, ms);
    })
  } 


  test('alex test case - 0', async () => {
    async function handler(arg: string, queue: WorkQueueExecutor<string, string>): Promise<string> {
      await pause(100);
      return `out-${arg}`;
    }
  
    const testQueue = new WorkQueueExecutor<string, string>(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 2, handler);
  
    testQueue.addTask('in-1');
  
    // TODO For some reason there is a timeout here: Error: Timeout!
    await testQueue.getResults();
  });
  
  test('alex test case - 1', async () => {
  
    async function handler(arg: string, queue: WorkQueueExecutor<string, string>): Promise<string> {
      await pause(100);
      return `out-${arg}`;
    }
  
    const testQueue = new WorkQueueExecutor<string, string>(1000, 100000, 2, handler);
    testQueue.addTask('in-1');
    testQueue.addTask('in-2');
    testQueue.addTask('in-3');
    testQueue.addTask('in-4');
    testQueue.addTask('in-5');
    testQueue.addTask('in-6');
  
    const startMs = new Date().getTime();
  
    const res = await testQueue.getResults();
  
    expect(res).toEqual([
      'out-in-1',
      'out-in-2',
      'out-in-3',
      'out-in-4',
      'out-in-5',
      'out-in-6'
    ])
  
    const endMs = new Date().getTime();
    const delta = endMs - startMs;
    expect(delta).toBeGreaterThanOrEqual(300);
  
    // TODO for some reason there is more than 600 ms of delta here, but expected to be ~ 300 (6 tasks * 100ms each / 2 workers)
    expect(delta).toBeLessThanOrEqual(320);
  });
  
  
  test('alex test case - 2', async () => {
  
    async function handler(arg: string, queue: WorkQueueExecutor<string, string>): Promise<string> {
      if (arg === 'in-1') {
        queue.addTask('in-extra');
      }
      await pause(100);
      return `out-${arg}`;
    }
  
    const testQueue = new WorkQueueExecutor<string, string>(100, 10000, 2, handler);
    testQueue.addTask('in-1');
    testQueue.addTask('in-2');
    testQueue.addTask('in-3');
    testQueue.addTask('in-4');
    testQueue.addTask('in-5');
  
    const res = await testQueue.getResults();
  
    // TODO for some reason result is mis-ordered
    expect(res).toEqual([
      'out-in-1',
      'out-in-2',
      'out-in-3',
      'out-in-4',
      'out-in-5',
      'out-in-extra',
    ])
  
  });

});



