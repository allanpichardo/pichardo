import {spawn} from 'node:child_process';

const children = new Set<ReturnType<typeof spawn>>();
let stopped = false;
export function stopMediaProcesses() {
  stopped = true;
  for (const child of children) child.kill('SIGKILL');
}
let workerGuard: (() => Promise<void>) | undefined;
export function setWorkerGuard(guard: () => Promise<void>) {
  workerGuard = guard;
}
export async function assertWorkerActive() {
  if (workerGuard) await workerGuard();
  if (stopped) throw new Error('Media worker has stopped.');
}
export async function runProcess(
  command: string,
  args: string[],
  timeout = 60 * 60 * 1000,
): Promise<string> {
  await assertWorkerActive();
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']});
    children.add(child);
    let output = '';
    let error = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeout);
    child.stdout.on('data', (chunk: Buffer) => {
      if (output.length < 2_000_000) output += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      error = (error + chunk.toString()).slice(-8000);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timer);
      children.delete(child);
      if (code === 0) resolve(output);
      else
        reject(
          new Error(`${command} failed (${code ?? 'terminated'}): ${error}`),
        );
    });
  });
}
