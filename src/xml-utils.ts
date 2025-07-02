import { Node } from "@xmldom/xmldom";
import { z } from "zod";

let VERBOSE = false;

const XMLAttributesSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  base: z.string().optional(),
  value: z.string().optional(),
  ref: z.string().optional(),
  minOccurs: z.string().optional(),
  maxOccurs: z.string().optional(),
  abstract: z.string().optional(),
});

export type XMLAttributes = z.infer<typeof XMLAttributesSchema>;

export interface XMLNode extends Node {
  readonly localName: string;
}

export function useVerboseLogModus(): void {
  VERBOSE = true;
}

export function useNormalLogModus(): void {
  VERBOSE = false;
}

export function log(...params: unknown[]): void {
  if (VERBOSE) {
    console.log(...params);
  }
}

export function findFirstChild(node: Node | null): Node | null {
  if (!node?.firstChild) return null;

  const child = node.firstChild;
  if (child.nodeType === Node.TEXT_NODE) {
    return findNextSibbling(child);
  }
  return child;
}

export function findNextSibbling(node: Node | null): Node | null {
  if (!node?.nextSibling) return null;

  const sibling = node.nextSibling;
  if (sibling.nodeType === Node.TEXT_NODE) {
    return findNextSibbling(sibling);
  }
  return sibling;
}

export function findChildren(node: Node): Node[] {
  const result: Node[] = [];
  let child = findFirstChild(node);

  while (child) {
    result.push(child);
    child = findNextSibbling(child);
  }

  return result;
}

export function xml(node: Node): XMLNode {
  return node as XMLNode;
}

export function capFirst(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function attribs(node: Node | null): XMLAttributes | null {
  if (!node) return null;
  if (node.nodeType !== node.ELEMENT_NODE) return null;

  const element = node as unknown as { attributes: NamedNodeMap };
  if (!element.attributes) return null;

  const attrs: Record<string, string | undefined> = {};
  const attributeNames = [
    "name",
    "type",
    "base",
    "abstract",
    "value",
    "ref",
    "minOccurs",
    "maxOccurs",
  ];

  for (const name of attributeNames) {
    const attr = element.attributes.getNamedItem(name);
    if (attr) {
      attrs[name] = attr.value;
    }
  }

  return XMLAttributesSchema.parse(attrs);
}
