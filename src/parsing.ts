import { attribs, capFirst, findChildren, log, xml } from "./xml-utils.js";
import type { Node } from "@xmldom/xmldom";
import { z } from "zod";

export const UNBOUNDED = "unbounded" as const;

export type FindNextNode = (n: Node) => Node;
export type AstNodeFactory = (n: Node) => ASTNode | null;
export type AstNodeMerger = (r1: ASTNode, r2: ASTNode) => ASTNode;

// Schema for field type validation
const FieldTypeSchema = z.object({
  type: z.string(),
  namespace: z.string().optional(),
});

export type FieldType = z.infer<typeof FieldTypeSchema>;

export function astNode(s: string): ASTNode {
  return new ASTNode(s);
}

export const NEWLINE = "\n";

export function astClass(n?: Node): ASTNode {
  const result = astNode("Class");
  if (n) result.addName(n);
  return result;
}

export function astNamedUntypedElm(n: Node): ASTNode {
  const attrs = attribs(n);
  return astNode("NamedUntypedElm").named(attrs?.name || "");
}

export function astEnumValue(n: Node): ASTNode {
  const attrs = attribs(n);
  return astNode("Enumeration").addEnumValue(attrs?.value || "");
}

export function astRestrictions(n: Node): ASTNode {
  const attrs = attribs(n);
  const localName = xml(n).localName;
  return astNode("Restrictions").prop(localName, attrs?.value || "");
}

export function astField(): ASTNode {
  return astNode("Field");
}

export interface Parslet {
  parse(node: Node, indent?: string): ASTNode | null;
}

export function match(terminal: Terminal, merger?: AstNodeMerger): Matcher {
  return new Matcher(terminal.label, terminal, merger);
}

export interface IParsable {
  parse(node: Node, indent?: string): ASTNode | null;
}

export interface Attribs {
  [key: string]: string | ASTNode[] | string[] | EnumValue[];
}

export interface EnumValue {
  value: string;
}

export class ASTNode {
  public nodeType: string;
  public name: string = "";
  private readonly _attr: Attribs = {};
  public children: ASTNode[] = [];
  public classes?: ASTNode[] = [];

  constructor(type: string) {
    this.nodeType = type;
    this._attr = {};
  }

  public prop(key: string, value: unknown): this {
    this._attr[key] = String(value);
    return this;
  }

  public named(name: string): this {
    this.name = name;
    return this;
  }

  public prefixFieldName(prefix: string): this {
    this.prop("fieldName", prefix + this._attr.fieldName);
    return this;
  }

  public addName(node: Node, prefix = ""): this {
    const attrs = attribs(node);
    this.name = prefix + capFirst(attrs?.name || "");
    return this;
  }

  public addField(node: Node, fldType?: string): this {
    const attrs = attribs(node);
    const type = fldType || getFieldType(attrs?.type || "", null);
    const isOptional = attrs?.minOccurs === "0";
    const isArray = attrs?.maxOccurs === UNBOUNDED;

    this.prop("fieldName", `${attrs?.name || ""}${isOptional ? "?" : ""}`).prop(
      "fieldType",
      `${type}${isArray ? "[]" : ""}`
    );

    this.addAttribs(node);
    return this;
  }

  get attr(): Readonly<Attribs> {
    return this._attr;
  }

  public addAttribs(n: Node): this {
    if (n.nodeType !== n.ELEMENT_NODE) return this;
    const attrs = attribs(n);
    if (!attrs) return this;
    for (const [key, value] of Object.entries(attrs)) {
      if (!value) continue;

      switch (key) {
        case "name":
          this.name = String(value);
          break;
        case "maxOccurs":
          this._attr.array = String(value === UNBOUNDED);
          break;
        case "minOccurs":
          this._attr.optional = String(value === "0");
          break;
        default:
          this._attr[key] = String(value);
      }
    }
    return this;
  }

  public addEnumValue(value: string): this {
    if (!this._attr.values) {
      this._attr.values = [] as EnumValue[];
    }
    if (Array.isArray(this._attr.values)) {
      (this._attr.values as EnumValue[]).push({ value });
    }
    return this;
  }

  public merge(other: ASTNode): ASTNode {
    const result = new ASTNode(this.nodeType);
    Object.assign(result, this);
    Object.assign(result, other);

    // Special handling for array attributes
    for (const [key, value] of Object.entries(this._attr)) {
      if (Array.isArray(value)) {
        if (value[0] instanceof ASTNode) {
          result._attr[key] = value as ASTNode[];
        } else if (typeof value[0] === "string") {
          result._attr[key] = value as string[];
        } else {
          result._attr[key] = value as EnumValue[];
        }
      } else {
        result._attr[key] = value;
      }
    }

    // Merge other's attributes
    for (const [key, value] of Object.entries(other._attr)) {
      if (Array.isArray(value)) {
        if (!result._attr[key]) {
          result._attr[key] = [];
        }
        const target = result._attr[key] as any[];
        result._attr[key] = [...target, ...value];
      } else {
        result._attr[key] = value;
      }
    }

    result.nodeType = this.nodeType;
    return result;
  }
}

export class Terminal implements Parslet {
  private readonly name: string;
  private readonly factory?: AstNodeFactory;
  readonly label: string;

  constructor(name: string, factory?: AstNodeFactory) {
    const [baseName = "", label = ""] = name.split(":");
    this.name = baseName;
    this.label = label;
    this.factory = factory;
  }

  public parse(node: Node, indent = ""): ASTNode | null {
    if (!node || node.nodeType !== node.ELEMENT_NODE) return null;

    log(`${indent}Parsing terminal ${this.name}`);

    const localName = xml(node).localName;
    if (localName !== this.name) return null;

    if (this.factory) {
      const result = this.factory(node);
      if (result && this.label) {
        result.prop("label", this.label);
      }
      return result;
    }

    return astNode(this.name).addAttribs(node);
  }
}

export class OneOf implements Parslet {
  private readonly name: string;
  private readonly options: Parslet[];
  private _label?: string;

  constructor(name: string, options: Parslet[]) {
    this.name = name;
    this.options = options;
  }

  public setLabel(label: string): this {
    this._label = label;
    return this;
  }

  public parse(node: Node, indent = ""): ASTNode | null {
    log(`${indent}Parsing OneOf ${this.name}`);

    for (const option of this.options) {
      const result = option.parse(node, indent + "  ");
      if (result) {
        log(`${indent}Found matching option in ${this.name}`);
        if (this._label) {
          result.prop("label", this._label);
        }
        return result;
      }
    }

    log(`${indent}No matching options found in ${this.name}`);
    return null;
  }
}

export class Matcher implements Parslet {
  private readonly name: string;
  private readonly terminal: Terminal;
  private readonly defaultMerger?: AstNodeMerger;
  private readonly _children: Array<{
    parslet: Parslet;
    merger?: AstNodeMerger;
  }> = [];
  private _label?: string;
  private handler?: (n: Node) => ASTNode | null;

  constructor(name: string, terminal: Terminal, defaultMerger?: AstNodeMerger) {
    this.name = name;
    this.terminal = terminal;
    this.defaultMerger = defaultMerger;
  }

  public labeled(label: string): this {
    this._label = label;
    return this;
  }

  public addChild(parslet: Parslet, merger?: AstNodeMerger): this {
    this._children.push({ parslet, merger });
    return this;
  }

  public addChildren(parslets: Parslet[] | Parslet): this {
    if (Array.isArray(parslets)) {
      this._children.push(...parslets.map((p) => ({ parslet: p })));
    } else {
      this._children.push({ parslet: parslets });
    }
    return this;
  }

  public empty(): this {
    return this;
  }

  public parse(node: Node, indent = ""): ASTNode | null {
    if (this.handler) {
      return this.handler(node);
    }

    const result = this.terminal.parse(node, indent);
    if (!result) return null;

    if (this._label) {
      result.prop("label", this._label);
    }

    if (!this._children.length) return result;

    log(`Parsing matcher ${this.name} with ${this._children.length} children`);

    const children = findChildren(node);
    for (const child of children) {
      for (const { parslet, merger } of this._children) {
        const childResult = parslet.parse(child, indent + "  ");
        if (childResult) {
          log(`Found matching child for ${this.name}:`, childResult.nodeType);
          if (merger) {
            Object.assign(result, merger(result, childResult));
          } else if (this.defaultMerger) {
            Object.assign(result, this.defaultMerger(result, childResult));
          } else if (!result.children) {
            result.children = [childResult];
          } else {
            result.children.push(childResult);
          }
          break;
        }
      }
    }

    return result;
  }

  setHandler(handler: (n: Node) => ASTNode | null): Matcher {
    this.handler = handler;
    return this;
  }
}

export class Proxy implements IParsable {
  public parslet?: IParsable;

  parse(node: Node, indent = ""): ASTNode | null {
    if (!this.parslet) {
      throw new Error("Proxy parslet not initialized");
    }
    return this.parslet.parse(node, indent);
  }
}

export function getFieldType(type: string, defNs: string | null): string {
  if (!type) return "any";

  const typeData = { type, namespace: defNs };
  const validatedType = FieldTypeSchema.parse(typeData);
  const validatedTypeStr = validatedType.type || "";

  const parts = validatedTypeStr.toLowerCase().split(":");
  const key = parts[parts.length - 1] || "";

  const typeMap: Record<string, string> = {
    string: "string",
    float: "number",
    double: "number",
    int: "number",
    integer: "number",
    long: "number",
    positiveinteger: "number",
    nonnegativeinteger: "number",
    decimal: "number",
    datetime: "Date",
    date: "Date",
    base64binary: "string",
    boolean: "boolean",
  };

  let resultType = type;
  if (validatedType.namespace && !/:/.test(resultType)) {
    resultType = `${validatedType.namespace.toLowerCase()}.${capFirst(resultType)}`;
  } else {
    resultType = resultType
      .split(":")
      .map((p, i, a) => (i < a.length - 1 ? p.toLowerCase() : capFirst(p)))
      .join(".");
  }

  if (resultType === "Number") resultType = "number";
  const mappedType = key in typeMap ? typeMap[key] : resultType;
  return mappedType || "any";
}

export function oneOf(options: Parslet[]): OneOf {
  return new OneOf("OneOf", options);
}

export function hasAttribute(node: Node, attr: string): boolean {
  const attrs = attribs(node);
  if (!attrs) return false;
  return attr in attrs && attrs[attr as keyof typeof attrs] !== undefined;
}
