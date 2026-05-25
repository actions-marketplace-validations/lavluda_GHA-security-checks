export interface WalkOptions {
    root: string;
    exclude: string[];
    maxFileBytes?: number;
}
export declare function hasFile(root: string, file: string): boolean;
export declare function listFiles(options: WalkOptions): string[];
export declare function listWorkflowFiles(root: string, workflowDir: string): string[];
