import { spawn } from "node:child_process";

export interface ToolResult {
  command: string;
  args: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface ToolRunner {
  run(command: string, args: string[], options?: { cwd?: string }): Promise<ToolResult>;
}

export class ChildProcessToolRunner implements ToolRunner {
  run(command: string, args: string[], options: { cwd?: string } = {}): Promise<ToolResult> {
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd: options.cwd,
        shell: false,
        windowsHide: true
      });

      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];

      child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
      child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));

      child.on("error", (error) => {
        resolve({
          command,
          args,
          exitCode: 127,
          stdout: "",
          stderr: error.message
        });
      });

      child.on("close", (exitCode) => {
        resolve({
          command,
          args,
          exitCode: exitCode ?? 1,
          stdout: Buffer.concat(stdout).toString("utf8"),
          stderr: Buffer.concat(stderr).toString("utf8")
        });
      });
    });
  }
}
