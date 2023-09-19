import { WorkQueueExecutor } from './WorkQueueExecutor';

function handlerFunc(arg: string, queueExec: WorkQueueExecutor<string, string>): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("Completed task:  "+arg)
    }, 1000);
  })
}

const testQueue = new WorkQueueExecutor<string, string>(3, 1000, 5, handlerFunc);

try {
  testQueue.addTask('task1');
  //testQueue.addTask('task2');
  testQueue.addTask('task3');
  //testQueue.addTask('task4');
} catch (err) {
  console.log(err);
}

async function main() {
  try {
    const res: string[] = await testQueue.getResults();
    console.log(res);
  } catch (err) {
    console.log(err);
  }
}

main();

