// Basic XML types and interfaces
export interface XMLNode {
  nodeName: string;
  nodeValue: string | null;
  attributes: { [key: string]: string };
  childNodes: XMLNode[];
}

// Common XSD types
export type XSDString = string;
export type XSDInteger = number;
export type XSDBoolean = boolean;
export type XSDDateTime = string;

// Base class for XSD-generated classes
export class XSDBase {
  constructor(props?: any) {
    Object.assign(this, props);
  }
}
