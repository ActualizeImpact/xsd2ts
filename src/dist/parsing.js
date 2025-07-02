import { attribs, capFirst, findChildren, log, xml } from "./xml-utils.js";
import { z } from "zod";
export const UNBOUNDED = "unbounded";
// Schema for field type validation
const FieldTypeSchema = z.object({
    type: z.string(),
    namespace: z.string().optional(),
});
export function astNode(s) {
    return new ASTNode(s);
}
export const NEWLINE = "\n";
export function astClass(n) {
    const result = astNode("Class");
    if (n)
        result.addName(n);
    return result;
}
export function astNamedUntypedElm(n) {
    const attrs = attribs(n);
    return astNode("NamedUntypedElm").named(attrs?.name || "");
}
export function astEnumValue(n) {
    const attrs = attribs(n);
    return astNode("Enumeration").addEnumValue(attrs?.value || "");
}
export function astRestrictions(n) {
    const attrs = attribs(n);
    const localName = xml(n).localName;
    return astNode("Restrictions").prop(localName, attrs?.value || "");
}
export function astField() {
    return astNode("Field");
}
export function match(terminal, merger) {
    return new Matcher(terminal.label, terminal, merger);
}
export class ASTNode {
    nodeType;
    name = "";
    _attr = {};
    children = [];
    classes = [];
    constructor(type) {
        this.nodeType = type;
        this._attr = {};
    }
    prop(key, value) {
        this._attr[key] = String(value);
        return this;
    }
    named(name) {
        this.name = name;
        return this;
    }
    prefixFieldName(prefix) {
        this.prop("fieldName", prefix + this._attr.fieldName);
        return this;
    }
    addName(node, prefix = "") {
        const attrs = attribs(node);
        this.name = prefix + capFirst(attrs?.name || "");
        return this;
    }
    addField(node, fldType) {
        const attrs = attribs(node);
        const type = fldType || getFieldType(attrs?.type || "", null);
        const isOptional = attrs?.minOccurs === "0";
        const isArray = attrs?.maxOccurs === UNBOUNDED;
        this.prop("fieldName", `${attrs?.name || ""}${isOptional ? "?" : ""}`).prop("fieldType", `${type}${isArray ? "[]" : ""}`);
        this.addAttribs(node);
        return this;
    }
    get attr() {
        return this._attr;
    }
    addAttribs(n) {
        if (n.nodeType !== n.ELEMENT_NODE)
            return this;
        const attrs = attribs(n);
        if (!attrs)
            return this;
        for (const [key, value] of Object.entries(attrs)) {
            if (!value)
                continue;
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
    addEnumValue(value) {
        if (!this._attr.values) {
            this._attr.values = [];
        }
        if (Array.isArray(this._attr.values)) {
            this._attr.values.push({ value });
        }
        return this;
    }
    merge(other) {
        const result = new ASTNode(this.nodeType);
        Object.assign(result, this);
        Object.assign(result, other);
        // Special handling for array attributes
        for (const [key, value] of Object.entries(this._attr)) {
            if (Array.isArray(value)) {
                if (value[0] instanceof ASTNode) {
                    result._attr[key] = value;
                }
                else if (typeof value[0] === "string") {
                    result._attr[key] = value;
                }
                else {
                    result._attr[key] = value;
                }
            }
            else {
                result._attr[key] = value;
            }
        }
        // Merge other's attributes
        for (const [key, value] of Object.entries(other._attr)) {
            if (Array.isArray(value)) {
                if (!result._attr[key]) {
                    result._attr[key] = [];
                }
                const target = result._attr[key];
                result._attr[key] = [...target, ...value];
            }
            else {
                result._attr[key] = value;
            }
        }
        result.nodeType = this.nodeType;
        return result;
    }
}
export class Terminal {
    name;
    factory;
    label;
    constructor(name, factory) {
        const [baseName = "", label = ""] = name.split(":");
        this.name = baseName;
        this.label = label;
        this.factory = factory;
    }
    parse(node, indent = "") {
        if (!node || node.nodeType !== node.ELEMENT_NODE)
            return null;
        log(`${indent}Parsing terminal ${this.name}`);
        const localName = xml(node).localName;
        if (localName !== this.name)
            return null;
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
export class OneOf {
    name;
    options;
    _label;
    constructor(name, options) {
        this.name = name;
        this.options = options;
    }
    setLabel(label) {
        this._label = label;
        return this;
    }
    parse(node, indent = "") {
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
export class Matcher {
    name;
    terminal;
    defaultMerger;
    _children = [];
    _label;
    constructor(name, terminal, defaultMerger) {
        this.name = name;
        this.terminal = terminal;
        this.defaultMerger = defaultMerger;
    }
    labeled(label) {
        this._label = label;
        return this;
    }
    addChild(parslet, merger) {
        this._children.push({ parslet, merger });
        return this;
    }
    addChildren(parslets) {
        if (Array.isArray(parslets)) {
            this._children.push(...parslets.map((p) => ({ parslet: p })));
        }
        else {
            this._children.push({ parslet: parslets });
        }
        return this;
    }
    empty() {
        return this;
    }
    parse(node, indent = "") {
        const result = this.terminal.parse(node, indent);
        if (!result)
            return null;
        if (this._label) {
            result.prop("label", this._label);
        }
        if (!this._children.length)
            return result;
        log(`Parsing matcher ${this.name} with ${this._children.length} children`);
        const children = findChildren(node);
        for (const child of children) {
            for (const { parslet, merger } of this._children) {
                const childResult = parslet.parse(child, indent + "  ");
                if (childResult) {
                    log(`Found matching child for ${this.name}:`, childResult.nodeType);
                    if (merger) {
                        Object.assign(result, merger(result, childResult));
                    }
                    else if (this.defaultMerger) {
                        Object.assign(result, this.defaultMerger(result, childResult));
                    }
                    else if (!result.children) {
                        result.children = [childResult];
                    }
                    else {
                        result.children.push(childResult);
                    }
                    break;
                }
            }
        }
        return result;
    }
}
export class Proxy {
    parslet;
    parse(node, indent = "") {
        if (!this.parslet) {
            throw new Error("Proxy parslet not initialized");
        }
        return this.parslet.parse(node, indent);
    }
}
export function getFieldType(type, defNs) {
    if (!type)
        return "any";
    const typeData = { type, namespace: defNs };
    const validatedType = FieldTypeSchema.parse(typeData);
    const validatedTypeStr = validatedType.type || "";
    const parts = validatedTypeStr.toLowerCase().split(":");
    const key = parts[parts.length - 1] || "";
    const typeMap = {
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
    }
    else {
        resultType = resultType
            .split(":")
            .map((p, i, a) => (i < a.length - 1 ? p.toLowerCase() : capFirst(p)))
            .join(".");
    }
    if (resultType === "Number")
        resultType = "number";
    const mappedType = key in typeMap ? typeMap[key] : resultType;
    return mappedType || "any";
}
export function oneOf(options) {
    return new OneOf("OneOf", options);
}
export function hasAttribute(node, attr) {
    const attrs = attribs(node);
    if (!attrs)
        return false;
    return attr in attrs && attrs[attr] !== undefined;
}
