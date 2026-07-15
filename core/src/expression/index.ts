/**
 * Expression evaluator — sandboxed DSL for `applicability[].when`.
 *
 * Hand-rolled recursive-descent parser → AST → evaluator.
 * No `eval`, no `Function` constructor, no `require`, no dynamic `import`.
 *
 * Grammar (EBNF):
 *   Expr        = LogicalOr
 *   LogicalOr   = LogicalAnd ( "||" LogicalAnd )*
 *   LogicalAnd  = Unary ( "&&" Unary )*
 *   Unary       = "!" Unary | Comparison
 *   Comparison  = Primary ( ( "===" | "!==" | "<" | "<=" | ">" | ">=" ) Primary )?
 *   Primary     = Literal | Identifier Chain | "(" Expr ")"
 *   Chain       = ( "." Ident ( "(" Arg ")" )? )*
 *   Literal     = String | Number | Boolean | Null
 */

import type {
  ExprNode,
  Identifier,
  MemberExpr,
  Literal,
  CallExpr,
  BinaryExpr,
  UnaryExpr,
  LogicalExpr,
  SourceLocation,
  AllowedIdentifier,
  BinaryOperator,
} from "./ast.js";
import { ALLOWED_IDENTIFIERS } from "./ast.js";

/* ------------------------------------------------------------------ */
/*  Token types                                                        */
/* ------------------------------------------------------------------ */

type TokenType =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "ident"
  | "dot"
  | "lparen"
  | "rparen"
  | "and"
  | "or"
  | "not"
  | "eq"
  | "neq"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "eof";

interface Token {
  type: TokenType;
  value: string;
  loc: SourceLocation;
}

/* ------------------------------------------------------------------ */
/*  Lexer                                                              */
/* ------------------------------------------------------------------ */


export class ExpressionSyntaxError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number,
  ) {
    super(`${message} at ${line}:${column}`);
    this.name = "ExpressionSyntaxError";
  }
}

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  function loc(): SourceLocation {
    return { line, column: col };
  }

  function advance(n = 1): void {
    for (let k = 0; k < n; k++) {
      if (src[i] === "\n") {
        line++;
        col = 1;
      } else {
        col++;
      }
      i++;
    }
  }

  while (i < src.length) {
    const ch = src[i]!;

    // Whitespace
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      advance();
      continue;
    }

    // Two-char operators
    if (i + 2 < src.length) {
      const two = src.slice(i, i + 2);
      if (two === "&&") { tokens.push({ type: "and", value: "&&", loc: loc() }); advance(2); continue; }
      if (two === "||") { tokens.push({ type: "or", value: "||", loc: loc() }); advance(2); continue; }
      if (two === "<=") { tokens.push({ type: "lte", value: "<=", loc: loc() }); advance(2); continue; }
      if (two === ">=") { tokens.push({ type: "gte", value: ">=", loc: loc() }); advance(2); continue; }
    }

    // Three-char operators
    if (i + 2 < src.length) {
      const three = src.slice(i, i + 3);
      if (three === "===") { tokens.push({ type: "eq", value: "===", loc: loc() }); advance(3); continue; }
      if (three === "!==") { tokens.push({ type: "neq", value: "!==", loc: loc() }); advance(3); continue; }
    }

    // Single-char tokens
    if (ch === "!") { tokens.push({ type: "not", value: "!", loc: loc() }); advance(); continue; }
    if (ch === "<") { tokens.push({ type: "lt", value: "<", loc: loc() }); advance(); continue; }
    if (ch === ">") { tokens.push({ type: "gt", value: ">", loc: loc() }); advance(); continue; }
    if (ch === "(") { tokens.push({ type: "lparen", value: "(", loc: loc() }); advance(); continue; }
    if (ch === ")") { tokens.push({ type: "rparen", value: ")", loc: loc() }); advance(); continue; }
    if (ch === ".") { tokens.push({ type: "dot", value: ".", loc: loc() }); advance(); continue; }

    // String literals
    if (ch === "'" || ch === '"') {
      const quote = ch;
      const start = loc();
      advance(); // skip opening quote
      let val = "";
      while (i < src.length && src[i] !== quote) {
        if (src[i] === "\\") {
          advance();
          if (i < src.length) { val += src[i]; advance(); }
        } else {
          val += src[i];
          advance();
        }
      }
      if (i >= src.length) throw new ExpressionSyntaxError("Unterminated string", start.line, start.column);
      advance(); // skip closing quote
      tokens.push({ type: "string", value: val, loc: start });
      continue;
    }

    // Number literals
    if (ch >= "0" && ch <= "9") {
      const start = loc();
      let num = "";
      while (i < src.length && ((src[i]! >= "0" && src[i]! <= "9") || src[i] === ".")) {
        num += src[i];
        advance();
      }
      tokens.push({ type: "number", value: num, loc: start });
      continue;
    }

    // Identifiers and keywords
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_") {
      const start = loc();
      let ident = "";
      while (i < src.length && /[a-zA-Z0-9_]/.test(src[i]!)) {
        ident += src[i];
        advance();
      }
      if (ident === "true" || ident === "false") {
        tokens.push({ type: "boolean", value: ident, loc: start });
      } else if (ident === "null") {
        tokens.push({ type: "null", value: "null", loc: start });
      } else {
        tokens.push({ type: "ident", value: ident, loc: start });
      }
      continue;
    }

    throw new ExpressionSyntaxError(`Unexpected character '${ch}'`, line, col);
  }

  tokens.push({ type: "eof", value: "", loc: loc() });
  return tokens;
}


/* ------------------------------------------------------------------ */
/*  Parser                                                             */
/* ------------------------------------------------------------------ */

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  private peek(): Token {
    return this.tokens[this.pos]!;
  }

  private eat(type: TokenType): Token {
    const t = this.peek();
    if (t.type !== type) {
      throw new ExpressionSyntaxError(
        `Expected ${type} but got ${t.type} ('${t.value}')`,
        t.loc.line,
        t.loc.column,
      );
    }
    this.pos++;
    return t;
  }

  parse(): ExprNode {
    const node = this.parseLogicalOr();
    if (this.peek().type !== "eof") {
      const t = this.peek();
      throw new ExpressionSyntaxError(
        `Unexpected token '${t.value}'`,
        t.loc.line,
        t.loc.column,
      );
    }
    return node;
  }

  private parseLogicalOr(): ExprNode {
    let left = this.parseLogicalAnd();
    while (this.peek().type === "or") {
      const op = this.eat("or");
      const right = this.parseLogicalAnd();
      left = {
        type: "LogicalExpr",
        operator: "||",
        left,
        right,
        location: op.loc,
      } satisfies LogicalExpr;
    }
    return left;
  }

  private parseLogicalAnd(): ExprNode {
    let left = this.parseUnary();
    while (this.peek().type === "and") {
      const op = this.eat("and");
      const right = this.parseUnary();
      left = {
        type: "LogicalExpr",
        operator: "&&",
        left,
        right,
        location: op.loc,
      } satisfies LogicalExpr;
    }
    return left;
  }

  private parseUnary(): ExprNode {
    if (this.peek().type === "not") {
      const op = this.eat("not");
      const argument = this.parseUnary();
      return {
        type: "UnaryExpr",
        operator: "!",
        argument,
        location: op.loc,
      } satisfies UnaryExpr;
    }
    return this.parseComparison();
  }

  private parseComparison(): ExprNode {
    const left = this.parsePrimary();
    const t = this.peek();
    const compOps: TokenType[] = ["eq", "neq", "lt", "lte", "gt", "gte"];
    if (compOps.includes(t.type)) {
      this.pos++;
      const right = this.parsePrimary();
      const opMap: Record<string, BinaryOperator> = {
        eq: "===",
        neq: "!==",
        lt: "<",
        lte: "<=",
        gt: ">",
        gte: ">=",
      };
      return {
        type: "BinaryExpr",
        operator: opMap[t.type]!,
        left,
        right,
        location: t.loc,
      } satisfies BinaryExpr;
    }
    return left;
  }

  private parsePrimary(): ExprNode {
    const t = this.peek();

    // Parenthesized expression
    if (t.type === "lparen") {
      this.eat("lparen");
      const expr = this.parseLogicalOr();
      this.eat("rparen");
      return expr;
    }

    // Literals
    if (t.type === "string") {
      this.pos++;
      return { type: "Literal", valueType: "string", value: t.value, location: t.loc };
    }
    if (t.type === "number") {
      this.pos++;
      return { type: "Literal", valueType: "number", value: Number(t.value), location: t.loc };
    }
    if (t.type === "boolean") {
      this.pos++;
      return { type: "Literal", valueType: "boolean", value: t.value === "true", location: t.loc };
    }
    if (t.type === "null") {
      this.pos++;
      return { type: "Literal", valueType: "null", value: null, location: t.loc };
    }

    // Identifier (must be in allowed set)
    if (t.type === "ident") {
      if (!ALLOWED_IDENTIFIERS.includes(t.value as AllowedIdentifier)) {
        throw new ExpressionSyntaxError(
          `Unknown identifier '${t.value}'; allowed: ${ALLOWED_IDENTIFIERS.join(", ")}`,
          t.loc.line,
          t.loc.column,
        );
      }
      this.pos++;
      let node: Identifier | MemberExpr | CallExpr = {
        type: "Identifier",
        name: t.value as AllowedIdentifier,
        location: t.loc,
      };

      // Member access chain and method calls
      while (this.peek().type === "dot") {
        const dotTok = this.eat("dot");
        const prop = this.eat("ident");

        // Check for method call: .includes(arg)
        if (prop.value === "includes" && this.peek().type === "lparen") {
          this.eat("lparen");
          const arg = this.parseCallArgument();
          this.eat("rparen");
          node = {
            type: "CallExpr",
            callee: node as Identifier | MemberExpr,
            method: "includes",
            argument: arg,
            location: dotTok.loc,
          } satisfies CallExpr;
        } else {
          node = {
            type: "MemberExpr",
            object: node as Identifier | MemberExpr,
            property: prop.value,
            location: dotTok.loc,
          } satisfies MemberExpr;
        }
      }

      return node;
    }

    throw new ExpressionSyntaxError(
      `Unexpected token '${t.value}'`,
      t.loc.line,
      t.loc.column,
    );
  }

  private parseCallArgument(): Literal | Identifier | MemberExpr {
    const t = this.peek();

    if (t.type === "string") {
      this.pos++;
      return { type: "Literal", valueType: "string", value: t.value, location: t.loc };
    }
    if (t.type === "number") {
      this.pos++;
      return { type: "Literal", valueType: "number", value: Number(t.value), location: t.loc };
    }
    if (t.type === "boolean") {
      this.pos++;
      return { type: "Literal", valueType: "boolean", value: t.value === "true", location: t.loc };
    }
    if (t.type === "null") {
      this.pos++;
      return { type: "Literal", valueType: "null", value: null, location: t.loc };
    }

    if (t.type === "ident") {
      if (!ALLOWED_IDENTIFIERS.includes(t.value as AllowedIdentifier)) {
        throw new ExpressionSyntaxError(
          `Unknown identifier '${t.value}' in call argument`,
          t.loc.line,
          t.loc.column,
        );
      }
      this.pos++;
      let node: Identifier | MemberExpr = {
        type: "Identifier",
        name: t.value as AllowedIdentifier,
        location: t.loc,
      };
      while (this.peek().type === "dot") {
        const dotTok = this.eat("dot");
        const prop = this.eat("ident");
        node = {
          type: "MemberExpr",
          object: node,
          property: prop.value,
          location: dotTok.loc,
        };
      }
      return node;
    }

    throw new ExpressionSyntaxError(
      `Expected literal or identifier in call argument, got '${t.value}'`,
      t.loc.line,
      t.loc.column,
    );
  }
}


/* ------------------------------------------------------------------ */
/*  Public parse function                                              */
/* ------------------------------------------------------------------ */

/**
 * Parse a `when` expression string into an AST.
 * Throws {@link ExpressionSyntaxError} synchronously on invalid input.
 */
export function parse(src: string): ExprNode {
  const tokens = tokenize(src);
  return new Parser(tokens).parse();
}

/* ------------------------------------------------------------------ */
/*  Evaluator                                                          */
/* ------------------------------------------------------------------ */

/** Context supplied to expression evaluation.
 *
 * Legacy identifiers (`intent`, `aimTier`, `intake`) are preserved so
 * existing program manifests continue to evaluate unchanged.
 *
 * Intention-driven identifiers (`industry`, `regulated`, `aim`, `cloud`,
 * `goals`, `production`, `team`) are added for the intention-driven
 * harness. They map directly to top-level keys of the Intention schema
 * (design.md §Activation Predicate Model).
 *
 * All intention-driven fields are optional so a context can be built
 * from a legacy intake or from a full Intention interchangeably. Missing
 * member access propagates `undefined` per the existing evaluator
 * semantics; strict equality never throws.
 */
export interface ExpressionContext {
  // Legacy fields.
  intent: string[];
  aimTier?: number | undefined;
  intake: Record<string, unknown>;

  // Intention-driven fields.
  industry?: string | undefined;
  regulated?: boolean | undefined;
  aim?: Record<string, unknown> | undefined;
  cloud?: Record<string, unknown> | undefined;
  goals?: readonly string[] | undefined;
  production?: Record<string, unknown> | undefined;
  team?: Record<string, unknown> | undefined;
  workload?: Record<string, unknown> | undefined;
}

/**
 * Evaluate a parsed AST against a context, returning a boolean.
 *
 * The evaluator is pure: no I/O, no network, no process spawning.
 * It terminates in bounded time because the AST has no loops or recursion
 * constructs — it is a finite tree walked once.
 */
export function evaluate(node: ExprNode, ctx: ExpressionContext): boolean {
  const result = evalNode(node, ctx);
  return Boolean(result);
}

function evalNode(node: ExprNode, ctx: ExpressionContext): unknown {
  switch (node.type) {
    case "Literal":
      return node.value;

    case "Identifier":
      return resolveIdentifier(node.name, ctx);

    case "MemberExpr":
      return resolveMember(node, ctx);

    case "UnaryExpr":
      return !evalNode(node.argument, ctx);

    case "LogicalExpr":
      if (node.operator === "&&") {
        return evalNode(node.left, ctx) && evalNode(node.right, ctx);
      }
      return evalNode(node.left, ctx) || evalNode(node.right, ctx);

    case "BinaryExpr":
      return evalBinary(node, ctx);

    case "CallExpr":
      return evalCall(node, ctx);
  }
}

function resolveIdentifier(name: string, ctx: ExpressionContext): unknown {
  switch (name) {
    // Legacy identifiers.
    case "intent":
      return ctx.intent;
    case "aimTier":
      return ctx.aimTier;
    case "intake":
      return ctx.intake;
    // Intention-driven identifiers. Missing fields return `undefined`,
    // matching the existing member-access semantics.
    case "industry":
      return ctx.industry;
    case "regulated":
      return ctx.regulated;
    case "aim":
      return ctx.aim;
    case "cloud":
      return ctx.cloud;
    case "goals":
      return ctx.goals;
    case "production":
      return ctx.production;
    case "team":
      return ctx.team;
    case "workload":
      return ctx.workload;
    default:
      return undefined;
  }
}

function resolveMember(node: MemberExpr, ctx: ExpressionContext): unknown {
  const obj = node.object.type === "MemberExpr"
    ? resolveMember(node.object, ctx)
    : resolveIdentifier((node.object as Identifier).name, ctx);

  if (obj == null || typeof obj !== "object") return undefined;
  return (obj as Record<string, unknown>)[node.property];
}

function evalBinary(node: BinaryExpr, ctx: ExpressionContext): boolean {
  const left = evalNode(node.left, ctx);
  const right = evalNode(node.right, ctx);
  switch (node.operator) {
    case "===": return left === right;
    case "!==": return left !== right;
    case "<":   return (left as number) < (right as number);
    case "<=":  return (left as number) <= (right as number);
    case ">":   return (left as number) > (right as number);
    case ">=":  return (left as number) >= (right as number);
  }
}

function evalCall(node: CallExpr, ctx: ExpressionContext): boolean {
  const receiver = node.callee.type === "Identifier"
    ? resolveIdentifier(node.callee.name, ctx)
    : resolveMember(node.callee as MemberExpr, ctx);

  const arg = node.argument.type === "Literal"
    ? node.argument.value
    : node.argument.type === "Identifier"
      ? resolveIdentifier(node.argument.name, ctx)
      : resolveMember(node.argument as MemberExpr, ctx);

  if (Array.isArray(receiver)) {
    return receiver.includes(arg);
  }
  if (typeof receiver === "string") {
    return receiver.includes(String(arg));
  }
  return false;
}

/* ------------------------------------------------------------------ */
/*  Printer                                                            */
/* ------------------------------------------------------------------ */

/**
 * Emit a canonical textual form from an AST.
 * Stable parenthesization and whitespace for round-trip fidelity.
 */
export function print(node: ExprNode): string {
  switch (node.type) {
    case "Literal":
      if (node.valueType === "string") return `'${node.value}'`;
      if (node.valueType === "null") return "null";
      return String(node.value);

    case "Identifier":
      return node.name;

    case "MemberExpr":
      return `${print(node.object)}.${node.property}`;

    case "UnaryExpr":
      return `!${wrapIfNeeded(node.argument, "UnaryExpr")}`;

    case "LogicalExpr": {
      const l = wrapIfNeeded(node.left, node.type, node.operator);
      const r = wrapIfNeeded(node.right, node.type, node.operator);
      return `${l} ${node.operator} ${r}`;
    }

    case "BinaryExpr": {
      const l = wrapIfNeeded(node.left, "BinaryExpr");
      const r = wrapIfNeeded(node.right, "BinaryExpr");
      return `${l} ${node.operator} ${r}`;
    }

    case "CallExpr":
      return `${print(node.callee)}.${node.method}(${print(node.argument)})`;
  }
}

const PRECEDENCE: Record<string, number> = {
  "||": 1,
  "&&": 2,
  "BinaryExpr": 3,
  "UnaryExpr": 4,
};

function precedenceOf(node: ExprNode): number {
  if (node.type === "LogicalExpr") return PRECEDENCE[node.operator] ?? 0;
  if (node.type === "BinaryExpr") return PRECEDENCE["BinaryExpr"] ?? 0;
  if (node.type === "UnaryExpr") return PRECEDENCE["UnaryExpr"] ?? 0;
  return 10; // literals, identifiers, members, calls — never need wrapping
}

function wrapIfNeeded(child: ExprNode, _parentType: string, parentOp?: string): string {
  const childPrec = precedenceOf(child);
  let parentPrec: number;
  if (parentOp) {
    parentPrec = PRECEDENCE[parentOp] ?? 0;
  } else {
    parentPrec = PRECEDENCE[_parentType] ?? 0;
  }
  const printed = print(child);
  if (childPrec < parentPrec) return `(${printed})`;
  return printed;
}
