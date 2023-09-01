import { useEffect, useState } from 'react'

const useGoogleDrive = () => {
    const [user, setUser] = useState<any>(null)
    const [files, setFiles] = useState<any>(null)

    useEffect(() => {
        console.log('user', user)
        console.log('files', files)
    }, [user, files])

    return { user, files }
}

export default useGoogleDrive
