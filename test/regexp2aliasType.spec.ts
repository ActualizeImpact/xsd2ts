import { describe, it, expect } from 'vitest'
import { RegExpProcessor, regexpPattern2typeAlias, constants } from "../src/regexp2aliasType.js"

const { allC } = constants
const allchars = allC.split("").sort().map(e => `"${e.replace('"', '\\"')}"`).join('|')

describe("regexpPattern2typeAlias", () => {
    it("returns type alias for regexps", () => {
        expect(regexpPattern2typeAlias('', 'string')).toBe('string')
        expect(regexpPattern2typeAlias('.', 'string')).toBe(allchars)
        expect(regexpPattern2typeAlias('A', 'string')).toBe('"A"')
        expect(regexpPattern2typeAlias('A|B|C', 'string')).toBe('"A"|"B"|"C"')
        expect(regexpPattern2typeAlias('[ABC]', 'string')).toBe('"A"|"B"|"C"')
        expect(regexpPattern2typeAlias('A[12]', 'string')).toBe('"A1"|"A2"')
        expect(regexpPattern2typeAlias('A[12]|B|C[34]', 'string')).toBe('"A1"|"A2"|"B"|"C3"|"C4"')
        expect(regexpPattern2typeAlias('A[\\d]|B', 'string')).toBe('"A0"|"A1"|"A2"|"A3"|"A4"|"A5"|"A6"|"A7"|"A8"|"A9"|"B"')
        expect(regexpPattern2typeAlias('pre|[b-dC-E4-7]|mid|[A]|post', 'string')).toBe('"pre"|"4"|"5"|"6"|"7"|"C"|"D"|"E"|"b"|"c"|"d"|"mid"|"A"|"post"')
        expect(regexpPattern2typeAlias('a[b-c1-3]', 'string')).toBe('"a1"|"a2"|"a3"|"ab"|"ac"')
        expect(regexpPattern2typeAlias("[P\\-][B\\-][A\\-]", 'string')).toBe('"---"|"--A"|"-B-"|"-BA"|"P--"|"P-A"|"PB-"|"PBA"')
        expect(regexpPattern2typeAlias("[\\d]+", 'number', {maxLength: 1})).toBe('0|1|2|3|4|5|6|7|8|9')
        expect(regexpPattern2typeAlias("\\d+", 'number', {maxLength: 2})).toBe('0|1|2|3|4|5|6|7|8|9')
        expect(regexpPattern2typeAlias("[\\d]+", 'number', {maxLength: 2})).toEqual('0|1|2|3|4|5|6|7|8|9')
        expect(regexpPattern2typeAlias("\\d+", 'number', {maxLength: 1})).toBe('0|1|2|3|4|5|6|7|8|9')
        expect(regexpPattern2typeAlias("AB*", 'string', {maxLength: 3})).toEqual('"A"|"AB"|"ABB"')
        expect(regexpPattern2typeAlias("AB+", 'string', {maxLength: 5})).toEqual('"AB"|"ABB"|"ABBB"|"ABBBB"')
        expect(regexpPattern2typeAlias("[^A-Z]+", 'string', {maxLength: 2})).toEqual('string')
        expect(regexpPattern2typeAlias("[^!]", 'string', {maxLength: 1})).toEqual(allchars.replace('"!"|', ''))
        expect(regexpPattern2typeAlias("[^0]", 'string', {maxLength: 1})).toEqual(allchars.replace('"0"|', ''))
        expect(regexpPattern2typeAlias("AB?", 'string', {maxLength: 2})).toEqual('"A"|"AB"')
    })
})

describe("RegExpProcessor", () => {
    it("processes basic patterns", () => {
        const [variants] = RegExpProcessor.variants('AB{3,5}')
        expect(variants?.join('|')).toBe('ABBB|ABBBB|ABBBBB')
    })

    it("handles character classes", () => {
        const [variants] = RegExpProcessor.variants('[ABC]')
        expect(variants?.join('|')).toBe('A|B|C')
    })

    it("processes special characters", () => {
        const [variants] = RegExpProcessor.variants('\\d')
        expect(variants?.join('|')).toBe('0|1|2|3|4|5|6|7|8|9')
    })

    it("handles ranges", () => {
        const [variants] = RegExpProcessor.variants('[A-C]')
        expect(variants?.join('|')).toBe('A|B|C')
    })

    it("processes quantifiers", () => {
        const [variants] = RegExpProcessor.variants('A?')
        expect(variants?.join('|')).toBe('|A')

        const [variants2] = RegExpProcessor.variants('A+', 0)
        expect(variants2?.join('|')).toBe('A|AA|AAA')

        const [variants3] = RegExpProcessor.variants('A*', 0)
        expect(variants3?.join('|')).toBe('|A|AA|AAA')
    })

    it("handles groups", () => {
        const [variants] = RegExpProcessor.variants('(A|B)C')
        expect(variants?.join('|')).toBe('AC|BC')
    })

    it("processes complex patterns", () => {
        const [variants] = RegExpProcessor.variants('A[1-3]+(B|C)?')
        expect(variants?.join('|')).toBe('A1|A1B|A1C|A2|A2B|A2C|A3|A3B|A3C')
    })

    it("processes quantifiers with specific lengths", () => {
        expect(regexpPattern2typeAlias('A+', 'string', { maxLength: 3 }))
            .toBe('"A"|"AA"|"AAA"')
        
        expect(regexpPattern2typeAlias('A*', 'string', { maxLength: 3 }))
            .toBe('"|A"|"AA"|"AAA"')
    })
})
