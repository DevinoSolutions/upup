import { OneDriveConfigs } from 'types'
import { useCallback, useState } from 'react'

const useOneDrive = (oneDriveConfigs: OneDriveConfigs) => {
    console.log(oneDriveConfigs)
    const [token, setToken] = useState('')
    const fetchDrive = useCallback(
        async (url: string) => {
            return await fetch(url, {
                method: 'GET',
            })
        },
        [token],
    )
    fetchDrive(
        `https://login.live.com/oauth20_authorize.srf?client_id=6a5dfe6b-7b41-4f43-a4f3-5c6e434056e1&scope=files.readwrite.all&response_type=token&redirect_uri=http://localhost:6006`,
    ).then(res => {
        console.log(res)
    })
    return { token }
}

export default useOneDrive
