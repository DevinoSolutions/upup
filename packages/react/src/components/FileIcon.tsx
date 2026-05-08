'use client'
import React, { forwardRef, memo, SVGAttributes } from 'react'
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

const fileTypes = {
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
} as Record<string, unknown>

export default memo(
    forwardRef<
        SVGSVGElement,
        {
            extension?: string
        } & SVGAttributes<SVGElement>
    >(function FileIcon({ extension = '', className, ...restProps }, ref) {
        const {
            props: { isDarkTheme: dark },
        } = useRootContext()
        const IconComponent = (fileTypes[extension] || TbFile) as React.ElementType
        return (
            <IconComponent
                ref={ref}
                className={cn('upup-text-5xl upup-text-blue-600', className, {
                    'upup-text-[#59D1F9] dark:upup-text-[#59D1F9]': dark,
                })}
                {...restProps}
            />
        )
    }),
)
