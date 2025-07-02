import type { GeneratorOptions } from "../index.js";
export declare class XSDParseError extends Error {
    readonly xsdPath: string;
    constructor(message: string, xsdPath: string);
}
export declare class GenerationError extends Error {
    readonly cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
export declare function verbose(): void;
export declare function generateTemplateClassesFromXSD(xsdFilePath: string, dependencies?: Map<string, string>, options?: GeneratorOptions): Promise<void>;
