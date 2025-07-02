import { describe, it, expect } from "vitest";
import * as path from "path";
import { useVerboseLogModus } from "../src/xml-utils.js";
import { generateTemplateClassesFromXSD } from "../src/index.js";
import { assertSuccessfulCompilation } from "./utils/compiler.js";

function xsdPath(name: string) {
  return path.join(__dirname, "xsd", `${name}.xsd`);
}

useVerboseLogModus();

describe("generator", () => {
  it("has function generateTemplateClassesFromXSD", () => {
    expect(generateTemplateClassesFromXSD).toBeDefined();
  });

  it("creates simpleClass.ts", async () => {
    const dependencies = new Map([
      ["xs", "@xmldom/xmldom"],
      ["xsd", "../../test/types/types"],
    ]);
    await generateTemplateClassesFromXSD(xsdPath("simpleClass"), dependencies, {
      verbose: true,
    });
    await assertSuccessfulCompilation("./src/generated/simpleClass.ts");
  });

  it("creates importedClass.ts", async () => {
    const dependencies = new Map([
      ["xs", "@xmldom/xmldom"],
      ["dep", "./types"],
    ]);
    const result = await generateTemplateClassesFromXSD(
      "./test/xsd/importedClass.xsd",
      dependencies
    );
    expect(result).toBeDefined();
    await assertSuccessfulCompilation("./src/generated/importedClass.ts");
  });

  it("creates simpleInheritedClass.ts", async () => {
    const dependencies = new Map([
      ["xs", "@xmldom/xmldom"],
      ["Xs", "./types"],
    ]);
    const result = await generateTemplateClassesFromXSD(
      "./test/xsd/simpleInheritedClass.xsd",
      dependencies
    );
    expect(result).toBeDefined();
    await assertSuccessfulCompilation(
      "./src/generated/simpleInheritedClass.ts"
    );
  });

  it("creates xep-004.ts", async () => {
    const dependencies = new Map([
      ["xs", "@xmldom/xmldom"],
      ["jabber", "./types"],
    ]);
    const result = await generateTemplateClassesFromXSD(
      "./test/xsd/xep-004.xsd",
      dependencies,
      { xmlnsName: "jabber" }
    );
    expect(result).toBeDefined();
    await assertSuccessfulCompilation("./src/generated/xep-004.ts");
  });

  it("creates simpleType.ts", async () => {
    const dependencies = new Map([["xs", "@xmldom/xmldom"]]);
    const result = await generateTemplateClassesFromXSD(
      "./test/xsd/simpleType.xsd",
      dependencies
    );
    expect(result).toBeDefined();
    await assertSuccessfulCompilation("./src/generated/simpleType.ts");
  });

  it("creates group.ts", async () => {
    const dependencies = new Map([["xs", "@xmldom/xmldom"]]);
    const result = await generateTemplateClassesFromXSD(
      "./test/xsd/group.xsd",
      dependencies
    );
    expect(result).toBeDefined();
    await assertSuccessfulCompilation("./src/generated/group.ts");
  });

  it("creates types.ts", async () => {
    const dependencies = new Map([["xs", "@xmldom/xmldom"]]);
    const result = await generateTemplateClassesFromXSD(
      "./test/xsd/types.xsd",
      dependencies
    );
    expect(result).toBeDefined();
    await assertSuccessfulCompilation("./src/generated/types.ts");
  });

  it("creates element.ts", async () => {
    const dependencies = new Map([
      ["xs", "@xmldom/xmldom"],
      ["Xs", "./types"],
    ]);
    const result = await generateTemplateClassesFromXSD(
      "./test/xsd/element.xsd",
      dependencies
    );
    expect(result).toBeDefined();
    await assertSuccessfulCompilation("./src/generated/element.ts");
  });

  it("creates capabilities_1_3_0.ts", async () => {
    const dependencies = new Map([
      ["xs", "@xmldom/xmldom"],
      ["wms", "./types"],
      ["xlink", "./types"],
    ]);
    const result = await generateTemplateClassesFromXSD(
      "./test/xsd/capabilities_1_3_0.xsd",
      dependencies
    );
    expect(result).toBeDefined();
    await assertSuccessfulCompilation("./src/generated/capabilities_1_3_0.ts");
  });

  it("creates defNamespace.ts", async () => {
    const dependencies = new Map([
      ["xs", "@xmldom/xmldom"],
      ["dep", "./types"],
    ]);
    const result = await generateTemplateClassesFromXSD(
      "./test/xsd/defNamespace.xsd",
      dependencies
    );
    expect(result).toBeDefined();
    await assertSuccessfulCompilation("./src/generated/defNamespace.ts");
  });

  it("creates inversedNamespace.ts", async () => {
    const dependencies = new Map([
      ["xs", "@xmldom/xmldom"],
      ["dep", "./types"],
    ]);
    const result = await generateTemplateClassesFromXSD(
      "./test/xsd/inversedNamespace.xsd",
      dependencies,
      { xmlnsName: "dep" }
    );
    expect(result).toBeDefined();
    await assertSuccessfulCompilation("./src/generated/inversedNamespace.ts");
  });

  it("creates dep.ts", async () => {
    const dependencies = new Map([["xs", "@xmldom/xmldom"]]);
    const result = await generateTemplateClassesFromXSD(
      "./test/xsd/dep.xsd",
      dependencies
    );
    expect(result).toBeDefined();
    await assertSuccessfulCompilation("./src/generated/dep.ts");
  });

  it("creates a single element schema.ts", async () => {
    const dependencies = new Map([["xs", "@xmldom/xmldom"]]);
    const result = await generateTemplateClassesFromXSD(
      "./test/xsd/singleElm.xsd",
      dependencies
    );
    expect(result).toBeDefined();
    await assertSuccessfulCompilation("./src/generated/singleElm.ts");
  });

  it("creates a choice construct schema.ts", async () => {
    const dependencies = new Map([["xs", "@xmldom/xmldom"]]);
    const result = await generateTemplateClassesFromXSD(
      "./test/xsd/choice.xsd",
      dependencies
    );
    expect(result).toBeDefined();
    await assertSuccessfulCompilation("./src/generated/choice.ts");
  });

  it("creates a schema with targetnamespace.ts", async () => {
    const dependencies = new Map([["xs", "@xmldom/xmldom"]]);
    const result = await generateTemplateClassesFromXSD(
      "./test/xsd/targetnamespace.xsd",
      dependencies
    );
    expect(result).toBeDefined();
    await assertSuccessfulCompilation("./src/generated/targetnamespace.ts");
  });
});
