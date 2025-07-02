import { z } from "zod";
export const constants = {
    digits: "0123456789",
    a2z: "abcdefghijklmnopqrstuvwxyz",
    A2Z: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    leestekens: "~§±!@#$%^&*()-_=+[]{}|;:.,'\"".split("").sort().join(""),
    get allW() {
        return this.digits + this.A2Z + this.a2z;
    },
    get allC() {
        return this.allW + this.leestekens;
    },
};
export class RegExpProcessor {
    static MAX_LENGTH = 100;
    static MAX_OPTIONS_LENGTH = 1000;
    static CHAR_TYPE = "char";
    static SPECIALS = {
        "\\d": constants.digits,
        "\\w": constants.allW,
        "\\.": ".",
        "\\-": "-",
        "\\[": "[",
        "\\]": "]",
        "\\{": "{",
        "\\}": "}",
        "\\*": "*",
        "\\+": "+",
        "\\^": "^",
        "\\?": "?",
        ".": constants.allC,
        "\\\\": "\\\\",
    };
    static buildVariants(optionVariants, series, maxLength) {
        const newOptionVariants = new Map();
        for (const ov of optionVariants) {
            for (const s of series) {
                const combined = ov + s;
                if (combined.length <= maxLength) {
                    newOptionVariants.set(combined, 1);
                }
                else {
                    newOptionVariants.set(ov, 1);
                }
            }
        }
        return Array.from(newOptionVariants.keys()).sort();
    }
    static makeVariants(optionVariants, series, maxLength) {
        return this.buildVariants(optionVariants, series.split(""), maxLength);
    }
    static invertSeries(res) {
        return constants.allC
            .split("")
            .filter((e) => !res.includes(e))
            .join("");
    }
    static expandRange(start, end) {
        const startIndex = constants.allW.indexOf(start);
        const endIndex = constants.allW.indexOf(end);
        return constants.allW.slice(startIndex, endIndex + 1);
    }
    static char(index, pattern) {
        const c = pattern[index];
        if (!c)
            return ["", index];
        if (c === "\\") {
            const nextChar = pattern[index + 1];
            const specialKey = nextChar
                ? `\\${nextChar}`
                : undefined;
            if (specialKey && this.SPECIALS[specialKey]) {
                return [this.SPECIALS[specialKey], index + 2];
            }
            return [nextChar ?? "", index + 2];
        }
        return [c, index + 1];
    }
    static series(index, pattern) {
        if (pattern[index] !== "[")
            return ["", index];
        let result = "";
        let i = index + 1;
        let invert = false;
        if (pattern[i] === "^") {
            invert = true;
            i++;
        }
        while (i < pattern.length && pattern[i] !== "]") {
            if (pattern[i] === "-" && i > index + 1 && i < pattern.length - 1) {
                const start = pattern[i - 1] ?? "";
                const end = pattern[i + 1] ?? "";
                result += this.expandRange(start, end);
                i += 2;
            }
            else {
                const [char, newIndex] = this.char(i, pattern);
                result += char;
                i = newIndex;
            }
        }
        return [invert ? this.invertSeries(result) : result, i + 1];
    }
    static specials(index, pattern) {
        const special = pattern.slice(index, index + 2);
        if (special in this.SPECIALS) {
            return [this.SPECIALS[special], index + 2];
        }
        return ["", index];
    }
    static variants(pattern, index = 0, maxLength = this.MAX_LENGTH) {
        const offset = index;
        let options = [""];
        let lastOptionType = null;
        let result = "";
        while (pattern[index] && !["|", ")"].includes(pattern[index] ?? "")) {
            let newIndex;
            [result, newIndex] = this.specials(index, pattern);
            if (result) {
                options = this.makeVariants(options, result, maxLength);
                index = newIndex;
                lastOptionType = "special";
                continue;
            }
            [result, newIndex] = this.series(index, pattern);
            if (result) {
                options = this.makeVariants(options, result, maxLength);
                index = newIndex;
                lastOptionType = "series";
                continue;
            }
            [result, newIndex] = this.char(index, pattern);
            if (result) {
                options = this.makeVariants(options, result, maxLength);
                index = newIndex;
                lastOptionType = this.CHAR_TYPE;
                continue;
            }
            const quantifier = pattern[index] ?? "";
            if (["*", "+", "?"].includes(quantifier) && lastOptionType) {
                if (quantifier === "*" || quantifier === "?") {
                    options = options.map((o) => o.slice(0, -1));
                }
                const chars = (result ?? "").split("");
                chars.unshift("");
                while (options[options.length - 1].length < maxLength &&
                    options.length < this.MAX_OPTIONS_LENGTH) {
                    options = this.buildVariants(options, chars, maxLength);
                    if (quantifier === "?")
                        break;
                }
                index++;
                continue;
            }
            break;
        }
        return [offset === index ? null : options, index];
    }
}
const RegExpOptionsSchema = z.object({
    maxLength: z.number().default(100),
    type: z.string().default("string"),
});
export function regexpPattern2typeAlias(pattern, type = "string", options = { maxLength: 100, type: "string" }) {
    const validatedOptions = RegExpOptionsSchema.parse({ ...options, type });
    if (!pattern)
        return validatedOptions.type;
    try {
        const [variants] = RegExpProcessor.variants(pattern, 0, validatedOptions.maxLength);
        return variants?.join("|") || validatedOptions.type;
    }
    catch (error) {
        console.error("Error parsing regexp pattern:", error);
        return validatedOptions.type;
    }
}
