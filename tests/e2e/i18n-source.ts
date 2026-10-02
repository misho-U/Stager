import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

/**
 * Reads the dashboard's source the way a reviewer would, for admin-i18n.spec.ts:
 * where it shows wording, and which messages it asks for.
 */

const ROOT = process.cwd();

/** Everything the dashboard renders, besides the admin-* modules. */
const DASHBOARD_SOURCE = [
  'src/app/admin',
  'src/shared/components',
  'src/widgets/admin-locale-switch',
  'src/widgets/admin-sidebar',
  'src/widgets/admin-theme-switch',
  'src/widgets/media-gallery-picker',
  'src/widgets/media-picker',
];

/** Everything that asks for a message. */
const TRANSLATED_SOURCE = [...DASHBOARD_SOURCE, 'src/shared/lib', 'pkg/mail'];

/** The brand is written the same in every language. */
const ALLOWED = new Set(['STAGER']);

/** Props whose value is read or heard by a person. */
const WORDING_PROPS = new Set([
  'alt',
  'aria-description',
  'aria-label',
  'caption',
  'confirmLabel',
  'description',
  'emptyDescription',
  'emptyTitle',
  'header',
  'hint',
  'label',
  'message',
  'placeholder',
  'title',
]);

/**
 * Object keys that carry wording into a component, like a table column's
 * `header`. Not `placeholder` or `alt`: in an object those are as likely a
 * setting (next/image's `placeholder: 'blur'`) or data.
 */
const WORDING_KEYS = new Set([...WORDING_PROPS].filter((key) => key !== 'placeholder' && key !== 'alt'));

const HAS_LETTERS = /[A-Za-zႠ-ჿᲐ-Ჿ]/;

function sourceFiles(dirs: string[]): string[] {
  const walk = (dir: string): string[] =>
    readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
      const relative = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(relative);
      return /\.tsx?$/.test(entry.name) ? [relative] : [];
    });
  const adminModules = readdirSync(path.join(ROOT, 'src/modules'))
    .filter((name) => name.startsWith('admin-'))
    .map((name) => `src/modules/${name}`);
  return [...dirs, ...adminModules].flatMap(walk).sort();
}

function parse(file: string): ts.SourceFile {
  return ts.createSourceFile(
    file,
    readFileSync(path.join(ROOT, file), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

/**
 * The string literals an expression can evaluate to, through the ways a value
 * flows into JSX (`a ? 'Yes' : 'No'`, `x ?? 'None'`, template text) — but not
 * into a call, a comparison or an index, where a string is data.
 */
function literalValues(node: ts.Expression): Array<{ node: ts.Node; text: string }> {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return [{ node, text: node.text }];
  }
  if (ts.isTemplateExpression(node)) {
    return [node.head, ...node.templateSpans.map((span) => span.literal)].map((part) => ({
      node: part,
      text: part.text,
    }));
  }
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isNonNullExpression(node)
  ) {
    return literalValues(node.expression);
  }
  if (ts.isConditionalExpression(node)) {
    return [...literalValues(node.whenTrue), ...literalValues(node.whenFalse)];
  }
  if (ts.isBinaryExpression(node)) {
    const operator = node.operatorToken.kind;
    if (operator === ts.SyntaxKind.AmpersandAmpersandToken) return literalValues(node.right);
    if (
      operator === ts.SyntaxKind.BarBarToken ||
      operator === ts.SyntaxKind.QuestionQuestionToken
    ) {
      return [...literalValues(node.left), ...literalValues(node.right)];
    }
  }
  return [];
}

/** Wording written into the dashboard's code instead of its message files. */
export function findHardCodedWording(): string[] {
  const found: string[] = [];

  for (const file of sourceFiles(DASHBOARD_SOURCE)) {
    const source = parse(file);
    const report = (node: ts.Node, text: string) => {
      const value = text.replace(/\s+/g, ' ').trim();
      if (!HAS_LETTERS.test(value) || ALLOWED.has(value)) return;
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
      found.push(`${file}:${line + 1}  ${JSON.stringify(value)}`);
    };

    const visit = (node: ts.Node) => {
      if (ts.isJsxText(node)) {
        report(node, node.text);
      } else if (
        ts.isJsxExpression(node) &&
        node.expression &&
        (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
      ) {
        for (const value of literalValues(node.expression)) report(value.node, value.text);
      } else if (ts.isJsxAttribute(node) && node.initializer) {
        if (WORDING_PROPS.has(node.name.getText(source))) {
          const { initializer } = node;
          if (ts.isStringLiteral(initializer)) report(initializer, initializer.text);
          else if (ts.isJsxExpression(initializer) && initializer.expression) {
            for (const value of literalValues(initializer.expression)) {
              report(value.node, value.text);
            }
          }
        }
      } else if (
        ts.isPropertyAssignment(node) &&
        WORDING_KEYS.has(node.name.getText(source).replace(/['"]/g, ''))
      ) {
        for (const value of literalValues(node.initializer)) report(value.node, value.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  return found;
}

/** The function that creates a translator, and the namespace it was given. */
function translatorNamespace(call: ts.CallExpression, source: ts.SourceFile): string | null {
  const callee = call.expression.getText(source);
  const [first] = call.arguments;
  if (callee === 'useTranslations' || callee === 'getTranslations') {
    return first && ts.isStringLiteral(first) ? first.text : '';
  }
  if (callee === 'createTranslator' && first && ts.isObjectLiteralExpression(first)) {
    const namespace = first.properties.find(
      (property): property is ts.PropertyAssignment =>
        ts.isPropertyAssignment(property) && property.name.getText(source) === 'namespace',
    );
    return namespace && ts.isStringLiteral(namespace.initializer)
      ? namespace.initializer.text
      : '';
  }
  return null;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Message keys the code asks for that a language does not have. A key built
 * from a template (`sidebar.nav.${item}`) must match at least one message.
 *
 * `keys` holds each language's messages as the dashboard sees them: the site's
 * own, plus `admin.*`. The email's translator is rooted at its own messages.
 */
export function findMissingKeys(keys: Record<string, Set<string>>): string[] {
  const missing: string[] = [];

  for (const file of sourceFiles(TRANSLATED_SOURCE)) {
    const source = parse(file);
    const namespaces = new Map<string, string>();

    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && node.initializer) {
        const init = ts.isAwaitExpression(node.initializer)
          ? node.initializer.expression
          : node.initializer;
        if (ts.isCallExpression(init)) {
          const namespace = translatorNamespace(init, source);
          if (namespace !== null) {
            // createTranslator in pkg/mail is rooted at the email's messages.
            const rooted = init.expression.getText(source) === 'createTranslator';
            namespaces.set(node.name.getText(source), rooted ? `admin.${namespace}` : namespace);
          }
        }
      }
      // form-errors.ts takes the `admin` translator as a parameter.
      if (
        ts.isParameter(node) &&
        node.name.getText(source) === 't' &&
        node.type?.getText(source) === 'Translate'
      ) {
        namespaces.set('t', 'admin');
      }

      if (ts.isCallExpression(node) && node.arguments[0]) {
        const callee = node.expression;
        const name = ts.isIdentifier(callee)
          ? callee.text
          : ts.isPropertyAccessExpression(callee) &&
              callee.name.text === 'has' &&
              ts.isIdentifier(callee.expression)
            ? callee.expression.text
            : null;
        const namespace = name === null ? undefined : namespaces.get(name);

        if (namespace !== undefined) {
          const [argument] = node.arguments;
          const prefix = namespace ? `${namespace}.` : '';
          const { line } = source.getLineAndCharacterOfPosition(argument.getStart(source));
          const where = `${file}:${line + 1}`;

          if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) {
            for (const [locale, available] of Object.entries(keys)) {
              if (!available.has(prefix + argument.text)) {
                missing.push(`${where}  ${locale}: ${prefix}${argument.text}`);
              }
            }
          } else if (ts.isTemplateExpression(argument)) {
            const parts = [argument.head, ...argument.templateSpans.map((span) => span.literal)];
            const pattern = new RegExp(
              `^${escape(prefix)}${parts.map((part) => escape(part.text)).join('[^.]+')}$`,
            );
            for (const [locale, available] of Object.entries(keys)) {
              if (![...available].some((key) => pattern.test(key))) {
                missing.push(`${where}  ${locale}: nothing matches ${pattern}`);
              }
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  return missing;
}
