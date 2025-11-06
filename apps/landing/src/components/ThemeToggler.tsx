import { ThemeContext } from '@/lib/contexts'
import { motion } from 'framer-motion'
import {useContext} from 'react'
import { MdDarkMode, MdOutlineLightMode } from 'react-icons/md'

interface ThemeTogglerProps {
    darkModeClassName?: string
    lightModeClassName?: string
    isDarkMode: boolean
}

const ThemeToggler = ({
    darkModeClassName = 'text-3xl md:text-2xl text-[#242526]',
    lightModeClassName = 'text-3xl md:text-2xl text-white font-bold',
    isDarkMode,
}: ThemeTogglerProps) => {
    const { switchTheme } = useContext(ThemeContext)
    return (
        <button
            className="flex items-center justify-center rounded-full transition-all duration-300"
            onClick={switchTheme}
        >
            <motion.div
                key={isDarkMode ? 'moon-icon' : 'sun-icon'}
                initial={{ rotate: 180, scale: 0.8, opacity: 0.5 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                {isDarkMode ? (
                    <MdOutlineLightMode className={lightModeClassName} />
                ) : (
                    <MdDarkMode className={darkModeClassName} />
                )}
            </motion.div>
        </button>
    )
}

export default ThemeToggler
