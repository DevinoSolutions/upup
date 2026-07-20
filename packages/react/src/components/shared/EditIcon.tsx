import React from 'react'

/**
 * Pencil glyph for the image-edit affordance shared by the grid tile
 * (FilePreview), list row (FileRow), and single-file hero (FileHero). One copy
 * of the path so the three edit buttons stay byte-identical and the mandatory
 * bundle carries the markup once.
 */
export default function EditIcon({
    className,
}: {
    className?: string
}): React.JSX.Element {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={className}
            aria-hidden="true"
        >
            <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
        </svg>
    )
}
