// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  // Base configurations
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  
  // Global configuration
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        node: true,
        jest: true,
      },
    },
    plugins: {
      prettier: await import('eslint-plugin-prettier').then(m => m.default),
    },
    rules: {
      // Prettier integration
      'prettier/prettier': 'error',
      
      // TypeScript specific rules - CONVERTED TO WARNINGS
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn', // Warning instead of error
      '@typescript-eslint/no-unused-vars': [
        'warn', // Warning instead of error
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/no-unsafe-assignment': 'warn', // Warning
      '@typescript-eslint/no-unsafe-member-access': 'warn', // Warning
      '@typescript-eslint/no-unsafe-call': 'warn', // Warning
      '@typescript-eslint/no-unsafe-return': 'warn', // Warning
      '@typescript-eslint/no-unsafe-argument': 'warn', // Warning
      '@typescript-eslint/require-await': 'warn', // Warning
      '@typescript-eslint/no-floating-promises': 'warn', // Warning
      '@typescript-eslint/prefer-nullish-coalescing': 'warn', // Warning
      '@typescript-eslint/no-unsafe-enum-comparison': 'warn', // Warning
      '@typescript-eslint/no-redundant-type-constituents': 'warn', // Warning
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-empty-function': [
        'error', 
        { allow: ['constructors'] }
      ],
      
      // General ESLint rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': 'error',
      'curly': 'error',
      
      // NestJS specific adjustments
      '@typescript-eslint/no-inferrable-types': 'off',
    },
  },

  // Prettier configuration
  prettier,

  // Test files configuration
  {
    files: ['**/*.spec.ts', '**/*.test.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },

  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.js',
      '!eslint.config.mjs',
      'test/**',
    ],
  },
];