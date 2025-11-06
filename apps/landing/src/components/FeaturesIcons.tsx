import React from "react";

type IconProps = {
    primary: string;
    secondary: string;
};

const CloudStorageSymbol = ({
                                primary: svgPrimaryColor,
                                secondary: svgSecondaryColor,
                            }: IconProps) => (
    <symbol id="cloud-storage" viewBox="0 0 240 160">
        <path
            d="M60 80 Q60 60 80 60 Q80 40 100 40 Q120 40 120 60 Q140 40 160 60 Q180 60 180 80 Q180 100 160 100 L80 100 Q60 100 60 80Z"
            fill={svgPrimaryColor}
            opacity="0.2"
        />
        <path
            d="M60 80 Q60 60 80 60 Q80 40 100 40 Q120 40 120 60 Q140 40 160 60 Q180 60 180 80 Q180 100 160 100 L80 100 Q60 100 60 80Z"
            fill="none"
            stroke={svgPrimaryColor}
            strokeWidth="2"
        />

        <rect
            x="90"
            y="70"
            width="20"
            height="20"
            rx="2"
            fill={svgSecondaryColor}
            opacity="0.6"
        />
        <rect
            x="120"
            y="70"
            width="20"
            height="20"
            rx="2"
            fill={svgSecondaryColor}
            opacity="0.6"
        />
        <rect
            x="150"
            y="70"
            width="20"
            height="20"
            rx="2"
            fill={svgSecondaryColor}
            opacity="0.6"
        />

        <path
            d="M100 90 L100 120"
            stroke={svgPrimaryColor}
            strokeWidth="2"
            strokeDasharray="4 4"
        />
        <path
            d="M130 90 L130 120"
            stroke={svgPrimaryColor}
            strokeWidth="2"
            strokeDasharray="4 4"
        />
        <path
            d="M160 90 L160 120"
            stroke={svgPrimaryColor}
            strokeWidth="2"
            strokeDasharray="4 4"
        />
    </symbol>
);

const DragDropSymbol = ({
                            primary: svgPrimaryColor,
                            secondary: svgSecondaryColor,
                        }: IconProps) => (
    <symbol id="drag-drop" viewBox="0 0 240 160">
        <rect
            x="40"
            y="40"
            width="160"
            height="100"
            rx="8"
            fill="none"
            stroke={svgPrimaryColor}
            strokeWidth="2"
            strokeDasharray="8 8"
        />
        <g transform="translate(100, 70)">
            <rect
                x="0"
                y="0"
                width="40"
                height="50"
                rx="4"
                fill={svgPrimaryColor}
                opacity="0.2"
            />
            <rect
                x="0"
                y="0"
                width="40"
                height="50"
                rx="4"
                fill="none"
                stroke={svgPrimaryColor}
                strokeWidth="2"
            />
            <line
                x1="10"
                y1="20"
                x2="30"
                y2="20"
                stroke={svgPrimaryColor}
                strokeWidth="2"
            />
            <line
                x1="10"
                y1="30"
                x2="30"
                y2="30"
                stroke={svgPrimaryColor}
                strokeWidth="2"
            />
        </g>

        <path
            d="M80 90 L100 110 L120 90"
            fill="none"
            stroke={svgSecondaryColor}
            strokeWidth="2"
        />
        <path
            d="M140 90 L160 110 L180 90"
            fill="none"
            stroke={svgSecondaryColor}
            strokeWidth="2"
        />
    </symbol>
);

const InstantPreviewSymbol = ({
                                  primary: svgPrimaryColor,
                                  secondary: svgSecondaryColor,
                              }: IconProps) => (
    <symbol id="instant-preview" viewBox="0 0 240 160">
        <rect
            x="40"
            y="40"
            width="160"
            height="100"
            rx="8"
            fill={svgPrimaryColor}
            opacity="0.1"
            stroke={svgPrimaryColor}
            strokeWidth="2"
        />

        <rect
            x="50"
            y="50"
            width="60"
            height="40"
            rx="4"
            fill={svgSecondaryColor}
            opacity="0.3"
        />
        <rect
            x="120"
            y="50"
            width="60"
            height="40"
            rx="4"
            fill={svgSecondaryColor}
            opacity="0.3"
        />
        <rect
            x="50"
            y="100"
            width="60"
            height="30"
            rx="4"
            fill={svgSecondaryColor}
            opacity="0.3"
        />
        <rect
            x="120"
            y="100"
            width="60"
            height="30"
            rx="4"
            fill={svgSecondaryColor}
            opacity="0.3"
        />

        <circle cx="80" cy="70" r="10" fill={svgPrimaryColor} />
        <circle cx="150" cy="70" r="10" fill={svgPrimaryColor} />
        <rect x="70" y="105" width="20" height="20" rx="2" fill={svgPrimaryColor} />
        <rect
            x="140"
            y="105"
            width="20"
            height="20"
            rx="2"
            fill={svgPrimaryColor}
        />
    </symbol>
);

export const FeaturesIcons = (props: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" style={{ display: "none" }}>
        <CloudStorageSymbol {...props} />
        <DragDropSymbol {...props} />
        <InstantPreviewSymbol {...props} />
    </svg>
);
