import Image from 'next/image'
import React from 'react'

const Loader: React.FC = () => {
    const logoStyle: React.CSSProperties = {
        width: 'auto',
        height: '60px',
        animation: 'pulse 1.5s ease-in-out infinite',
    }
    return (
        <div>
            <Image
                src={'/img/logo.png'}
                alt="logo"
                height={1200}
                width={1200}
                priority
                style={logoStyle}
            />
            <style jsx>{`
                @keyframes pulse {
                    0%,
                    100% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.1);
                    }
                }
            `}</style>
        </div>
    )
}

export default Loader
