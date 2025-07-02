import { attribs, capFirst, xml } from "./xml-utils.js";
import { ASTNode, Proxy, Terminal, astNode, match, oneOf, astClass, astField, astNamedUntypedElm, astEnumValue, astRestrictions, NEWLINE, } from "./parsing.js";
import { z } from "zod";
const XsdGrammarOptionsSchema = z.object({
    schemaName: z.string(),
});
export class XsdGrammar {
    schemaName;
    static FIELD_PROXY = new Proxy();
    constructor(options) {
        const validatedOptions = XsdGrammarOptionsSchema.parse({
            schemaName: options,
        });
        this.schemaName = validatedOptions.schemaName;
    }
    static makeSchemaHandler(schemaName) {
        return (n) => new ASTNode("schema").named(schemaName).addAttribs(n);
    }
    static RESTRICTIONS = [
        "pattern",
        "maxLength",
        "length",
        "minInclusive",
        "maxInclusive",
    ];
    static NUMBER_REGEXP = /(float|integer|double|positiveInteger|negativeInteger|nonNegativeInteger|decimal)/;
    static fieldHandler = (n) => attribs(n)?.type
        ? astNode("Field").addField(n).prop("label4", "fieldHandler")
        : null;
    static topFieldHandler = (n) => {
        const attrs = attribs(n);
        let child = n.firstChild;
        while (child) {
            if (child.nodeType === child.ELEMENT_NODE) {
                if (!/(annotation|documentation)/.test(child.nodeName)) {
                    return null;
                }
            }
            child = child.nextSibling;
        }
        return attrs?.type || attrs?.abstract
            ? astNode("AliasType").addAttribs(n).prop("element", "true")
            : null;
    };
    static attrHandler = (n) => astNode("Field").addField(n).prefixFieldName("$");
    static arrayFldHandler = (n) => attribs(n)?.type && attribs(n)?.maxOccurs === "unbounded"
        ? astNode("ArrField").addField(n).prop("label1", "arrayFldHandler")
        : null;
    static cmpFldHandler = (n) => astField()
        .prop("label2", "cmpFldHandler")
        .addField(n, capFirst(attribs(n)?.name || ""));
    static classHandler = (n) => attribs(n)?.type ? null : astClass(n).prop("label3", "classHandler");
    static classElmHandler = (n) => attribs(n)?.type
        ? null
        : astClass(n).prop("label3", "classElmHandler").prop("element", "true");
    static namedUntypedElmHandler = (n) => attribs(n)?.type || !attribs(n)?.name
        ? null
        : astNamedUntypedElm(n).prop("element", "true");
    static enumerationHandler = (n) => {
        const value = attribs(n)?.value;
        if (!value)
            return null;
        return astEnumValue(n);
    };
    static restrictionHandler = (n) => {
        const nodeName = xml(n).localName;
        if (!this.RESTRICTIONS.includes(nodeName)) {
            return null;
        }
        return attribs(n)?.value ? astRestrictions(n) : null;
    };
    static extensionHandler = (n) => astNode("Extension").addAttribs(n);
    static nrRestrictionHandler = (n) => {
        if (!this.NUMBER_REGEXP.test(attribs(n)?.base || ""))
            return null;
        let child = n.firstChild;
        while (child) {
            if (child.nodeType === child.ELEMENT_NODE) {
                const nodeName = xml(child).localName;
                if (this.RESTRICTIONS.includes(nodeName)) {
                    return astNode("AliasType").prop("value", "number");
                }
            }
            child = child.nextSibling;
        }
        return null;
    };
    static strRestrictionHandler = (n) => {
        if (!/string/.test(attribs(n)?.base || ""))
            return null;
        let child = n.firstChild;
        while (child) {
            if (child.nodeType === child.ELEMENT_NODE) {
                const nodeName = xml(child).localName;
                if (this.RESTRICTIONS.includes(nodeName)) {
                    return astNode("EnumOrAliasType").prop("value", "string");
                }
            }
            child = child.nextSibling;
        }
        return null;
    };
    static dtRestrictionHandler = (n) => /(dateTime|date)/.test(attribs(n)?.base || "")
        ? astNode("AliasType").prop("value", "Date")
        : null;
    static namedGroupHandler = (n) => attribs(n)?.name ? astNode("Group").named(attribs(n)?.name || "") : null;
    static namedSimpleTypeHandler = (n) => attribs(n)?.name ? astNode("SimpleType").named(attribs(n)?.name || "") : null;
    static refGroupHandler = (n) => attribs(n)?.ref
        ? astNode("Fields").prop("ref", attribs(n)?.ref || "")
        : null;
    static refElementHandler = (n) => attribs(n)?.ref ? astNode("Reference").addAttribs(n) : null;
    static extensionMerger = (r1, r2) => {
        if (r1.nodeType === "Extension" && r2.children) {
            if (!r1.children) {
                r1.children = [];
            }
            r1.children = [...r1.children, ...r2.children];
        }
        return r1;
    };
    parse(node) {
        // Create terminals with proper newline handling
        const schema = new Terminal("schema", (n) => {
            const result = XsdGrammar.makeSchemaHandler(this.schemaName)(n);
            if (result) {
                result.prop("separator", NEWLINE);
            }
            return result;
        });
        const simpleType = new Terminal("simpleType", XsdGrammar.namedSimpleTypeHandler);
        const complexType = new Terminal("complexType", XsdGrammar.classHandler);
        const complexContent = new Terminal("complexContent");
        const extension = new Terminal("extension", XsdGrammar.extensionHandler);
        const enumeration = new Terminal("enumeration", XsdGrammar.enumerationHandler);
        const strRestriction = new Terminal("restriction", XsdGrammar.strRestrictionHandler);
        const nrRestriction = new Terminal("restriction", XsdGrammar.nrRestrictionHandler);
        const dtRestriction = new Terminal("restriction", XsdGrammar.dtRestrictionHandler);
        const attrRefGroup = new Terminal("attributeGroup", XsdGrammar.refGroupHandler);
        const attributeGroup = new Terminal("attributeGroup", (n) => {
            const result = XsdGrammar.namedGroupHandler(n);
            if (result) {
                result.prop("separator", NEWLINE);
            }
            return result;
        });
        const refGroup = new Terminal("group", XsdGrammar.refGroupHandler);
        const namedGroup = new Terminal("group", XsdGrammar.namedGroupHandler);
        const refElement = new Terminal("element", XsdGrammar.refElementHandler);
        const fieldElement = new Terminal("element", XsdGrammar.fieldHandler);
        const cmpFldElement = new Terminal("element", XsdGrammar.cmpFldHandler);
        const arrFldElement = new Terminal("element", XsdGrammar.arrayFldHandler);
        const classElement = new Terminal("element", XsdGrammar.classElmHandler);
        const eNamedUntyped = new Terminal("element", XsdGrammar.namedUntypedElmHandler);
        const topFldElement = new Terminal("element", XsdGrammar.topFieldHandler);
        const strPattern = new Terminal("pattern", XsdGrammar.restrictionHandler);
        const strMaxLength = new Terminal("maxLength", XsdGrammar.restrictionHandler);
        const strLength = new Terminal("length", XsdGrammar.restrictionHandler);
        const minInclusive = new Terminal("minInclusive", XsdGrammar.restrictionHandler);
        const maxInclusive = new Terminal("maxInclusive", XsdGrammar.restrictionHandler);
        const classType = new Terminal("complexType:ctype", (n) => {
            const result = XsdGrammar.classHandler(n);
            if (result) {
                result.prop("separator", NEWLINE);
            }
            return result;
        });
        const attribute = new Terminal("attribute:attr", XsdGrammar.attrHandler);
        const sequence = new Terminal("sequence:seq");
        const choice = new Terminal("choice:Choice");
        // Create non-terminals
        const ATTREFGRP = match(attrRefGroup).labeled("ATTRGRP");
        const REFGROUP = match(refGroup).labeled("REF_GROUP");
        const REF_ELM = match(refElement).labeled("REF_ELEMENT");
        const ATTRIBUTE = match(attribute).labeled("ATTRIBUTE");
        const FLD_ELM = match(fieldElement).labeled("FIELD_ELM");
        const CHOICE = match(choice)
            .addChild(REF_ELM)
            .addChild(XsdGrammar.FIELD_PROXY)
            .labeled("CHOICE");
        const ARRFIELD = match(cmpFldElement)
            .addChild(complexType)
            .addChild(sequence)
            .addChild(arrFldElement)
            .labeled("ARRFIELD");
        const CMPFIELD = match(cmpFldElement)
            .addChild(complexType)
            .addChild(sequence)
            .addChild(XsdGrammar.FIELD_PROXY)
            .labeled("CMPFIELD");
        const FIELD = oneOf([
            ARRFIELD,
            CMPFIELD,
            FLD_ELM,
            REFGROUP,
            REF_ELM,
            CHOICE,
        ]).setLabel("FIELD");
        XsdGrammar.FIELD_PROXY.parslet = FIELD;
        const A_CLASS = match(classElement)
            .addChild(complexType)
            .addChildren([ATTRIBUTE, CHOICE, ATTREFGRP])
            .labeled("A_CLASS");
        const E_CLASS = match(classElement)
            .addChild(complexType)
            .addChild(sequence)
            .addChildren([FIELD])
            .labeled("E_CLASS");
        const Z_CLASS = match(classElement).empty().labeled("Z_CLASS");
        const G_CLASS = match(attributeGroup)
            .addChildren([match(attribute)])
            .labeled("G_CLASS");
        const SEQUENCE = match(sequence).addChildren([FIELD]).labeled("SEQUENCE");
        const CCONTENT = match(complexContent)
            .addChild(extension)
            .addChild(sequence, XsdGrammar.extensionMerger)
            .addChildren([FIELD])
            .labeled("CCONTENT");
        const R_CLASS = match(classType)
            .addChildren([REFGROUP, ATTRIBUTE])
            .labeled("R_CLASS");
        const C_CLASS = match(classType)
            .addChildren([SEQUENCE, CCONTENT, REFGROUP, ATTRIBUTE])
            .labeled("C_CLASS");
        const X_CLASS = match(classType)
            .addChild(complexContent)
            .addChild(extension)
            .addChild(sequence)
            .addChildren([FIELD])
            .labeled("X_CLASS");
        const S_CLASS = match(classType).empty().labeled("EMPTY_CLASS");
        const F_CLASS = match(topFldElement).labeled("F_CLASS");
        const N_GROUP = match(namedGroup)
            .addChild(sequence)
            .addChildren([FIELD])
            .labeled("N_GROUP");
        const ENUMELM = match(eNamedUntyped)
            .addChild(simpleType)
            .addChild(strRestriction)
            .addChildren([match(enumeration)])
            .labeled("ENUMELM");
        const ENUMTYPE = match(simpleType)
            .addChild(strRestriction)
            .addChildren([match(enumeration)])
            .labeled("ENUMTYPE");
        const SRESTR = oneOf([
            match(strPattern),
            match(strMaxLength),
            match(strLength),
        ]);
        const NRESTR = oneOf([
            match(strPattern),
            match(minInclusive),
            match(maxInclusive),
            match(strMaxLength),
        ]);
        const ALIAS1 = match(simpleType).addChild(dtRestriction).labeled("ALIAS1");
        const ALIAS2 = match(simpleType)
            .addChild(nrRestriction)
            .addChildren([NRESTR])
            .labeled("ALIAS2");
        const ALIAS3 = match(simpleType)
            .addChild(strRestriction)
            .addChildren([SRESTR])
            .labeled("ALIAS3");
        const ALIAS4 = match(eNamedUntyped)
            .addChild(simpleType)
            .addChild(strRestriction)
            .addChildren([SRESTR])
            .labeled("ALIAS4");
        const ALIAS5 = match(eNamedUntyped)
            .addChild(simpleType)
            .addChild(nrRestriction)
            .addChildren([NRESTR])
            .labeled("ALIAS5");
        const TYPES = oneOf([
            ALIAS1,
            ALIAS2,
            ALIAS3,
            ALIAS4,
            ALIAS5,
            S_CLASS,
            ENUMELM,
            ENUMTYPE,
            E_CLASS,
            C_CLASS,
            X_CLASS,
            N_GROUP,
            G_CLASS,
            A_CLASS,
            R_CLASS,
            Z_CLASS,
            F_CLASS,
        ]);
        const SCHEMA = match(schema).addChildren([TYPES]);
        return SCHEMA.parse(node, "") || new ASTNode("empty");
    }
}
