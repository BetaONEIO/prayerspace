import React from "react";
import Svg, { Path, Circle } from "react-native-svg";

interface Props {
  color: string;
  size?: number;
}

/**
 * House silhouette — roof ridge + two walls + recessed door opening.
 */
export function HomeTabIcon({ color, size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Roof */}
      <Path
        d="M3 11L12 3L21 11"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Walls + door cutout */}
      <Path
        d="M4.5 10.5V21H9V15.5H15V21H19.5V10.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PrayTabIcon({ color, size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Joined fingers, thumbs and wrists, with one shared centre seam. */}
      <Path
        d="M12 4C12 2.5 10.4 2.3 9.8 3.8L7.5 10V13L6.5 11.5C5.8 10.4 4.5 11 5 12.3L6.5 16C6.9 17 6.7 17.7 6 18.3L3 20.5L8 22L10.5 19.2C11.5 18.1 12 16.9 12 15.5C12 16.9 12.5 18.1 13.5 19.2L16 22L21 20.5L18 18.3C17.3 17.7 17.1 17 17.5 16L19 12.3C19.5 11 18.2 10.4 17.5 11.5L16.5 13V10L14.2 3.8C13.6 2.3 12 2.5 12 4Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 4V15.5M7.5 13L9 15M16.5 13L15 15"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Two people — a smaller person on the left slightly behind,
 * a slightly larger person on the right in front.
 */
export function PeopleTabIcon({ color, size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Back-left person */}
      <Circle
        cx={8.5}
        cy={7}
        r={2.5}
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M3.5 21C3.5 17 5.5 14.5 8.5 14.5C10.5 14.5 12 15.5 13 17"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Front-right person */}
      <Circle
        cx={15.5}
        cy={8}
        r={2.8}
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M10.5 21.5C10.5 17.5 12.5 15 15.5 15C18.5 15 20.5 17.5 20.5 21.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Speech bubble — rounded rectangle with a small downward-left tail.
 */
export function MessageTabIcon({ color, size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 3H4C2.9 3 2 3.9 2 5V15.5C2 16.6 2.9 17.5 4 17.5H7.5L12 22L16.5 17.5H20C21.1 17.5 22 16.6 22 15.5V5C22 3.9 21.1 3 20 3Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
