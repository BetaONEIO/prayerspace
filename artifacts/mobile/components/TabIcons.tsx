import React from "react";
import Svg, { Path, Circle, G } from "react-native-svg";

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

/**
 * Praying hands — two symmetric curved outlines meeting at the fingertips,
 * a subtle centre seam, and a small thumb knuckle on each side.
 */
export function PrayTabIcon({ color, size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Left-hand outer edge */}
      <Path
        d="M12 3.5C10 5.5 7 9 7 13C7 16.5 8.5 19.5 12 22"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Right-hand outer edge */}
      <Path
        d="M12 3.5C14 5.5 17 9 17 13C17 16.5 15.5 19.5 12 22"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Centre seam where hands press together */}
      <Path
        d="M12 4.5V21.5"
        stroke={color}
        strokeWidth={1}
        strokeLinecap="round"
        opacity={0.35}
      />
      {/* Left thumb knuckle */}
      <Path
        d="M7 12.5C7.5 11 9.5 10.5 11 11.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* Right thumb knuckle */}
      <Path
        d="M17 12.5C16.5 11 14.5 10.5 13 11.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
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
