import { execPromisified } from "./exec.js";

export type AcrImportOrder = {
  fullSourceTag: string;
  noWait?: boolean;
  password: string;
  targetRegistryName: string;
  targetTag: string;
  username: string;
}

export async function acrImport(order: AcrImportOrder): Promise<void> {
  const { fullSourceTag, noWait = false, password, targetRegistryName, targetTag, username } = order;
  const cmd = `az acr import --name ${targetRegistryName} --source ${fullSourceTag} --image ${targetTag} --username ${username} --password ${password} ${noWait ? '--no-wait' : ''}`;
  await execPromisified(cmd);
}
