import React from 'react'

const MethodsSelector = ({
    setView,
    inputRef,
    methods,
}: {
    setView: (view: string) => void
    inputRef?: React.MutableRefObject<HTMLInputElement | null>
    methods: any[]
}) => {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-6 ">
            <h1 className="md:text-2xl text-center">
                Drop files here,{' '}
                <button
                    className="text-[#3782da] hover:underline"
                    // @ts-ignore
                    onClick={() => inputRef.current.click()}
                >
                    browse files
                </button>{' '}
                or import from:
            </h1>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 grid-rows-2">
                {methods.map(method => (
                    <button
                        key={method.id}
                        className="flex flex-col items-center justify-center gap-1 text-sm hover:bg-[#e9ecef] active:bg-[#dfe6f1] rounded-md p-2 px-4 transition-all duration-300 mb-4 disabled:opacity-30 disabled:pointer-events-none group relative"
                        disabled={!/internal|drive|onedrive/.test(method.id)}
                        onClick={() =>
                            method.id === 'internal'
                                ? // @ts-ignore
                                  inputRef.current.click()
                                : setView(method.id)
                        }
                    >
                        <span className="bg-white p-[6px] rounded-lg text-2xl shadow ">
                            {method.icon}
                        </span>
                        <span className="text-[#525252]">{method.name}</span>
                        <span className="group-disabled:block hidden absolute -bottom-2 opacity-50">
                            (soon)
                        </span>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default MethodsSelector