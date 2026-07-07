import antfu from '@antfu/eslint-config'
import tailwindcss from 'eslint-plugin-tailwindcss'

const tailwindRecommended = tailwindcss.configs.recommended as Record<string, any>

export default [
  ...await antfu(
    {
      solid: true,
      ignores: ['src/wasm/rynk-kle/**'],
      rules: {
        'antfu/if-newline': 'off',
      },
    },
    {
      files: ['src/components/Toolbar.tsx'],
      rules: {
        'no-alert': 'off',
      },
    },
  ),
  {
    ...tailwindRecommended,
    settings: {
      tailwindcss: {
        cssConfigPath: './src/index.css',
      },
    },
    rules: {
      ...tailwindRecommended.rules,
      'tailwindcss/no-custom-classname': 'off',
    },
  },
]
