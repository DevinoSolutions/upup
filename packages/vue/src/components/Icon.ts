import { defineComponent, h, type PropType } from 'vue'
import { ICONS, cn, type IconName } from '@upup/core'

export const Icon = defineComponent({
  name: 'UpupIcon',
  props: {
    name: { type: String as PropType<IconName>, required: true },
    size: { type: Number, default: undefined },
    class: { type: String, default: undefined },
  },
  setup(props) {
    return () => {
      const def = ICONS[props.name]
      const px = props.size ?? def.defaultSize
      return h('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: def.viewBox,
        width: px,
        height: px,
        ...def.attrs,
        class: cn(def.className, props.class),
        innerHTML: def.inner,
      })
    }
  },
})

export default Icon
