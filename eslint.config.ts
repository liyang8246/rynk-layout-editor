import antfu from '@antfu/eslint-config'

export default antfu({
  solid: true,
  rules: {
    'brace-style': 'off',
    'style/brace-style': ['error', '1tbs', { allowSingleLine: true }],
    'curly': ['error', 'multi-or-nest', 'consistent'],
    'antfu/if-newline': 'off',
    'style/max-statements-per-line': 'off',
  },
})
