import type { Node } from "@xmldom/xmldom";
import { z } from "zod";
export declare const UNBOUNDED: "unbounded";
export type FindNextNode = (n: Node) => Node;
export type AstNodeFactory = (n: Node) => ASTNode | null;
export type AstNodeMerger = (r1: ASTNode, r2: ASTNode) => ASTNode;
declare const FieldTypeSchema: z.ZodObject<{
    type: z.ZodString;
    namespace: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: string;
    namespace?: string | undefined;
}, {
    type: string;
    namespace?: string | undefined;
}>;
export type FieldType = z.infer<typeof FieldTypeSchema>;
export declare function astNode(s: string): ASTNode;
export declare const NEWLINE = "\n";
export declare function astClass(n?: Node): ASTNode;
export declare function astNamedUntypedElm(n: Node): ASTNode;
export declare function astEnumValue(n: Node): ASTNode;
export declare function astRestrictions(n: Node): ASTNode;
export declare function astField(): ASTNode;
export interface Parslet {
    parse(node: Node, indent?: string): ASTNode | null;
}
export declare function match(terminal: Terminal, merger?: AstNodeMerger): Matcher;
export interface IParsable {
    parse(node: Node, indent?: string): ASTNode | null;
}
export interface Attribs {
    [key: string]: string | ASTNode[] | string[] | EnumValue[];
}
export interface EnumValue {
    value: string;
}
export declare class ASTNode {
    nodeType: string;
    name: string;
    private readonly _attr;
    children: ASTNode[];
    classes?: ASTNode[];
    constructor(type: string);
    prop(key: string, value: unknown): this;
    named(name: string): this;
    prefixFieldName(prefix: string): this;
    addName(node: Node, prefix?: string): this;
    addField(node: Node, fldType?: string): this;
    get attr(): Readonly<Attribs>;
    addAttribs(n: Node): this;
    addEnumValue(value: string): this;
    merge(other: ASTNode): ASTNode;
}
export declare class Terminal implements Parslet {
    private readonly name;
    private readonly factory?;
    readonly label: string;
    constructor(name: string, factory?: AstNodeFactory);
    parse(node: Node, indent?: string): ASTNode | null;
}
export declare class OneOf implements Parslet {
    private readonly name;
    private readonly options;
    private _label?;
    constructor(name: string, options: Parslet[]);
    setLabel(label: string): this;
    parse(node: Node, indent?: string): ASTNode | null;
}
export declare class Matcher implements Parslet {
    private readonly name;
    private readonly terminal;
    private readonly defaultMerger?;
    private readonly _children;
    private _label?;
    constructor(name: string, terminal: Terminal, defaultMerger?: AstNodeMerger);
    labeled(label: string): this;
    addChild(parslet: Parslet, merger?: AstNodeMerger): this;
    addChildren(parslets: Parslet[] | Parslet): this;
    empty(): this;
    parse(node: Node, indent?: string): ASTNode | null;
}
export declare class Proxy implements IParsable {
    parslet?: IParsable;
    parse(node: Node, indent?: string): ASTNode | null;
}
export declare function getFieldType(type: string, defNs: string | null): string;
export declare function oneOf(options: Parslet[]): OneOf;
export declare function hasAttribute(node: Node, attr: string): boolean;
export {};
