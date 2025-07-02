export interface XMLNode {
    nodeName: string;
    nodeValue: string | null;
    attributes: {
        [key: string]: string;
    };
    childNodes: XMLNode[];
}
export type XSDString = string;
export type XSDInteger = number;
export type XSDBoolean = boolean;
export type XSDDateTime = string;
export declare class XSDBase {
    constructor(props?: any);
}
