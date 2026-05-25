export interface ToolResult {
    command: string;
    args: string[];
    exitCode: number;
    stdout: string;
    stderr: string;
}
export interface ToolRunner {
    run(command: string, args: string[], options?: {
        cwd?: string;
    }): Promise<ToolResult>;
}
export declare class ChildProcessToolRunner implements ToolRunner {
    run(command: string, args: string[], options?: {
        cwd?: string;
    }): Promise<ToolResult>;
}
