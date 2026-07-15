// UploaderScene — a mock-uploader kit that recreates the real @upupjs/react
// uploader as marketing motion. The kit (MockUploader / MockDriveBrowser /
// SceneCursor / useSceneTimeline) is shared; scenes (HeroSession, and the
// per-feature scenes to come) declare a timeline script over it.

export { default as HeroSession } from './HeroSession'
export { default as MockUploader } from './MockUploader'
export { default as MockDriveBrowser } from './MockDriveBrowser'
export { default as SceneCursor } from './SceneCursor'
export {
    useSceneTimeline,
    useElementSize,
    type TimelineStep,
} from './useSceneTimeline'
export type {
    QueueFile,
    QueueStage,
    SourceDef,
    DriveThumb,
    DriveProvider,
} from './types'
