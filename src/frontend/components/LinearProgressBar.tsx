import LinearProgress, {
    LinearProgressProps,
} from '@mui/material/LinearProgress'

import { Typography } from '@mui/material'
import Box from '@mui/material/Box'

type Props = LinearProgressProps & { value: number }

const LinearProgressBar = (props: Props) => {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress variant="determinate" {...props} />
            </Box>
            <Box sx={{ minWidth: 35 }}>
                <Typography variant="h6">
                    <div className="text-gray-500 dark:text-white">{`${Math.round(
                        props.value,
                    )}%`}</div>
                </Typography>
            </Box>
        </Box>
    )
}

export default LinearProgressBar
