import LinearProgress, {
    LinearProgressProps,
} from '@mui/material/LinearProgress'

import Box from '@mui/material/Box'
import { Typography } from '@mui/material'

export const LinearProgressBar = (
    props: LinearProgressProps & { value: number },
) => {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress variant="determinate" {...props} />
            </Box>
            <Box sx={{ minWidth: 35 }}>
                <Typography
                    variant="body2"
                    color="text.secondary"
                >{`${Math.round(props.value)}%`}</Typography>
            </Box>
        </Box>
    )
}
