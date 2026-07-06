/**
 * upup/no-silent-catch — a catch block must make the error LOUD:
 * rethrow, wrap-and-throw, emit an error event, or call a reporter.
 * Intentional swallowing requires a `// upup-catch: <reason>` annotation
 * inside the block, which doubles as the greppable swallow census.
 * Audit provenance: P14 silent-catch triage + 2026-07-06 Sentry-visibility directive.
 */
const REPORTER_CALLEES = new Set(['onError', 'reportError', 'captureException', 'fail']);
const ERROR_EVENT = /(^|:)((upload|pipeline|session)-)?(error|session-expired)$/;

export default {
  meta: {
    type: 'problem',
    docs: { description: 'catch blocks must rethrow, emit an error event, call a reporter, or carry a `upup-catch:` justification' },
    messages: {
      silent: 'Silent catch: rethrow, emit an error event, call a reporter (onError/reportError), or annotate `// upup-catch: <reason>`.',
      consoleOnly: 'console.* is not error handling — a consumer\'s Sentry never sees it. Rethrow, emit, or annotate `// upup-catch: <reason>`.',
    },
    schema: [],
  },
  create(context) {
    const src = context.sourceCode;
    const isLoudCall = (node) =>
      node.type === 'CallExpression' &&
      ((node.callee.type === 'MemberExpression' &&
        node.callee.property.type === 'Identifier' &&
        (node.callee.property.name === 'emit'
          ? node.arguments[0]?.type === 'Literal' && ERROR_EVENT.test(String(node.arguments[0].value))
          : REPORTER_CALLEES.has(node.callee.property.name))) ||
        (node.callee.type === 'Identifier' && REPORTER_CALLEES.has(node.callee.name)));
    const isConsole = (node) =>
      node.type === 'CallExpression' &&
      node.callee.type === 'MemberExpression' &&
      node.callee.object.type === 'Identifier' &&
      node.callee.object.name === 'console';

    return {
      CatchClause(node) {
        const comments = src.getCommentsInside(node.body);
        if (comments.some((c) => /\bupup-catch:\s*\S/.test(c.value))) return;

        let loud = false;
        let sawConsole = false;
        const visit = (n) => {
          if (!n || typeof n.type !== 'string' || loud) return;
          if (n.type === 'ThrowStatement') { loud = true; return; }
          if (isLoudCall(n)) { loud = true; return; }
          if (isConsole(n)) sawConsole = true;
          if (n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression') return; // nested fn bodies run later, not as handling
          for (const key of Object.keys(n)) {
            if (key === 'parent') continue;
            const child = n[key];
            if (Array.isArray(child)) child.forEach(visit);
            else if (child && typeof child.type === 'string') visit(child);
          }
        };
        node.body.body.forEach(visit);

        if (!loud) context.report({ node, messageId: sawConsole ? 'consoleOnly' : 'silent' });
      },
    };
  },
};
