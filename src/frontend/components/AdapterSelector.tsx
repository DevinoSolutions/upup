import React from 'react'
import { useRootContext } from '../context/RootContext'
import useAdapterSelector from '../hooks/useAdapterSelector'
import { cn } from '../lib/tailwind'
import MainBoxHeader from './shared/MainBoxHeader'
import ShouldRender from './shared/ShouldRender'

export default function AdapterSelector() {
    const {
        props: { mini, accept, multiple, limit, maxFileSize, dark, classNames },
        isAddingMore,
        setIsAddingMore,
        inputRef,
    } = useRootContext()
    const { chosenAdapters, handleAdapterClick, handleInputFileChange } =
        useAdapterSelector()

    return (
        <div
            className={cn(
                '@cs/main:flex-col @cs/main:gap-14 upup-relative upup-flex upup-h-full upup-flex-col-reverse upup-items-center upup-justify-center upup-gap-3 upup-rounded-lg',
                {
                    '@cs/main:pt-0 upup-pt-[72px]': isAddingMore,
                },
            )}
        >
            <ShouldRender if={isAddingMore}>
                <MainBoxHeader handleCancel={() => setIsAddingMore(false)} />
            </ShouldRender>
            <ShouldRender if={!mini}>
                <div
                    className={cn(
                        '@cs/main:flex-row @cs/main:flex-wrap @cs/main:items-center @cs/main:gap-[30px] @cs/main:px-[30px] upup-flex upup-w-full upup-flex-col upup-justify-center upup-gap-1',
                        classNames.adapterButtonList,
                    )}
                >
                    {chosenAdapters.map(({ Icon, id, name }) => (
                        <button
                            type="button"
                            key={id}
                            className={cn(
                                '@cs/main:flex-col @cs/main:justify-center @cs/main:rounded-lg @cs/main:border-none @cs/main:p-0 upup-group upup-flex upup-items-center upup-gap-[6px] upup-border-b upup-border-gray-200 upup-px-2 upup-py-1',
                                {
                                    'upup-border-[#6D6D6D] dark:upup-border-[#6D6D6D]':
                                        dark,
                                },
                                classNames.adapterButton,
                            )}
                            onKeyDown={e => {
                                if (e.key === 'Enter') e.preventDefault()
                            }}
                            onClick={() => handleAdapterClick(id)}
                        >
                            <span
                                className={cn(
                                    '@cs/main:scale-100 @cs/main:p-[6px] @cs/main:shadow upup-scale-75 upup-rounded-lg upup-bg-white upup-p-0 upup-text-2xl upup-font-semibold group-hover:upup-scale-90 @cs/main:group-hover:upup-scale-110',
                                    {
                                        'upup-bg-[#323232] dark:upup-bg-[#323232]':
                                            dark,
                                    },
                                    classNames.adapterButtonIcon,
                                )}
                            >
                                <Icon />
                            </span>
                            <span
                                className={cn(
                                    'upup-text-xs upup-text-[#242634]',
                                    {
                                        'upup-text-[#6D6D6D] dark:upup-text-[#6D6D6D]':
                                            dark,
                                    },
                                    classNames.adapterButtonText,
                                )}
                            >
                                {name}
                            </span>
                        </button>
                    ))}
                </div>
            </ShouldRender>
            <input
                type="file"
                accept={accept}
                className="upup-hidden"
                ref={inputRef}
                multiple={multiple}
                onChange={handleInputFileChange}
            />
            <div className="@cs/main:gap-2 @cs/main:px-[30px] upup-flex upup-flex-col upup-items-center upup-gap-1 upup-text-center">
                <div className="upup-flex upup-items-center upup-gap-1">
                    <span
                        className={cn(
                            '@cs/main:text-sm upup-text-xs upup-text-[#0B0B0B]',
                            {
                                'upup-text-white dark:upup-text-white': dark,
                            },
                        )}
                    >
                        Drag your file
                        {limit > 1 ? 's' : ''} or
                    </span>
                    <button
                        className={cn(
                            '@cs/main:text-sm upup-cursor-pointer upup-text-xs upup-font-semibold upup-text-[#0E2ADD]',
                            {
                                'upup-text-[#59D1F9] dark:upup-text-[#59D1F9]':
                                    dark,
                            },
                        )}
                        onClick={() => inputRef.current?.click()}
                    >
                        browse
                    </button>
                </div>
                <p className="@cs/main:text-sm upup-text-xs upup-text-[#6D6D6D]">
                    Max {maxFileSize.size} {maxFileSize.unit} file
                    {limit > 1 ? 's are ' : ' is '} allowed
                </p>
            </div>
        </div>
    )
}
