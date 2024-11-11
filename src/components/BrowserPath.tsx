import ShouldRender from 'components/ShouldRender'
import { Dispatch, memo, SetStateAction } from 'react'
import { GoogleDriveRoot, OneDriveRoot } from 'types'
import { cn } from 'utils'

type Props = {
    path: Array<OneDriveRoot | GoogleDriveRoot>
    setPath:
        | Dispatch<SetStateAction<Array<OneDriveRoot>>>
        | Dispatch<SetStateAction<Array<GoogleDriveRoot>>>
}

export default memo(function BrowserPath({ path, setPath }: Props) {
    if (!path.length) return null

    return (
        <div className="h flex gap-1 p-2 px-4">
            {path.map((p, i) => (
                <p
                    key={p.id}
                    className={cn(
                        'group flex shrink-0 cursor-pointer gap-1 truncate',
                        {
                            'pointer-events-none': i === path.length - 1,
                        },
                    )}
                    style={{
                        maxWidth: 100 / path.length + '%',
                    }}
                    onClick={() =>
                        setPath((prev: any[]) => prev.slice(0, i + 1))
                    }
                >
                    <span className="truncate group-hover:underline">
                        {p.name}
                    </span>
                    <ShouldRender if={i !== path.length - 1}>&gt;</ShouldRender>
                </p>
            ))}
        </div>
    )
})
