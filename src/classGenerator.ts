import {
  Project,
  SourceFile,
  ClassDeclaration,
  ScriptTarget,
  ModuleKind,
  Scope,
} from "ts-morph";
import { DOMParser } from "@xmldom/xmldom";
import { XsdGrammar } from "./xsd-grammar.js";
import { log } from "./xml-utils.js";
import { z } from "zod";
import { ASTNode } from "./parsing.js";

export const CLASS_PREFIX = "xsd.";
const GROUP_PREFIX = "group_";

const ClassGeneratorOptionsSchema = z.object({
  depMap: z.map(z.string(), z.string()).optional(),
  classPrefix: z.string().optional().default(CLASS_PREFIX),
  verbose: z.boolean().optional().default(false),
  pluralPostFix: z.string().optional().default("s"),
  xmlnsName: z.string().optional().default("xmlns"),
  project: z.instanceof(Project).optional(),
});

export type ClassGeneratorOptions = z.infer<typeof ClassGeneratorOptionsSchema>;

interface ClassProperty {
  name: string;
  type: { text: string };
  defaultExpression?: { text: string };
}

interface ClassData {
  name: string;
  extendsTypes?: Array<{ text: string }>;
  properties: ClassProperty[];
}

export class ClassGenerator {
  public readonly types = new Set<string>();
  public schemaName = "schema";
  public xmlnsName = "xmlns";

  private readonly project: Project;
  private readonly sourceFile: SourceFile;
  private readonly dependencies: Map<string, string>;
  private readonly classPrefix: string;
  private readonly verbose: boolean;

  constructor(options?: ClassGeneratorOptions) {
    const validatedOptions = ClassGeneratorOptionsSchema.parse(options || {});
    this.dependencies = validatedOptions.depMap || new Map();
    this.classPrefix = validatedOptions.classPrefix;
    this.verbose = validatedOptions.verbose;
    this.project =
      validatedOptions.project ||
      new Project({
        useInMemoryFileSystem: true,
        skipFileDependencyResolution: true,
        compilerOptions: {
          target: ScriptTarget.ESNext,
          module: ModuleKind.ESNext,
          declaration: true,
          strict: true,
        },
      });
    this.sourceFile = this.project.createSourceFile("generated.ts", "", {
      overwrite: true,
    });

    log("Dependencies:", JSON.stringify(Object.fromEntries(this.dependencies)));
  }

  generateClassFile(xsd: string): SourceFile {
    const ast = this.parseXsd(xsd);
    return this.generateClasses(ast);
  }

  generateClassFileDefinition(xsd: string): SourceFile {
    return this.generateClassFile(xsd);
  }

  private parseXsd(xsd: string): { classes?: ClassData[] } {
    try {
      this.log("Parsing XSD...");
      const xsdGrammar = new XsdGrammar({
        schemaName:
          typeof this.schemaName === "string" ? this.schemaName : "schema",
      });
      const xmlDom = new DOMParser().parseFromString(xsd, "application/xml");
      const xmlNode = xmlDom?.documentElement;
      if (!xmlNode) throw new Error("Invalid XSD: No root element");

      this.log("XML Node:", {
        name: xmlNode.nodeName,
        children: xmlNode.childNodes.length,
      });

      const ast = xsdGrammar.parse(xmlNode) as { children?: ASTNode[] };
      this.log("AST:", JSON.stringify(ast, null, 2));

      return {
        classes: ast.children
          ?.filter(
            (node) =>
              node.nodeType === "Class" ||
              (node.nodeType === "AliasType" && node.attr?.element === "true")
          )
          .map((node) => ({
            name: node.name,
            extendsTypes: node.attr?.extends
              ? [{ text: String(node.attr.extends) }]
              : undefined,
            properties: (node.children || []).map((child) => ({
              name: child.name,
              type: { text: String(child.attr?.type || "any") },
              defaultExpression: child.attr?.default
                ? { text: String(child.attr.default) }
                : undefined,
            })),
          })),
      };
    } catch (error) {
      console.error("XSD Parse Error:", error);
      throw new Error(
        `Failed to parse XSD: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private generateClasses(ast: { classes?: ClassData[] }): SourceFile {
    this.log("Generating classes from AST:", JSON.stringify(ast, null, 2));

    if (!ast.classes || ast.classes.length === 0) {
      this.log("No classes found in AST");
      return this.sourceFile;
    }

    // Add imports
    for (const [ns, path] of this.dependencies.entries()) {
      this.sourceFile.addImportDeclaration({
        moduleSpecifier: path,
        namespaceImport: ns,
      });
    }

    const classes = ast.classes || [];
    const sortedClasses = this.sortClassesByHierarchy(classes);

    for (const classData of sortedClasses) {
      if (classData.name.startsWith(GROUP_PREFIX)) continue;

      const classDecl = this.sourceFile.addClass({
        name: classData.name,
        isExported: true,
        extends: classData.extendsTypes?.[0]?.text,
      });

      this.addClassProperties(classDecl, classData);
      this.addClassConstructor(classDecl, classData);
    }

    return this.sourceFile;
  }

  private addClassProperties(
    classDecl: ClassDeclaration,
    classData: ClassData
  ): void {
    for (const prop of classData.properties) {
      classDecl.addProperty({
        name: prop.name,
        type: prop.type.text,
        scope: Scope.Protected,
        initializer: prop.defaultExpression?.text,
      });
    }
  }

  private addClassConstructor(
    classDecl: ClassDeclaration,
    classData: ClassData
  ): void {
    const constructor = classDecl.addConstructor({
      scope: Scope.Protected,
      parameters: [
        {
          name: "props",
          type: classData.name,
          hasQuestionToken: true,
        },
      ],
    });

    constructor.setBodyText(() => {
      const lines: string[] = [];

      if (classData.extendsTypes?.length) {
        lines.push("super(props);");
      }

      lines.push(`this["@class"] = "${this.classPrefix}${classData.name}";`);
      lines.push("if (props) {");

      for (const prop of classData.properties) {
        const propName = prop.name.replace("?", "");
        const type = prop.type.text;
        const isArray = type.includes("[]");
        const baseType = type.replace("[]", "");

        if (this.types.has(baseType)) {
          if (isArray) {
            lines.push(
              `  this.${propName} = props.${propName}?.map(item => new ${baseType}(item));`
            );
          } else {
            lines.push(
              `  this.${propName} = props.${propName} ? new ${baseType}(props.${propName}) : undefined;`
            );
          }
        } else {
          lines.push(`  this.${propName} = props.${propName};`);
        }
      }

      lines.push("}");
      return lines.join("\n");
    });
  }

  private sortClassesByHierarchy(classes: ClassData[]): ClassData[] {
    const sorted: ClassData[] = [];
    const visited = new Set<string>();

    const visit = (className: string) => {
      if (visited.has(className)) return;
      visited.add(className);

      const classData = classes.find((c) => c.name === className);
      if (!classData) return;

      if (classData.extendsTypes?.[0]?.text) {
        visit(classData.extendsTypes[0].text);
      }

      sorted.push(classData);
    };

    for (const classData of classes) {
      visit(classData.name);
    }

    return sorted;
  }

  private log(message: string, ...args: any[]): void {
    if (this.verbose) {
      log(message, ...args);
    }
  }
}
