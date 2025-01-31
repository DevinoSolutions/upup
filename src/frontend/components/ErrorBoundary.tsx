import { Component, ErrorInfo, PropsWithChildren, ReactNode } from 'react'

type Props = PropsWithChildren<{ fallback?: ReactNode }>

function handleErrorBoundaryError(...args: any[]) {
    return args
}

export default class ErrorBoundary extends Component<
    Props,
    { hasError: boolean }
> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError() {
        // Update state so the next render will show the fallback UI.
        return { hasError: true }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // You can also log the error to an error reporting service
        handleErrorBoundaryError(error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return this.props.fallback
        }

        return this.props.children
    }
}
