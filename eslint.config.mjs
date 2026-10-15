import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';

/**
 * The architecture in AGENTS.md is enforced here, not by convention.
 *
 * Layer hierarchy (imports may only point down this list, never up):
 *
 *   app  →  modules  →  widgets  →  entity  →  shared  →  pkg
 *
 * Plus three project-specific rules:
 *   1. A module's `elements/` may not import from its parent module.
 *   2. Only `src/app/api/**` and the published layer (`src/server/published`)
 *      may touch the database.
 *   3. The published layer only reads: no Prisma write call compiles there.
 *
 * `src/server/*` is the server-only, read-only layer of published content
 * (AGENTS.md § Data flow): pages, modules and widgets read through it at
 * build time and on revalidation, where the API is not there to call.
 */
const boundaryElements = [
  // Order matters: the first matching pattern wins, so the more specific
  // module-element pattern must be listed before the module pattern.
  { type: 'pkg', pattern: 'pkg/*', capture: ['pkgName'] },
  { type: 'shared', pattern: 'src/shared/*', capture: ['sharedName'] },
  { type: 'entity', pattern: 'src/entity/*', capture: ['entityName'] },
  { type: 'widget', pattern: 'src/widgets/*', capture: ['widgetName'] },
  {
    type: 'module-element',
    pattern: 'src/modules/*/elements/*',
    capture: ['moduleName', 'elementName'],
  },
  { type: 'module', pattern: 'src/modules/*', capture: ['moduleName'] },
  { type: 'server', pattern: 'src/server/*', capture: ['serverName'] },
  { type: 'app', pattern: 'src/app' },
];

const eslintConfig = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'playwright-report/**',
      'test-results/**',
      'prisma/migrations/**',
    ],
  },

  ...nextCoreWebVitals,
  ...nextTypescript,

  {
    // eslint-plugin-react (pulled in by eslint-config-next) crashes on ESLint 10
    // when it auto-detects the React version — it calls a context API that
    // ESLint 10 removed. Declaring the version explicitly skips detection.
    // Must come AFTER the Next configs so it wins the settings merge.
    // Remove once the plugin supports ESLint 10.
    settings: { react: { version: '19.3.0' } },
  },

  // -------------------------------------------------------------------------
  // Architecture boundaries
  // -------------------------------------------------------------------------
  {
    files: ['src/**/*.{ts,tsx}', 'pkg/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/include': ['src/**/*', 'pkg/**/*'],
      'boundaries/elements': boundaryElements,
      'import/resolver': {
        typescript: { alwaysTryTypes: true, project: './tsconfig.json' },
      },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message: '{{from.type}} is not allowed to import {{to.type}}',
          policies: [
            // Third-party packages and Node builtins are always fine; the
            // layering rules are about OUR code, not the dependency tree.
            { allow: { to: { module: { origin: 'external' } } } },
            { allow: { to: { module: { origin: 'builtin' } } } },
            // Files outside the classified layers (CSS, generated types).
            { allow: { to: { element: { type: null } } } },

            {
              from: { element: { type: 'app' } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: ['app', 'module', 'widget', 'server', 'entity', 'shared', 'pkg'],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: 'module' } },
              allow: [
                // A module may use its OWN elements, never another module's.
                {
                  to: {
                    element: {
                      type: 'module-element',
                      captured: { moduleName: '{{from.moduleName}}' },
                    },
                  },
                },
                {
                  to: {
                    element: { types: { anyOf: ['widget', 'server', 'entity', 'shared', 'pkg'] } },
                  },
                },
              ],
            },
            {
              from: { element: { type: 'module-element' } },
              // Deliberately excludes 'module': an element must never reach back
              // up into its parent. Shared logic moves down or comes in as props.
              allow: {
                to: { element: { types: { anyOf: ['widget', 'entity', 'shared', 'pkg'] } } },
              },
            },
            {
              from: { element: { type: 'widget' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['widget', 'server', 'entity', 'shared', 'pkg'] } },
                },
              },
            },
            {
              // The published layer: data in, nothing of the UI.
              from: { element: { type: 'server' } },
              allow: {
                to: { element: { types: { anyOf: ['server', 'entity', 'shared', 'pkg'] } } },
              },
            },
            {
              from: { element: { type: 'entity' } },
              allow: { to: { element: { types: { anyOf: ['entity', 'shared', 'pkg'] } } } },
            },
            {
              from: { element: { type: 'shared' } },
              allow: { to: { element: { types: { anyOf: ['shared', 'pkg'] } } } },
            },
            {
              from: { element: { type: 'pkg' } },
              allow: { to: { element: { type: 'pkg' } } },
            },
          ],
        },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // The database is reachable from exactly one place
  // -------------------------------------------------------------------------
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@pkg/db', '@pkg/db/*', '@prisma/client', '@prisma/client/*'],
              message:
                'Only src/app/api/** and src/server/published may reach the database. In the browser and the dashboard, go through an entity .api.ts which calls /api; a public page reads published content through @/server/published. Content enums live in @/shared/types/enums.',
            },
          ],
        },
      ],
    },
  },
  {
    // Route handlers are the sanctioned data-access layer, and the published
    // layer reads what they publish.
    files: ['src/app/api/**/*.ts', 'src/server/**/*.ts'],
    rules: { '@typescript-eslint/no-restricted-imports': 'off' },
  },

  // -------------------------------------------------------------------------
  // Auth foot-guns
  // -------------------------------------------------------------------------
  {
    files: ['src/**/*.{ts,tsx}', 'pkg/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='getSession']",
          message:
            'supabase.auth.getSession() does not verify the JWT signature — it trusts whatever is in the cookie. Use getUser() (or requireAdmin from @pkg/auth) instead.',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message:
            'Read environment variables through @pkg/config (zod-validated) so a missing or malformed value fails loudly at boot.',
        },
      ],
    },
  },
  {
    // The published layer only reads. A write there would run during a build
    // or a page refresh, outside the dashboard's auth, audit and revalidation.
    files: ['src/server/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='getSession']",
          message:
            'supabase.auth.getSession() does not verify the JWT signature — it trusts whatever is in the cookie. Use getUser() (or requireAdmin from @pkg/auth) instead.',
        },
        {
          selector:
            'CallExpression[callee.property.name=/^(create|createMany|createManyAndReturn|update|updateMany|updateManyAndReturn|upsert|delete|deleteMany|\\$executeRaw|\\$executeRawUnsafe|\\$queryRawUnsafe|\\$transaction)$/]',
          message:
            'src/server/published is read-only. Writes go through a route handler under src/app/api/admin, which checks the session, audits and revalidates.',
        },
      ],
    },
  },
  {
    // The config package is where process.env is legitimately read, and the
    // middleware runs before the server-only config module can be imported.
    // Local operator scripts read process.env directly for the same reason the
    // seed does: they run under tsx, outside Next.js, where pkg/config's
    // `server-only` import would throw.
    files: [
      'pkg/config/**/*.ts',
      'prisma.config.ts',
      'prisma/seed.ts',
      'scripts/**/*.ts',
      '*.config.ts',
    ],
    rules: { 'no-restricted-properties': 'off' },
  },

  // -------------------------------------------------------------------------
  // General
  // -------------------------------------------------------------------------
  {
    files: ['src/**/*.{ts,tsx}', 'pkg/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  prettier,
];

export default eslintConfig;
