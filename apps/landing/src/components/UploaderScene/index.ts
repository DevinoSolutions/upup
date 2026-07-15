// UploaderScene — a mock-uploader kit that recreates the real @upupjs/react
// uploader as marketing motion. The kit (MockUploader / MockDriveBrowser /
// SceneCursor / useSceneTimeline) is shared; scenes (HeroSession, and the
// per-feature scenes to come) declare a timeline script over it.

export { default as HeroSession } from './HeroSession'
export { default as DriveScene } from './DriveScene'
export { default as PipelineScene } from './PipelineScene'
export { default as ResumeScene } from './ResumeScene'
export { default as EditorScene } from './EditorScene'
export { default as FrameworksScene } from './FrameworksScene'
export { default as MockUploader } from './MockUploader'
export { default as MockDriveBrowser } from './MockDriveBrowser'
export { default as SceneCursor } from './SceneCursor'
export {
    useSceneTimeline,
    useElementSize,
    usePanelCursor,
    type TimelineStep,
} from './useSceneTimeline'
export type {
    QueueFile,
    QueueStage,
    SourceDef,
    DriveThumb,
    DriveProvider,
} from './types'
