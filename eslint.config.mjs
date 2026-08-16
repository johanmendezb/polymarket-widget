import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/**
 * The import-boundary table from docs/04-architecture/ARCHITECTURE.md §3.
 *
 * `target` is the importing module, `from` is what it may not reach for.
 * Each zone is therefore the complement of that module's allow-list. A
 * deliberate violation must fail `pnpm lint`; that is acceptance criterion 3
 * of T1.1 and it is what keeps `domain` and `simulation` pure.
 */
const boundaryZones = [
  // domain imports nothing internal.
  {
    target: './src/domain',
    from: [
      './src/polymarket',
      './src/simulation',
      './src/ai',
      './src/ui',
      './src/lib',
      './src/app',
    ],
    message: 'src/domain must import nothing internal. See ARCHITECTURE.md §3.',
  },
  // polymarket may import domain.
  {
    target: './src/polymarket',
    from: ['./src/simulation', './src/ai', './src/ui', './src/lib', './src/app'],
    message: 'src/polymarket may import only src/domain. See ARCHITECTURE.md §3.',
  },
  // simulation may import domain.
  {
    target: './src/simulation',
    from: ['./src/polymarket', './src/ai', './src/ui', './src/lib', './src/app'],
    message: 'src/simulation may import only src/domain. See ARCHITECTURE.md §3.',
  },
  // ai may import domain and simulation.
  {
    target: './src/ai',
    from: ['./src/polymarket', './src/ui', './src/lib', './src/app'],
    message: 'src/ai may import only src/domain and src/simulation. See ARCHITECTURE.md §3.',
  },
  // ui may import domain, simulation and lib. Never polymarket or app/api.
  {
    target: './src/ui',
    from: ['./src/polymarket', './src/ai', './src/app'],
    message:
      'src/ui may import only src/domain, src/simulation and src/lib. Data reaches it through props and hooks, never a direct upstream client. See ARCHITECTURE.md §3.',
  },
  // lib is cross-cutting and leaf-level: helpers, not orchestration.
  {
    target: './src/lib',
    from: ['./src/polymarket', './src/simulation', './src/ai', './src/ui', './src/app'],
    message: 'src/lib is leaf-level: formatting and errors only. See ARCHITECTURE.md §3.',
  },
  // src/app/api imports everything, so it has no zone.
];

const noDangerousHtml = [
  {
    selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
    message: 'dangerouslySetInnerHTML is banned. Model output is text; render it as text.',
  },
  {
    selector: 'Property[key.name="dangerouslySetInnerHTML"]',
    message: 'dangerouslySetInnerHTML is banned. Model output is text; render it as text.',
  },
];

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    plugins: {
      '@next/next': nextPlugin,
      import: importPlugin,
      'react-hooks': reactHooks,
    },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      'import/no-restricted-paths': ['error', { basePath: import.meta.dirname, zones: boundaryZones }],
      'no-restricted-syntax': ['error', ...noDangerousHtml],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },

  // Node-side scripts run outside the bundler and are allowed to talk to the
  // operator on stdout. `record-fixtures.ts` runs under Node's type stripping,
  // so it is TypeScript but still a plain Node script.
  {
    files: ['scripts/**/*.mjs', 'scripts/**/*.ts'],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly' },
    },
    rules: { 'no-console': 'off' },
  },
);
