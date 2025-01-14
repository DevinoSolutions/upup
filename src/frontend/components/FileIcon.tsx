import React, { forwardRef, SVGAttributes, SVGProps } from 'react'
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

type Props = {
    extension?: string
} & SVGAttributes<SVGSVGElement>

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

export default forwardRef<SVGSVGElement, Props>(function FileIcon(
    { extension = '', className },
    ref,
) {
    const Component = fileTypes[extension] || TbFile
    return <Component ref={ref} className={'h-full w-full' + className} />
})
