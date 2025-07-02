import type { Node } from "@xmldom/xmldom";
import { ASTNode } from "./parsing.js";
import { z } from "zod";
declare const XsdGrammarOptionsSchema: z.ZodObject<{
    schemaName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    schemaName: string;
}, {
    schemaName: string;
}>;
export type XsdGrammarOptions = z.infer<typeof XsdGrammarOptionsSchema>;
export declare class XsdGrammar {
    private readonly schemaName;
    private static readonly FIELD_PROXY;
    constructor(options: XsdGrammarOptions);
    private static makeSchemaHandler;
    private static readonly RESTRICTIONS;
    private static readonly NUMBER_REGEXP;
    private static readonly fieldHandler;
    private static readonly topFieldHandler;
    private static readonly attrHandler;
    private static readonly arrayFldHandler;
    private static readonly cmpFldHandler;
    private static readonly classHandler;
    private static readonly classElmHandler;
    private static readonly namedUntypedElmHandler;
    private static readonly enumerationHandler;
    private static readonly restrictionHandler;
    private static readonly extensionHandler;
    private static readonly nrRestrictionHandler;
    private static readonly strRestrictionHandler;
    private static readonly dtRestrictionHandler;
    private static readonly namedGroupHandler;
    private static readonly namedSimpleTypeHandler;
    private static readonly refGroupHandler;
    private static readonly refElementHandler;
    private static readonly extensionMerger;
    parse(node: Node): ASTNode;
}
export {};
