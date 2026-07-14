import React from 'react'
import Icon from './Icon'

export default function DefaultLoaderIcon(): React.ReactElement | null {
    return (
        <Icon
            name="loader"
            className="upup-animate-spin upup-text-3xl upup-text-[#6D6D6D]"
        />
    )
}
