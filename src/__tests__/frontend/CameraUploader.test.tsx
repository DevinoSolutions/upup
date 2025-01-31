import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import CameraUploader from '../../frontend/components/CameraUploader'
import useCameraUploader, {
    FacingMode,
} from '../../frontend/hooks/useCameraUploader'

// Mock dependencies
jest.mock('react-webcam', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react')
    return {
        __esModule: true,
        default: React.forwardRef(function Webcam(
            { videoConstraints }: { videoConstraints: any },
            ref: React.Ref<HTMLVideoElement>,
        ) {
            // Create mock methods needed by the component
            const mockWebcam = {
                getScreenshot: jest
                    .fn()
                    .mockReturnValue('data:image/jpeg;base64,mock'),
                video: {
                    videoWidth: 1280,
                    videoHeight: 720,
                },
            }

            // Handle ref assignment
            React.useImperativeHandle(ref, () => mockWebcam as any)

            return (
                <div data-testid="webcam-mock">
                    Webcam Mock - {JSON.stringify(videoConstraints)}
                </div>
            )
        }),
    }
})

jest.mock('../../frontend/hooks/useCameraUploader', () => ({
    __esModule: true,
    default: jest.fn(),
    FacingMode: {
        Environment: 'environment',
        User: 'user',
    },
}))

const mockUseCameraUploader = useCameraUploader as jest.MockedFunction<
    typeof useCameraUploader
>

const mockIcons = {
    CameraCaptureIcon: () => <span>📸</span>,
    CameraDeleteIcon: () => <span>❌</span>,
    CameraRotateIcon: () => <span>🔄</span>,
    LoaderIcon: () => <span>⏳</span>,
}

describe('CameraUploader Component', () => {
    beforeEach(() => {
        mockUseCameraUploader.mockReturnValue({
            capture: jest.fn(),
            handleFetchImage: jest.fn(),
            clearUrl: jest.fn(),
            handleCameraSwitch: jest.fn(),
            newCameraSide: 'front',
            url: '',
            webcamRef: { current: null },
            facingMode: FacingMode.Environment,
            props: {
                dark: false,
                classNames: {},
                icons: mockIcons,
            } as unknown as any,
        })
    })

    it('renders webcam when no image captured', () => {
        render(<CameraUploader />)

        expect(screen.getByTestId('webcam-mock')).toBeInTheDocument()
        expect(screen.getByText('Capture')).toBeInTheDocument()
        expect(screen.getByText('switch to front')).toBeInTheDocument()
    })

    const interactionTestCases = [
        {
            description: 'switches camera mode',
            buttonIcon: '🔄',
            mockFn: 'handleCameraSwitch',
        },
        {
            description: 'clears image',
            buttonIcon: '❌',
            mockFn: 'clearUrl',
            mockOverrides: { url: 'test-image.jpg' },
        },
        {
            description: 'triggers image capture',
            buttonIcon: '📸',
            mockFn: 'capture',
        },
    ]

    test.each(interactionTestCases)(
        '$description when $buttonIcon button clicked',
        ({ buttonIcon, mockFn, mockOverrides }) => {
            const mockHandler = jest.fn()
            const mockReturnValue = {
                ...mockUseCameraUploader(),
                [mockFn]: mockHandler,
                ...mockOverrides,
            }

            mockUseCameraUploader.mockReturnValueOnce(mockReturnValue)
            render(<CameraUploader />)

            fireEvent.click(screen.getByText(buttonIcon).parentElement!)
            expect(mockHandler).toHaveBeenCalledTimes(1)
        },
    )

    it('shows captured image preview when url exists', () => {
        mockUseCameraUploader.mockReturnValueOnce({
            ...mockUseCameraUploader(),
            url: 'test-image.jpg',
        })

        render(<CameraUploader />)

        expect(screen.queryByTestId('webcam-mock')).not.toBeInTheDocument()
        expect(screen.getByText('Add Image')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '❌' })).toBeInTheDocument()
    })
})

// Add mock for RootContext if needed
jest.mock('../../frontend/context/RootContext', () => ({
    useRootContext: () => ({
        props: {
            icons: mockIcons,
        },
    }),
}))
