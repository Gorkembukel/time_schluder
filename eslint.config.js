import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // config-audit skill'inin otomatik taramasının bir parçası: kullanıcı ayarına taşınması
      // gereken sabit değerleri (planlama ufukları, saatler, oranlar vb.) yakalamayı hedefler.
      'no-magic-numbers': [
        'warn',
        { ignore: [-1, 0, 1, 2], ignoreArrayIndexes: true, enforceConst: true, detectObjects: false },
      ],
    },
  },
  prettier,
)
