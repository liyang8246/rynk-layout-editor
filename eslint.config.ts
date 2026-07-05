import antfu from '@antfu/eslint-config'

export default antfu(
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
)
