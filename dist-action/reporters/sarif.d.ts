import type { ScanResult } from "../core/finding.js";
interface SarifLog {
    version: "2.1.0";
    $schema: string;
    runs: Array<{
        tool: {
            driver: {
                name: string;
                informationUri: string;
                rules: Array<{
                    id: string;
                    name: string;
                    shortDescription: {
                        text: string;
                    };
                    fullDescription: {
                        text: string;
                    };
                    defaultConfiguration: {
                        level: string;
                    };
                }>;
            };
        };
        results: Array<{
            ruleId: string;
            level: string;
            message: {
                text: string;
            };
            locations?: Array<{
                physicalLocation: {
                    artifactLocation: {
                        uri: string;
                    };
                    region?: {
                        startLine: number;
                    };
                };
            }>;
            properties?: Record<string, unknown>;
        }>;
    }>;
}
export declare function writeSarifReport(result: ScanResult, path: string): void;
export declare function toSarif(result: ScanResult): SarifLog;
export {};
