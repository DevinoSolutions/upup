import React, { forwardRef, memo, SVGAttributes, SVGProps } from 'react'
import {
    TbFile,
    TbFileTypeBmp,
    TbFileTypeCss,
    TbFileTypeCsv,
    TbFileTypeDocx,
    TbFileTypeHtml,
    TbFileTypeJpg,
    TbFileTypeJs,
    TbFileTypeJsx,
    TbFileTypePdf,
    TbFileTypePhp,
    TbFileTypePng,
    TbFileTypePpt,
    TbFileTypeRs,
    TbFileTypeSql,
    TbFileTypeSvg,
    TbFileTypeTs,
    TbFileTypeTsx,
    TbFileTypeTxt,
    TbFileTypeVue,
    TbFileTypeXls,
    TbFileTypeXml,
    TbFileTypeZip,
} from 'react-icons/tb'
import { useRootContext } from '../context/RootContext'
import { cn } from '../lib/tailwind'

type Props = {
    extension?: string
} & SVGAttributes<SVGElement>

type IconType = (props: SVGProps<SVGSVGElement>) => JSX.Element

const fileTypes: { [key: string]: IconType } = {
    bmp: TbFileTypeBmp,
    css: TbFileTypeCss,
    csv: TbFileTypeCsv,
    docx: TbFileTypeDocx,
    html: TbFileTypeHtml,
    jpg: TbFileTypeJpg,
    js: TbFileTypeJs,
    jsx: TbFileTypeJsx,
    pdf: TbFileTypePdf,
    png: TbFileTypePng,
    php: TbFileTypePhp,
    ppt: TbFileTypePpt,
    rs: TbFileTypeRs,
    sql: TbFileTypeSql,
    svg: TbFileTypeSvg,
    ts: TbFileTypeTs,
    tsx: TbFileTypeTsx,
    txt: TbFileTypeTxt,
    vue: TbFileTypeVue,
    xls: TbFileTypeXls,
    xml: TbFileTypeXml,
    zip: TbFileTypeZip,
}

export default memo(
    forwardRef<SVGSVGElement, Props>(function FileIcon(
        { extension = '', className, ...restProps },
        ref,
    ) {
        const {
            props: { dark },
        } = useRootContext()
        const IconComponent = fileTypes[extension] || TbFile
        return (
            <IconComponent
                ref={ref}
                className={cn('text-4xl text-blue-600 md:text-7xl', className, {
                    'text-[#59D1F9] dark:text-[#59D1F9]': dark,
                })}
                {...restProps}
            />
        )
    }),
)
