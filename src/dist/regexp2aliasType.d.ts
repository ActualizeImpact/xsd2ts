import { z } from "zod";
export interface RegExpConstants {
    readonly digits: string;
    readonly a2z: string;
    readonly A2Z: string;
    readonly leestekens: string;
    readonly allW: string;
    readonly allC: string;
}
export declare const constants: RegExpConstants;
export declare class RegExpProcessor {
    static readonly MAX_LENGTH = 100;
    private static readonly MAX_OPTIONS_LENGTH;
    private static readonly CHAR_TYPE;
    private static readonly SPECIALS;
    static buildVariants(optionVariants: string[], series: string[], maxLength: number): string[];
    static makeVariants(optionVariants: string[], series: string, maxLength: number): string[];
    private static invertSeries;
    private static expandRange;
    static char(index: number, pattern: string): [string, number];
    static series(index: number, pattern: string): [string, number];
    static specials(index: number, pattern: string): [string, number];
    static variants(pattern: string, index?: number, maxLength?: number): [string[] | null, number];
}
declare const RegExpOptionsSchema: z.ZodObject<{
    maxLength: z.ZodDefault<z.ZodNumber>;
    type: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: string;
    maxLength: number;
}, {
    type?: string | undefined;
    maxLength?: number | undefined;
}>;
export type RegExpOptions = Partial<z.infer<typeof RegExpOptionsSchema>>;
export declare function regexpPattern2typeAlias(pattern: string, type?: string, options?: RegExpOptions): string;
export {};
