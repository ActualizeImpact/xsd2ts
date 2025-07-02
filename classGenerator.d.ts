import type { SourceFile, Project } from "ts-morph";
import type { Node } from "@xmldom/xmldom";
import type { z } from "zod";

export interface ClassGeneratorOptions {
  /** Map of namespace to module path dependencies */
  depMap?: Map<string, string>;
  /** Prefix to add to generated class names */
  classPrefix?: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Postfix to add to plural field names */
  pluralPostFix?: string;
  /** Project configuration */
  project?: Project;
}

export class ClassGenerator {
  /** List of generated types */
  readonly types: Set<string>;

  /** Name of the schema being processed */
  readonly schemaName: string;

  /** Name of the XML namespace */
  readonly xmlnsName: string;

  constructor(options?: ClassGeneratorOptions);

  /**
   * Generates TypeScript classes from an XSD schema
   * @param xsd - The XSD schema string
   * @param pluralPostFix - Optional postfix for plural field names
   * @param verbose - Enable verbose logging
   * @returns SourceFile containing generated classes
   * @throws {XSDParseError} When XSD parsing fails
   */
  generateClassFile(
    xsd: string,
    pluralPostFix?: string,
    verbose?: boolean
  ): SourceFile;
}
