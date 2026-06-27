import { memo, SVGAttributes } from 'react'
import { cn, fileTypeIconName } from '@upup/core'
import { useUploaderTheme } from '../context/RootContext'
import Icon from './Icon'

export default memo(function FileIcon({
    extension = '',
    className,
}: { extension?: string } & SVGAttributes<SVGElement>) {
    const { isDark: dark } = useUploaderTheme()
    return (
        <span
            className="upup-inline-flex"
            data-testid="upup-file-icon"
            data-upup-slot="file-icon"
        >
            <Icon
                name={fileTypeIconName(extension)}
                className={cn('upup-text-5xl upup-text-blue-600', className as string, {
                    'upup-text-[#59D1F9] dark:upup-text-[#59D1F9]': dark,
                })}
            />
        </span>
    )
})
