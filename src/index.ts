import path from 'node:path';
import { Elysia } from "elysia";
import { sendMessage } from "./client";
import { TaskRunner } from './task-runner';

const runner = new TaskRunner(path.resolve(__dirname, 'worker.ts'), 500);
const app = new Elysia();

app.get("/", handler);
app.get('/worker', handlerWorker);

app.listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

function handler() {
  setImmediate(sendMessage);
  return '';
}

function handlerWorker(s){
  runner.add(s.body);
}

process.on('SIGINT', async (s) => {
  await app.stop();
  await runner.stop();
  console.log('safe shutdown');
  process.exit(0);
});
