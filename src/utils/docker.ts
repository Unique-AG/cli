import { execPromisified } from "./exec.js";

export async function dockerPull(fullSourceTag: string): Promise<void> {
  const cmd = `docker pull --platform linux/amd64 ${fullSourceTag}`;
  await execPromisified(cmd);
}

export async function dockerMove(fullSourceTag: string, fullTargetTag: string): Promise<void> {
  const cmd = `docker tag ${fullSourceTag} ${fullTargetTag}`;
  await execPromisified(cmd);
}

export async function dockerPush(fullTargetTag: string): Promise<void> {
  const cmd = `docker push ${fullTargetTag}`;
  await execPromisified(cmd);
}