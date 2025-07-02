import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import { XsdGrammar } from "../src/xsd-grammar.js";
import { DOMParser } from "@xmldom/xmldom";
import type { ASTNode, EnumValue } from "../src/parsing.js";

describe("grammar", () => {
  let grammar: XsdGrammar;
  let simpleClassXsd = "";
  let simpleInheritedClassXsd = "";
  let importedClassXsd = "";
  let formXsd: string = "";
  let typesXsd = "";
  let groupXsd = "";
  let elmXsd = "";
  let simpleTypeXsd = "";
  let singleElmXsd = "";
  beforeEach(() => {
    grammar = new XsdGrammar({ schemaName: "Schema" });
    simpleClassXsd = fs.readFileSync("./test/xsd/simpleClass.xsd").toString();
    simpleInheritedClassXsd = fs
      .readFileSync("./test/xsd/simpleInheritedClass.xsd")
      .toString();
    importedClassXsd = fs
      .readFileSync("./test/xsd/importedClass.xsd")
      .toString();
    formXsd = fs.readFileSync("./test/xsd/xep-004.xsd").toString();
    typesXsd = fs.readFileSync("./test/xsd/types.xsd").toString();
    groupXsd = fs.readFileSync("./test/xsd/group.xsd").toString();
    elmXsd = fs.readFileSync("./test/xsd/element.xsd").toString();
    singleElmXsd = fs.readFileSync("./test/xsd/singleElm.xsd").toString();
    simpleTypeXsd = fs.readFileSync("./test/xsd/simpletype.xsd").toString();
  });

  it(" can parse a single elements  ", () => {
    const ast = testGrammar(singleElmXsd);
    const astNode = ast as ASTNode;
    expect(astNode.children.length).toBe(1);
    expect(astNode.children[0].nodeType).toBe("AliasType");
    expect(astNode.children[0].name).toBe("naam");
    expect(astNode.children[0].attr.type).toBe("xs:string");
  });

  it(" can parse a simple class starting with Element ", () => {
    const ast = testGrammar(elmXsd);
    const astNode = ast as ASTNode;
    expect(astNode.children.length).toBe(7);
    expect(astNode.children[0].nodeType).toBe("Class");
    expect(astNode.children[0].name).toBe("Classname");
    expect(astNode.children[0].children).toBeDefined();
    expect(astNode.children[0].children[0].nodeType).toBe("Field");
    expect(astNode.children[0].children[0].attr.fieldName).toBe("intField");
    expect(astNode.children[0].children[0].attr.fieldType).toBe("number");
    expect(astNode.children[0].children[1].nodeType).toBe("Field");
    expect(astNode.children[0].children[1].attr.fieldName).toBe("dateField");
    expect(astNode.children[0].children[1].attr.fieldType).toBe("Date");

    expect(astNode.children[0].children[2].nodeType).toBe("Field");
    expect(astNode.children[0].children[2].attr.fieldName).toBe("things");
    expect(astNode.children[0].children[2].attr.fieldType).toBe("Things");

    expect(astNode.children[2].children[0].nodeType).toBe("Field");
    expect(astNode.children[2].children[0].attr.fieldName).toBe("show?");
    expect(astNode.children[2].children[0].attr.fieldType).toBe("Show[]");

    expect(astNode.children[6].nodeType).toBe("AliasType");
    expect(astNode.children[6].attr.type).toBe("xs:string");
    expect(astNode.children[6].attr.element).toBe("true");
    expect(astNode.children[6].name).toBe("xxx");
  });

  it(" can parse a simple class starting with complexType", () => {
    const ast = testGrammar(simpleClassXsd);
    const astNode = ast as ASTNode;
    expect(astNode.children.length).toBe(2);
    expect(astNode.children[0].nodeType).toBe("AliasType");
    expect(astNode.children[0].name).toBe("test");
    expect(astNode.children[1].nodeType).toBe("Class");
    expect(astNode.children[1].name).toBe("Test");
    expect(astNode.children[1].children).toBeDefined();
    expect(astNode.children[1].children[0].nodeType).toBe("Field");
    expect(astNode.children[1].children[0].attr.fieldName).toBe("intField");
    expect(astNode.children[1].children[0].attr.fieldType).toBe("number");
  });

  it(" can parse a simple class starting with an imported type namspace", () => {
    const ast = testGrammar(importedClassXsd);
    const astNode = ast as ASTNode;
    expect(astNode.children.length).toBe(1);
    expect(astNode.children[0].nodeType).toBe("Class");
    expect(astNode.children[0].name).toBe("Test");
    expect(astNode.children[0].children).toBeDefined();
    expect(astNode.children[0].children[0].nodeType).toBe("Field");
    expect(astNode.children[0].children[0].attr.fieldName).toBe("firstName");
    expect(astNode.children[0].children[0].attr.fieldType).toBe("string");
    expect(astNode.children[0].children[2].nodeType).toBe("Field");
    expect(astNode.children[0].children[2].attr.fieldName).toBe("imported");
    expect(astNode.children[0].children[2].attr.fieldType).toBe("dep.Node");
  });

  it(" can parse a simple simple Inherited Class", () => {
    const ast = testGrammar(simpleInheritedClassXsd);
    const astNode = ast as ASTNode;
    expect(astNode.children.length).toBe(2);
    expect(astNode.children[0].nodeType).toBe("Class");
    expect(astNode.children[0].name).toBe("InheridedClass");
    expect(astNode.children[0].children).toBeDefined();
    expect(astNode.children[0].children[0].nodeType).toBe("Field");
    expect(astNode.children[0].children[0].attr.fieldName).toBe("nestedFields");
    expect(astNode.children[0].children[0].attr.fieldType).toBe("NestedFields");
    expect(astNode.children[0].children[2].nodeType).toBe("Field");
    expect(astNode.children[0].children[2].attr.fieldName).toBe("dateField");
    expect(astNode.children[0].children[2].attr.fieldType).toBe("Date");
  });

  it(" can parse a simple enumeration and simpletypes starting with element", () => {
    const ast = testGrammar(simpleTypeXsd);
    const astNode = ast as ASTNode;
    expect(astNode.children[0].nodeType).toBe("AliasType");
    expect(astNode.children[0].name).toBe("age1");
    expect(astNode.children[0].attr.type).toBe("number");

    expect(astNode.children[1].nodeType).toBe("AliasType");
    expect(astNode.children[1].name).toBe("age2");
    expect(astNode.children[1].attr.type).toBe("number");

    expect(astNode.children[2].nodeType).toBe("Enumeration");
    expect(astNode.children[2].name).toBe("option");
    expect(astNode.children[2].attr.values).toBeDefined();
    expect((astNode.children[2].attr.values as EnumValue[])[0].value).toBe("A");
    expect((astNode.children[2].attr.values as EnumValue[])[1].value).toBe("B");
  });

  it(" can parse a group tag", () => {
    const ast = testGrammar(groupXsd);
    const astNode = ast as ASTNode;
    expect(astNode.children[0].nodeType).toBe("Group");
    expect(astNode.children[0].name).toBe("custGroup");
    expect(astNode.children[1].nodeType).toBe("AliasType");
    expect(astNode.children[1].name).toBe("order");
    expect(astNode.children[2].nodeType).toBe("Class");
    expect(astNode.children[2].name).toBe("Ordertype");
  });

  it(" can parse an attribute group tag", () => {
    const ast = testGrammar(typesXsd);
    const astNode = ast as ASTNode;
    expect(astNode.children[0].nodeType).toBe("Group");
    expect(astNode.children[0].name).toBe("BaseView");
    expect(astNode.children[1].nodeType).toBe("Class");
    expect(astNode.children[1].name).toBe("View");
  });

  it("parses form XSD correctly", () => {
    const xmlDom = new DOMParser().parseFromString(formXsd, "application/xml");
    const xmlNode = xmlDom.documentElement;
    if (!xmlNode) throw new Error("Failed to parse XML");

    const result = grammar.parse(xmlNode);
    expect(result).toBeDefined();
    expect(result.classes?.length).toBeGreaterThan(0);
    expect(result.classes?.some((c) => c.name === "Form")).toBe(true);
  });
});

function testGrammar(elmXsd: string): ASTNode {
  const grammar = new XsdGrammar({ schemaName: "Schema" });
  const xmlDom = new DOMParser().parseFromString(elmXsd, "application/xml");
  const xmlNode = xmlDom.documentElement;
  if (!xmlNode) throw new Error("Failed to parse XML");

  const ast = grammar.parse(xmlNode);
  console.log("\n-----\nast:", JSON.stringify(ast || "", null, " "));
  expect(ast).toBeDefined();
  expect(ast.nodeType).toBe("schema");
  return ast;
}
