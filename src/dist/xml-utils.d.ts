import { Node } from "@xmldom/xmldom";
import { z } from "zod";
declare const XMLAttributesSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    base: z.ZodOptional<z.ZodString>;
    value: z.ZodOptional<z.ZodString>;
    ref: z.ZodOptional<z.ZodString>;
    minOccurs: z.ZodOptional<z.ZodString>;
    maxOccurs: z.ZodOptional<z.ZodString>;
    abstract: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    type?: string | undefined;
    base?: string | undefined;
    value?: string | undefined;
    ref?: string | undefined;
    minOccurs?: string | undefined;
    maxOccurs?: string | undefined;
    abstract?: string | undefined;
}, {
    name?: string | undefined;
    type?: string | undefined;
    base?: string | undefined;
    value?: string | undefined;
    ref?: string | undefined;
    minOccurs?: string | undefined;
    maxOccurs?: string | undefined;
    abstract?: string | undefined;
}>;
export type XMLAttributes = z.infer<typeof XMLAttributesSchema>;
export interface XMLNode extends Node {
    readonly localName: string;
}
export declare function useVerboseLogModus(): void;
export declare function useNormalLogModus(): void;
export declare function log(...params: unknown[]): void;
export declare function findFirstChild(node: Node | null): Node | null;
export declare function findNextSibbling(node: Node | null): Node | null;
export declare function findChildren(node: Node): Node[];
export declare function xml(node: Node): XMLNode;
export declare function capFirst(str: string): string;
export declare function attribs(node: Node | null): XMLAttributes | null;
export {};
