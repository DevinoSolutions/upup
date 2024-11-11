import { ButtonHTMLAttributes, forwardRef, memo, useMemo } from 'react'
import { Adapter } from 'types'
import { getAdapterDetails } from 'utils'

export default memo(
    forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
        function AdapterSelectorItem(props, ref) {
            const { Icon, title } = useMemo(
                () => getAdapterDetails(props.id as Adapter),
                [props.id],
            )

            return (
                <button ref={ref} {...props}>
                    <span className="rounded-lg bg-white p-[6px] text-2xl shadow dark:bg-[#323232]">
                        <Icon />
                    </span>
                    <span className="text-[#525252] dark:text-[#777]">
                        {title}
                    </span>
                </button>
            )
        },
    ),
)
