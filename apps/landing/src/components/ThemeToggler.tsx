import { ThemeContext } from '@/lib/contexts'
import { m } from 'framer-motion'
import { useContext } from 'react'
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
            aria-label={
                isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'
            }
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full lg:min-h-0 lg:min-w-0 transition-colors duration-fast"
            onClick={switchTheme}
        >
            <m.div
                key={isDarkMode ? 'moon-icon' : 'sun-icon'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
            >
                {isDarkMode ? (
                    <MdOutlineLightMode className={lightModeClassName} />
                ) : (
                    <MdDarkMode className={darkModeClassName} />
                )}
            </m.div>
        </button>
    )
}

export default ThemeToggler
