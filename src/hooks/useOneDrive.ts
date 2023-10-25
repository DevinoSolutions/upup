import { OneDriveConfigs } from 'types'

const useOneDrive = (oneDriveConfigs: OneDriveConfigs) => {
    console.log('useOneDrive', oneDriveConfigs)
    const token = 'token'
    return { token }
}

export default useOneDrive
