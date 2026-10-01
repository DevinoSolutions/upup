// framer-motion's animation features, loaded on demand by MotionProvider.
// domMax (not domAnimation) because FrameworkSnippets animates its active tab
// with `layoutId`, which lives in the layout feature. This module is only ever
// reached through a dynamic import, so the features ship as their own async
// chunk instead of in every page's first load.
import { domMax } from 'framer-motion'

export default domMax
