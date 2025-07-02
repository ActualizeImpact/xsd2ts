import { Project, SourceFile } from "ts-morph";
import { z } from "zod";
export declare const CLASS_PREFIX = "xsd.";
declare const ClassGeneratorOptionsSchema: z.ZodObject<{
    depMap: z.ZodOptional<z.ZodMap<z.ZodString, z.ZodString>>;
    classPrefix: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    verbose: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    pluralPostFix: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    xmlnsName: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    project: z.ZodOptional<z.ZodType<Project, z.ZodTypeDef, Project>>;
}, "strip", z.ZodTypeAny, {
    classPrefix: string;
    verbose: boolean;
    pluralPostFix: string;
    xmlnsName: string;
    depMap?: Map<string, string> | undefined;
    project?: Project | undefined;
}, {
    depMap?: Map<string, string> | undefined;
    classPrefix?: string | undefined;
    verbose?: boolean | undefined;
    pluralPostFix?: string | undefined;
    xmlnsName?: string | undefined;
    project?: Project | undefined;
}>;
export type ClassGeneratorOptions = z.infer<typeof ClassGeneratorOptionsSchema>;
export declare class ClassGenerator {
    readonly types: Set<string>;
    schemaName: string;
    xmlnsName: string;
    private readonly project;
    private readonly sourceFile;
    private readonly dependencies;
    private readonly classPrefix;
    private readonly verbose;
    constructor(options?: ClassGeneratorOptions);
    generateClassFile(xsd: string): SourceFile;
    generateClassFileDefinition(xsd: string): SourceFile;
    private parseXsd;
    private generateClasses;
    private addClassProperties;
    private addClassConstructor;
    private sortClassesByHierarchy;
    private log;
}
export {};
