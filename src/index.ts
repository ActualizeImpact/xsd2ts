import * as fs from "fs/promises";
import { ClassGenerator, CLASS_PREFIX } from "./classGenerator.js";
import { useVerboseLogModus } from "./xml-utils.js";
import { z } from "zod";
import type { GeneratorOptions } from "../index.js";

const TSConfigSchema = z.object({
  compilerOptions: z.object({
    module: z.string(),
    target: z.string(),
    sourceMap: z.boolean(),
    declaration: z.boolean(),
    declarationDir: z.string(),
    outDir: z.string(),
  }),
  exclude: z.array(z.string()),
});

const DEFAULT_TSCONFIG = {
  compilerOptions: {
    module: "esnext",
    target: "esnext",
    sourceMap: true,
    declaration: true,
    declarationDir: "../../",
    outDir: "../../",
  },
  exclude: ["node_modules"],
} as const;

export class XSDParseError extends Error {
  constructor(
    message: string,
    public readonly xsdPath: string
  ) {
    super(message);
    this.name = "XSDParseError";
  }
}

export class GenerationError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "GenerationError";
  }
}

export function verbose(): void {
  useVerboseLogModus();
}

export async function generateTemplateClassesFromXSD(
  xsdFilePath: string,
  dependencies: Map<string, string> = new Map(),
  options: GeneratorOptions = {}
): Promise<void> {
  try {
    const xsdString = await fs.readFile(xsdFilePath, "utf8");
    console.log("XSD Content:", xsdString);

    const fileName = xsdFilePath.split("/").pop() || "generated.ts";
    const tsFileName = fileName.replace(".xsd", ".ts");
    const genSrcPath = "./src/generated";

    const generator = new ClassGenerator({
      depMap: dependencies,
      classPrefix: options.classPrefix || CLASS_PREFIX,
      verbose: true,
      pluralPostFix: options.pluralPostfix || "s",
      xmlnsName: options.xmlnsName || "xmlns",
      project: options.project,
    });

    generator.schemaName = fileName.replace(".ts", "").replace(/\W/g, "_");

    await fs.mkdir(genSrcPath, { recursive: true });

    const validatedConfig = TSConfigSchema.parse(DEFAULT_TSCONFIG);
    await fs.writeFile(
      "./src/generated/tsconfig.json",
      JSON.stringify(validatedConfig, null, 2),
      "utf8"
    );

    const classFileDef = generator.generateClassFileDefinition(xsdString);
    console.log("Generated Definition:", classFileDef.getText());

    const disclaimer = [
      "/***********",
      `Generated template classes for ${xsdFilePath}`,
      `Generated on: ${new Date().toLocaleString()}`,
      "***********/\n",
    ].join("\n");

    const src = [
      disclaimer,
      classFileDef.getText().replace(/protected\s/g, "public "),
    ].join("\n\n");

    await Promise.all([
      fs.writeFile(`${genSrcPath}/${tsFileName}`, src, "utf8"),
      fs.writeFile(
        `${genSrcPath}/index.ts`,
        `export * from './${tsFileName.replace(".ts", "")}'`,
        "utf8"
      ),
    ]);
  } catch (error) {
    console.error("Generation Error:", error);
    if (error instanceof Error) {
      throw new GenerationError(
        `Failed to generate classes from ${xsdFilePath}`,
        error
      );
    }
    throw error;
  }
}
