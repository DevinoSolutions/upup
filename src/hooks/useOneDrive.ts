import { OneDriveConfigs } from 'types'

const useOneDrive = (oneDriveConfigs: OneDriveConfigs) => {
    console.log('useOneDrive', oneDriveConfigs)
    return {
        token: true,
    }
}

export default useOneDrive
