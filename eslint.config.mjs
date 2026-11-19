// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    // shadcn-vue components use single-word names (Button, Input, ...).
    // @nuxt/eslint only exempts folders listed in `components.dirs`, which
    // is empty on purpose (see nuxt.config.ts), so exempt ui/* explicitly.
    name: 'project/shadcn-ui-names',
    files: ['app/components/ui/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off'
    }
  }
)
