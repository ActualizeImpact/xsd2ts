import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import { ClassGenerator } from "../src/classGenerator.js";
import { log } from "../src/xml-utils.js";
import type { SourceFile, ClassDeclaration } from "ts-morph";

let logClassDef = function (result: SourceFile) {
  log("\n----- classdef --------\n");
  log(result.getText());
  log("\n-----------------------\n");
  result.getClasses().forEach((c) => {
    log(c.getName());
  });
  console.log("\n-------------\n");
};

describe("ClassGenerator", () => {
  let generator: ClassGenerator;
  let simpleClassXsd = "";
  let simpleInheritedClassXsd = "";
  let importedClassXsd = "";
  let formXsd: string = "";
  let typesXsd = "";
  let groupXsd = "";
  let elmXsd = "";
  let choiceXsd = "";
  let simpleTypeXsd = "";
  let singleElmXsd = "";
  let targetnamespace = "";
  beforeEach(() => {
    generator = new ClassGenerator();
    simpleClassXsd = fs.readFileSync("./test/xsd/simpleClass.xsd").toString();
    simpleInheritedClassXsd = fs
      .readFileSync("./test/xsd/simpleInheritedClass.xsd")
      .toString();
    importedClassXsd = fs
      .readFileSync("./test/xsd/importedClass.xsd")
      .toString();
    formXsd = fs.readFileSync("./test/xsd/xep-004.xsd").toString();
    choiceXsd = fs.readFileSync("./test/xsd/choice.xsd").toString();
    typesXsd = fs.readFileSync("./test/xsd/types.xsd").toString();
    groupXsd = fs.readFileSync("./test/xsd/group.xsd").toString();
    elmXsd = fs.readFileSync("./test/xsd/element.xsd").toString();
    singleElmXsd = fs.readFileSync("./test/xsd/singleElm.xsd").toString();
    simpleTypeXsd = fs.readFileSync("./test/xsd/simpletype.xsd").toString();
    targetnamespace = fs
      .readFileSync("./test/xsd/targetnamespace.xsd")
      .toString();
  });

  it("has a working constructor", () => {
    expect(generator).toBeDefined();
  });

  it("has a generateClassFile method", () => {
    expect(generator.generateClassFile).toBeDefined();
  });

  it("has a types property", () => {
    expect(generator.types).toBeDefined();
  });

  it("returns an empty class array for an empty string", () => {
    const result = generator.generateClassFile("");
    expect(result.getClasses().length).toBe(0);
  });

  it("returns a simple class file", () => {
    const result = generator.generateClassFile(simpleClassXsd);
    logClassDef(result);
    expect(result.getClasses().length).toBe(3);
  });

  it("returns an inherited class file", () => {
    const result = generator.generateClassFile(simpleInheritedClassXsd);
    logClassDef(result);
    expect(result.getClasses().length).toBe(6);
    const test = result.getClass("InheridedClass");
    log(test?.getText());
    expect(test).toBeDefined();
    expect(test?.getExtends()?.getText()).toBe("Base");
    expect(test?.getProperty("intField")).toBeDefined();
    expect(test?.getProperty("dateField")).toBeDefined();
    expect(test?.getConstructors().length).toBeGreaterThan(0);
    expect(test?.getProperty("dateField")?.getType().isArray()).toBe(false);
    expect(test?.getProperty("arrayField?")?.getType().isArray()).toBe(true);
    expect(test?.getProperty("nestedFields")?.getType().isArray()).toBe(false);
    expect(test?.getProperty("nestedFields")?.getType().getText()).toBe(
      "NestedFields"
    );
    expect(test?.getProperty("strArrayField")?.getType().getText()).toBe(
      "string[]"
    );
  });

  it("returns a classFile for a groupXsd", () => {
    let classFile = generator.generateClassFileDefinition(groupXsd);
    console.log(classFile.getText());
    expect(classFile.getClasses().length).toBe(3);
    let c = classFile.getClass("Ordertype");
    console.log("class:  ", c?.getText());
    expect(c).toBeDefined();
    expect(c?.getExtends()?.getText()).toBe("CustGroup");
    c = classFile.getClass(c?.getExtends()?.getText() || "");
    let p = c?.getProperty("customer");
    expect(p?.getType().getText()).toBeDefined();
  });

  it("returns a classFile for a single element with nested type", () => {
    let classFile = generator.generateClassFileDefinition(elmXsd);
    let c: ClassDeclaration | undefined = undefined;
    console.log(classFile.getText());
    expect(classFile.getClasses().length).toBe(4);
    c = classFile.getClass("Naam");
    expect(c).toBeDefined();
    c = classFile.getClass("Show");
    expect(c).toBeDefined();
    if (c) {
      let p = c.getProperty("things");
      expect(p).not.toBe(null);
      expect(p?.getType().getText()).not.toBe("string[]");
    }
    c = classFile.getClass("Shows");
    expect(c).toBe(null);
    c = classFile.getClass("Thing");
    expect(c).toBe(null);
    c = classFile.getClass("Things");
    expect(c).toBe(null);
  });

  it("returns a classFile for a simpleTypeXsd", () => {
    let classFile = generator.generateClassFileDefinition(simpleClassXsd);
    const types = Array.from(generator.types).join("\n");
    log("-------------------------------------\n");
    log(types, "\n\n", classFile.getText());
    expect(classFile.getClasses().length).toBe(3);
    const c = classFile.getClass("Schema");
    expect(c?.getName()).toBe("Schema");
  });

  it("returns a classFile for a simpleTypeXsd", () => {
    let classFile = generator.generateClassFileDefinition(simpleTypeXsd);
    log("------------ classes -------------------------\n");
    log(classFile.getText());
    expect(classFile.getClasses().length).toBe(1);
    const c = classFile.getClass("Schema");
    expect(c?.getName()).toBe("Schema");
    expect(classFile.getTypeAliases().length).toBe(25);
    expect(classFile.getTypeAlias("ABC7")?.getType().getText()).toEqual(
      '"A"|"B"|"C"'
    );
    expect(classFile.getEnums().length).toBe(4);
    expect(classFile.getTypeAlias("Priority18")?.getType().getText()).toEqual(
      "0|1|2|3"
    );
  });

  it("returns a classFile with special types from typesXsd", () => {
    let classFile = generator.generateClassFileDefinition(typesXsd);
    console.log("-------------------------------------\n");
    console.log(classFile.getText());
    expect(classFile.getClasses().length).toBe(7);
    let method = classFile.getClass("Module")?.getMethod("param");
    expect(method?.getReturnType().getText()).toBe("void");
  });

  it("returns a classFile with special types from typesXsd", () => {
    let classFile = generator.generateClassFileDefinition(choiceXsd);
    console.log("-------------------------------------\n");
    console.log(classFile.getText());
    expect(classFile.getClasses().length).toBe(3);
    let method = classFile.getClass("Choose1")?.getMethod("item");
    expect(method?.getReturnType().getText()).toBe("void");
    method = classFile.getClass("Choose2")?.getMethod("b");
    expect(method?.getReturnType().getText()).toBe("void");
    let attr = classFile.getClass("Choose2")?.getProperty("$a0");
    expect(attr?.getType().getText()).toEqual("Date");
  });

  it("returns a classFile with types from namespaceXsd", () => {
    let classFile = generator.generateClassFileDefinition(targetnamespace);
    console.log("-------------------------------------\n");
    console.log(classFile.getText());
    expect(
      classFile
        .getClasses()
        .map((c: ClassDeclaration) => c.getName())
        .join(", ")
    ).toBe("Schema, Order");
  });

  it("returns a classFile for formXsd", () => {
    let classFile = generator.generateClassFileDefinition(formXsd);
    console.log(classFile.getText());
    expect(classFile.getClasses().length).toBeGreaterThan(0);

    const formClass = classFile.getClass("Form");
    expect(formClass).toBeDefined();
    expect(formClass?.getProperties().length).toBeGreaterThan(0);
  });

  it("returns a classFile for singleElmXsd", () => {
    let classFile = generator.generateClassFileDefinition(singleElmXsd);
    console.log(classFile.getText());
    expect(classFile.getClasses().length).toBeGreaterThan(0);

    const rootClass = classFile.getClass("Root");
    expect(rootClass).toBeDefined();
    expect(
      rootClass?.getProperties().some((p) => p.getName() === "singleElement")
    ).toBe(true);
    expect(rootClass?.getProperty("singleElement")?.getType().isArray()).toBe(
      false
    );
  });

  it("returns a classFile for importedClassXsd", () => {
    let classFile = generator.generateClassFileDefinition(importedClassXsd);
    console.log(classFile.getText());
    expect(classFile.getClasses().length).toBeGreaterThan(0);

    const importedClass = classFile.getClass("ImportedClass");
    expect(importedClass).toBeDefined();
    expect(importedClass?.getProperties().length).toBeGreaterThan(0);

    // Check if imports are properly handled
    const sourceFileImports = classFile.getImportDeclarations();
    expect(sourceFileImports.length).toBeGreaterThan(0);
    expect(
      sourceFileImports.some((imp) =>
        imp.getModuleSpecifierValue().includes("simpleClass")
      )
    ).toBe(true);
  });
});
