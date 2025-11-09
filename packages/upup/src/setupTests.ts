import '@testing-library/jest-dom'
import 'jest-canvas-mock'

// Declare global window with google property
declare global {
    var google: any // Use var instead of redefining window
}

// Mock google global
global.google = {
    accounts: {
        oauth2: {
            initTokenClient: jest.fn().mockReturnValue({
                requestAccessToken: jest.fn(),
            }),
        },
    },
}

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: jest.fn().mockImplementation((props: any) => {
            const { children, ...rest } = props
            return {
                type: 'div',
                props: { ...rest, children },
            }
        }),
    },
    AnimatePresence: jest.fn().mockImplementation(({ children }) => children),
}))
