/**
 * AST type definitions for the FDE `when` expression DSL.
 *
 * The DSL is a restricted subset of JavaScript boolean expressions used in
 * `applicability[].when` on program manifests. The grammar accepts only:
 *
 *   - Top-level identifiers: `intent`, `aimTier`, `intake`
 *   - Member access on identifiers: `intake.industry`, `intake.foo.bar`
 *   - Method calls restricted to `.includes(<literal-or-ident>)`
 *   - Literals: string (single or double quoted), number, boolean, null
 *   - Logical operators: `||`, `&&`, `!`
 *   - Equality operators: `===`, `!==`
 *   - Relational operators: `<`, `<=`, `>`, `>=`
 *   - Parenthesized subexpressions
 *
 * The AST is deliberately narrow: it has no loops, no assignments, no
 * function definitions, and no arbitrary method calls. This keeps
 * evaluation pure and bounded (design §Correctness Properties, Property 6).
 *
 * Every node carries a source `location` (1-indexed line/column of its
 * first token) so the evaluator, printer, and downstream tooling can
 * produce useful diagnostics.
 *
 * Task 3.2 will add an evaluator that walks these nodes; task 3.3 adds a
 * canonical printer. The shape declared here is the stable contract for
 * both.
 */

/** Source position (1-indexed), identifying the start of a node or token. */
export interface SourceLocation {
  readonly line: number;
  readonly column: number;
}

/** All AST node kinds in the DSL. */
export type ExprNode =
  | LogicalExpr
  | BinaryExpr
  | UnaryExpr
  | CallExpr
  | MemberExpr
  | Identifier
  | Literal;

/** Logical operators with short-circuit semantics. */
export type LogicalOperator = '&&' | '||';

/**
 * Logical boolean expression (`&&`, `||`).
 *
 * Separated from {@link BinaryExpr} so evaluators can apply short-circuit
 * semantics and printers can reason about precedence cleanly.
 */
export interface LogicalExpr {
  readonly type: 'LogicalExpr';
  readonly operator: LogicalOperator;
  readonly left: ExprNode;
  readonly right: ExprNode;
  readonly location: SourceLocation;
}

/** Equality and relational operators. */
export type BinaryOperator = '===' | '!==' | '<' | '<=' | '>' | '>=';

/** Equality or relational comparison producing a boolean. */
export interface BinaryExpr {
  readonly type: 'BinaryExpr';
  readonly operator: BinaryOperator;
  readonly left: ExprNode;
  readonly right: ExprNode;
  readonly location: SourceLocation;
}

/** The only unary operator in the grammar is logical `!`. */
export type UnaryOperator = '!';

/** Logical negation. */
export interface UnaryExpr {
  readonly type: 'UnaryExpr';
  readonly operator: UnaryOperator;
  readonly argument: ExprNode;
  readonly location: SourceLocation;
}

/**
 * Method call. In the restricted grammar, the only legal method name is
 * `includes` and there is exactly one argument that must itself be either
 * a literal or an identifier chain (top-level identifier with optional
 * member accesses).
 */
export interface CallExpr {
  readonly type: 'CallExpr';
  /** The receiver chain (e.g., `intent` or `intake.industry`). */
  readonly callee: MemberExpr | Identifier;
  /** Name of the method being called; always `'includes'` in this DSL. */
  readonly method: 'includes';
  /** Exactly one argument. */
  readonly argument: Literal | Identifier | MemberExpr;
  readonly location: SourceLocation;
}

/** `object.property` access (non-computed, dot form only). */
export interface MemberExpr {
  readonly type: 'MemberExpr';
  readonly object: MemberExpr | Identifier;
  /** The right-hand-side property name. */
  readonly property: string;
  readonly location: SourceLocation;
}

/**
 * Top-level identifier. The grammar restricts these to a closed set
 * enforced at parse time.
 *
 * Legacy identifiers (`intent`, `aimTier`, `intake`) are preserved for
 * backward compatibility with the existing planner/intake contract.
 *
 * Intention-driven identifiers (`industry`, `regulated`, `aim`, `cloud`,
 * `goals`, `production`, `team`) are added for the intention-driven
 * harness (design §Components — Activation Predicate Model). They map
 * directly to top-level keys of the Intention schema.
 */
export interface Identifier {
  readonly type: 'Identifier';
  readonly name: AllowedIdentifier;
  readonly location: SourceLocation;
}

/** The only top-level identifiers accepted by the parser. */
export type AllowedIdentifier =
  // Legacy — retained for back-compat with existing programs and tests.
  | 'intent'
  | 'aimTier'
  | 'intake'
  // Intention-driven — mirror the top-level fields of Intention.
  | 'industry'
  | 'regulated'
  | 'aim'
  | 'cloud'
  | 'goals'
  | 'production'
  | 'team'
  | 'workload';

/** The closed set of allowed top-level identifiers, as a runtime array. */
export const ALLOWED_IDENTIFIERS: readonly AllowedIdentifier[] = [
  'intent',
  'aimTier',
  'intake',
  'industry',
  'regulated',
  'aim',
  'cloud',
  'goals',
  'production',
  'team',
  'workload',
] as const;

/** Literal value: string, number, boolean, or null. */
export type Literal = StringLiteral | NumberLiteral | BooleanLiteral | NullLiteral;

/** String literal (single- or double-quoted in source). */
export interface StringLiteral {
  readonly type: 'Literal';
  readonly valueType: 'string';
  readonly value: string;
  readonly location: SourceLocation;
}

/** Numeric literal (integer or float; non-negative — negation is not part of the grammar). */
export interface NumberLiteral {
  readonly type: 'Literal';
  readonly valueType: 'number';
  readonly value: number;
  readonly location: SourceLocation;
}

/** Boolean literal (`true` / `false`). */
export interface BooleanLiteral {
  readonly type: 'Literal';
  readonly valueType: 'boolean';
  readonly value: boolean;
  readonly location: SourceLocation;
}

/** Null literal. */
export interface NullLiteral {
  readonly type: 'Literal';
  readonly valueType: 'null';
  readonly value: null;
  readonly location: SourceLocation;
}
