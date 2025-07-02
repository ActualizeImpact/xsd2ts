import type { Node } from "@xmldom/xmldom";
import { attribs, capFirst, xml } from "./xml-utils.js";
import {
  ASTNode,
  Proxy,
  AstNodeFactory,
  Terminal,
  AstNodeMerger,
  astNode,
  match,
  oneOf,
  astClass,
  astField,
  astNamedUntypedElm,
  astEnumValue,
  astRestrictions,
  NEWLINE,
} from "./parsing.js";
import { z } from "zod";

const XsdGrammarOptionsSchema = z.object({
  schemaName: z.string(),
});

export type XsdGrammarOptions = z.infer<typeof XsdGrammarOptionsSchema>;

export class XsdGrammar {
  private readonly schemaName: string;
  private static readonly FIELD_PROXY = new Proxy();

  constructor(options: XsdGrammarOptions) {
    const validatedOptions = XsdGrammarOptionsSchema.parse(options);
    this.schemaName = validatedOptions.schemaName;
  }

  private static makeSchemaHandler(schemaName: string): AstNodeFactory {
    return (n: Node) => new ASTNode("schema").named(schemaName).addAttribs(n);
  }

  private static readonly RESTRICTIONS = [
    "pattern",
    "maxLength",
    "length",
    "minInclusive",
    "maxInclusive",
  ] as const;

  private static readonly NUMBER_REGEXP =
    /(float|integer|double|positiveInteger|negativeInteger|nonNegativeInteger|decimal)/;

  private static readonly fieldHandler: AstNodeFactory = (n: Node) => {
    const attrs = attribs(n);
    return attrs?.type
      ? astNode("Field")
          .addField(n)
          .prop("label4", "fieldHandler")
          .prop("type", attrs.type)
          .prop("name", attrs.name || "")
      : null;
  };

  private static readonly topFieldHandler: AstNodeFactory = (n: Node) => {
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

  private static readonly attrHandler: AstNodeFactory = (n: Node) =>
    astNode("Field").addField(n).prefixFieldName("$");

  private static readonly arrayFldHandler: AstNodeFactory = (n: Node) =>
    attribs(n)?.type && attribs(n)?.maxOccurs === "unbounded"
      ? astNode("ArrField").addField(n).prop("label1", "arrayFldHandler")
      : null;

  private static readonly cmpFldHandler: AstNodeFactory = (n: Node) =>
    astField()
      .prop("label2", "cmpFldHandler")
      .addField(n, capFirst(attribs(n)?.name || ""));

  private static readonly classHandler: AstNodeFactory = (n: Node) => {
    const attrs = attribs(n);
    return attrs?.type
      ? null
      : astClass(n)
          .prop("label3", "classHandler")
          .prop("type", attrs?.type)
          .prop("name", attrs?.name || "");
  };

  private static readonly classElmHandler: AstNodeFactory = (n: Node) =>
    attribs(n)?.type
      ? null
      : astClass(n).prop("label3", "classElmHandler").prop("element", "true");

  private static readonly namedUntypedElmHandler: AstNodeFactory = (n: Node) =>
    attribs(n)?.type || !attribs(n)?.name
      ? null
      : astNamedUntypedElm(n).prop("element", "true");

  private static readonly enumerationHandler: AstNodeFactory = (n: Node) => {
    const value = attribs(n)?.value;
    if (!value) return null;
    return astEnumValue(n);
  };

  private static readonly restrictionHandler: AstNodeFactory = (n: Node) => {
    const nodeName = xml(n).localName;
    if (
      !this.RESTRICTIONS.includes(
        nodeName as (typeof this.RESTRICTIONS)[number]
      )
    ) {
      return null;
    }
    return attribs(n)?.value ? astRestrictions(n) : null;
  };

  private static readonly extensionHandler: AstNodeFactory = (n: Node) =>
    astNode("Extension").addAttribs(n);

  private static readonly nrRestrictionHandler: AstNodeFactory = (n: Node) => {
    if (!this.NUMBER_REGEXP.test(attribs(n)?.base || "")) return null;

    let child = n.firstChild;
    while (child) {
      if (child.nodeType === child.ELEMENT_NODE) {
        const nodeName = xml(child).localName;
        if (
          this.RESTRICTIONS.includes(
            nodeName as (typeof this.RESTRICTIONS)[number]
          )
        ) {
          return astNode("AliasType").prop("value", "number");
        }
      }
      child = child.nextSibling;
    }
    return null;
  };

  private static readonly strRestrictionHandler: AstNodeFactory = (n: Node) => {
    if (!/string/.test(attribs(n)?.base || "")) return null;

    let child = n.firstChild;
    while (child) {
      if (child.nodeType === child.ELEMENT_NODE) {
        const nodeName = xml(child).localName;
        if (
          this.RESTRICTIONS.includes(
            nodeName as (typeof this.RESTRICTIONS)[number]
          )
        ) {
          return astNode("EnumOrAliasType").prop("value", "string");
        }
      }
      child = child.nextSibling;
    }
    return null;
  };

  private static readonly dtRestrictionHandler: AstNodeFactory = (n: Node) =>
    /(dateTime|date)/.test(attribs(n)?.base || "")
      ? astNode("AliasType").prop("value", "Date")
      : null;

  private static readonly namedGroupHandler: AstNodeFactory = (n: Node) =>
    attribs(n)?.name ? astNode("Group").named(attribs(n)?.name || "") : null;

  private static readonly namedSimpleTypeHandler: AstNodeFactory = (n: Node) =>
    attribs(n)?.name
      ? astNode("SimpleType").named(attribs(n)?.name || "")
      : null;

  private static readonly refGroupHandler: AstNodeFactory = (n: Node) =>
    attribs(n)?.ref
      ? astNode("Fields").prop("ref", attribs(n)?.ref || "")
      : null;

  private static readonly refElementHandler: AstNodeFactory = (n: Node) =>
    attribs(n)?.ref ? astNode("Reference").addAttribs(n) : null;

  private static readonly extensionMerger: AstNodeMerger = (r1, r2) => {
    if (r1.nodeType === "Extension" && r2.children) {
      if (!r1.children) {
        r1.children = [];
      }
      r1.children = [...r1.children, ...r2.children];
    }
    return r1;
  };

  private static readonly sequenceHandler: AstNodeFactory = (n: Node) => {
    const result = astNode("Sequence");
    result.children = [];

    let child = n.firstChild;
    while (child) {
      if (child.nodeType === child.ELEMENT_NODE) {
        const attrs = attribs(child);
        if (attrs?.name) {
          result.children.push(
            astNode("Field")
              .prop("name", attrs.name)
              .prop("type", attrs.type || "xs:string")
              .prop("maxOccurs", attrs.maxOccurs)
              .prop("minOccurs", attrs.minOccurs)
          );
        }
      }
      child = child.nextSibling;
    }
    return result;
  };

  public parse(node: Node): ASTNode {
    // Create terminals with proper newline handling
    const schema = new Terminal("schema", (n: Node) => {
      const result = XsdGrammar.makeSchemaHandler(this.schemaName)(n);
      if (result) {
        result.prop("separator", NEWLINE);
      }
      return result;
    });
    const simpleType = new Terminal(
      "simpleType",
      XsdGrammar.namedSimpleTypeHandler
    );
    const complexType = new Terminal("complexType", XsdGrammar.classHandler);
    const complexContent = new Terminal("complexContent");
    const extension = new Terminal("extension", XsdGrammar.extensionHandler);
    const enumeration = new Terminal(
      "enumeration",
      XsdGrammar.enumerationHandler
    );
    const strRestriction = new Terminal(
      "restriction",
      XsdGrammar.strRestrictionHandler
    );
    const nrRestriction = new Terminal(
      "restriction",
      XsdGrammar.nrRestrictionHandler
    );
    const dtRestriction = new Terminal(
      "restriction",
      XsdGrammar.dtRestrictionHandler
    );
    const attrRefGroup = new Terminal(
      "attributeGroup",
      XsdGrammar.refGroupHandler
    );
    const attributeGroup = new Terminal("attributeGroup", (n: Node) => {
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
    const eNamedUntyped = new Terminal(
      "element",
      XsdGrammar.namedUntypedElmHandler
    );
    const topFldElement = new Terminal("element", XsdGrammar.topFieldHandler);
    const strPattern = new Terminal("pattern", XsdGrammar.restrictionHandler);
    const strMaxLength = new Terminal(
      "maxLength",
      XsdGrammar.restrictionHandler
    );
    const strLength = new Terminal("length", XsdGrammar.restrictionHandler);
    const minInclusive = new Terminal(
      "minInclusive",
      XsdGrammar.restrictionHandler
    );
    const maxInclusive = new Terminal(
      "maxInclusive",
      XsdGrammar.restrictionHandler
    );
    const classType = new Terminal("complexType:ctype", (n: Node) => {
      const result = XsdGrammar.classHandler(n);
      if (result) {
        result.prop("separator", NEWLINE);
      }
      return result;
    });
    const attribute = new Terminal("attribute:attr", XsdGrammar.attrHandler);
    const sequence = new Terminal("sequence", XsdGrammar.sequenceHandler);
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

    const SEQUENCE = match(sequence)
      .addChildren([FIELD])
      .labeled("SEQUENCE")
      .setHandler((n: Node) => {
        const result = astNode("Sequence");
        result.children = [];
        const children = xml(n).childNodes;
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          if (
            child &&
            child.nodeType === child.ELEMENT_NODE &&
            child.nodeName === "sequence"
          ) {
            let seqChild = child.firstChild;
            while (seqChild) {
              if (seqChild.nodeType === seqChild.ELEMENT_NODE) {
                const attrs = attribs(seqChild);
                if (attrs?.name && attrs?.type) {
                  result.children.push(
                    astNode("Field")
                      .prop("name", attrs.name)
                      .prop("type", attrs.type)
                      .prop("maxOccurs", attrs.maxOccurs)
                      .prop("minOccurs", attrs.minOccurs)
                  );
                }
              }
              seqChild = seqChild.nextSibling;
            }
          }
        }
        return result;
      });

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
      .labeled("C_CLASS")
      .setHandler((n: Node) => {
        const result = astClass(n);
        result.children = [];

        // Process sequence children
        const children = xml(n).childNodes;
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          if (
            child &&
            child.nodeType === child.ELEMENT_NODE &&
            child.nodeName === "sequence"
          ) {
            let seqChild = child.firstChild;
            while (seqChild) {
              if (seqChild.nodeType === seqChild.ELEMENT_NODE) {
                const attrs = attribs(seqChild);
                if (attrs?.name && attrs?.type) {
                  result.children.push(
                    astNode("Field")
                      .prop("name", attrs.name)
                      .prop("type", attrs.type)
                      .prop("maxOccurs", attrs.maxOccurs)
                      .prop("minOccurs", attrs.minOccurs)
                  );
                }
              }
              seqChild = seqChild.nextSibling;
            }
          }
        }

        return result;
      });

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
