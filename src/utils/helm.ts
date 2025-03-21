import { execPromisified } from "./exec.js";

export async function helmPull({ chartName,chartPath, clipboard, repository, version }: { chartName:string, chartPath: string, clipboard: string, repository: string, version: string }): Promise<string> {
  const cmd = `helm pull oci://${repository}/${chartPath}/${chartName} --version=${version} --destination=${clipboard}`;
  await execPromisified(cmd);
  return `${clipboard}/${chartName}-${version}.tgz`;
}

export async function helmPush({ nestedPath, pushPlugin, repository, tgzPath }: { nestedPath?: string, pushPlugin: string, repository: string, tgzPath: string }): Promise<void> {
  const cmd = `helm ${pushPlugin} ${tgzPath} oci://${repository}${nestedPath ? `/${nestedPath}` : ''}`;
  await execPromisified(cmd);
}