/**
 * XSD to TypeScript Class Generator
 * @packageDocumentation
 */

import type { Project } from 'ts-morph'

/**
 * Configuration options for class generation
 */
export interface GeneratorOptions {
  /**
   * Class prefix to add to generated class names
   */
  classPrefix?: string

  /**
   * Whether to generate verbose output
   */
  verbose?: boolean

  /**
   * Postfix to add to plural field names
   */
  pluralPostfix?: string

  /**
   * Project configuration
   */
  project?: Project

  /**
   * XML namespace name
   */
  xmlnsName?: string
}

/**
 * Enables verbose logging mode for debugging purposes
 */
export function verbose(): void

/**
 * Generates TypeScript classes from an XSD schema file
 * 
 * @param xsdFilePath - Path to the XSD schema file
 * @param dependencies - Map of namespace to module path dependencies
 * @param options - Generator options
 * 
 * @throws {XSDParseError} When XSD parsing fails
 * @throws {GenerationError} When class generation fails
 * 
 * @example
 * ```typescript
 * await generateTemplateClassesFromXSD('./schema.xsd')
 * 
 * await generateTemplateClassesFromXSD(
 *   './schema.xsd',
 *   new Map([['dep', './dependency']]),
 *   { xmlnsName: 'customNs' }
 * )
 * ```
 */
export function generateTemplateClassesFromXSD(
  xsdFilePath: string,
  dependencies?: Map<string, string>,
  options?: GeneratorOptions
): Promise<void>

/**
 * Error thrown when XSD parsing fails
 */
export class XSDParseError extends Error {
  readonly xsdPath: string;
  constructor(message: string, xsdPath: string);
}

/**
 * Error thrown when class generation fails
 */
export class GenerationError extends Error {
  readonly cause?: Error;
  constructor(message: string, cause?: Error);
}
