import { createApp, type App } from 'vue'

export function withSetup<T>(composable: () => T): {
    result: T
    app: App
    unmount: () => void
} {
    let result!: T
    const app = createApp({
        setup() {
            result = composable()
            return () => {}
        },
    })
    const div = document.createElement('div')
    app.mount(div)
    return { result, app, unmount: () => app.unmount() }
}
