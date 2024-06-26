// @ts-check
import globals from 'globals'
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'


export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended, // TODO recommendedTypeChecked??
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_",
        },
      ],
    },
    languageOptions: {
      globals: {
        // necessary for document. window. etc variables to work
        ...globals.browser,
        ...globals.webextensions,
      },
    },
  },
)
