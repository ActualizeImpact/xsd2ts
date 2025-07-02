import { Project, ScriptTarget, ModuleKind, Scope, } from "ts-morph";
import { DOMParser } from "@xmldom/xmldom";
import { XsdGrammar } from "./xsd-grammar.js";
import { log } from "./xml-utils.js";
import { z } from "zod";
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
export class ClassGenerator {
    types = new Set();
    schemaName = "schema";
    xmlnsName = "xmlns";
    project;
    sourceFile;
    dependencies;
    classPrefix;
    verbose;
    constructor(options) {
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
    generateClassFile(xsd) {
        const ast = this.parseXsd(xsd);
        return this.generateClasses(ast);
    }
    generateClassFileDefinition(xsd) {
        return this.generateClassFile(xsd);
    }
    parseXsd(xsd) {
        try {
            this.log("Parsing XSD...");
            const xsdGrammar = new XsdGrammar({ schemaName: this.schemaName });
            const xmlDom = new DOMParser().parseFromString(xsd, "application/xml");
            const xmlNode = xmlDom?.documentElement;
            if (!xmlNode)
                throw new Error("Invalid XSD: No root element");
            const ast = xsdGrammar.parse(xmlNode);
            this.log("XSD parsed successfully");
            return ast;
        }
        catch (error) {
            throw new Error(`Failed to parse XSD: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    generateClasses(ast) {
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
            if (classData.name.startsWith(GROUP_PREFIX))
                continue;
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
    addClassProperties(classDecl, classData) {
        for (const prop of classData.properties) {
            classDecl.addProperty({
                name: prop.name,
                type: prop.type.text,
                scope: Scope.Protected,
                initializer: prop.defaultExpression?.text,
            });
        }
    }
    addClassConstructor(classDecl, classData) {
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
            const lines = [];
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
                        lines.push(`  this.${propName} = props.${propName}?.map(item => new ${baseType}(item));`);
                    }
                    else {
                        lines.push(`  this.${propName} = props.${propName} ? new ${baseType}(props.${propName}) : undefined;`);
                    }
                }
                else {
                    lines.push(`  this.${propName} = props.${propName};`);
                }
            }
            lines.push("}");
            return lines.join("\n");
        });
    }
    sortClassesByHierarchy(classes) {
        const sorted = [];
        const visited = new Set();
        const visit = (className) => {
            if (visited.has(className))
                return;
            visited.add(className);
            const classData = classes.find((c) => c.name === className);
            if (!classData)
                return;
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
    log(message, ...args) {
        if (this.verbose) {
            log(message, ...args);
        }
    }
}
