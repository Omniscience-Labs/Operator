"use client";
import { cn } from "@/lib/utils";
import { motion, MotionValue } from "motion/react";
import React from "react";

const transition = {
  duration: 0,
  ease: "linear" as const,
};

export const GoogleGeminiEffect = ({
  pathLengths,
  className,
}: {
  pathLengths: MotionValue[];
  className?: string;
}) => {
  return (
    <div className={cn("w-full h-full", className)}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1200 600"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <motion.path
          d="M0 398C120 398 180 400 240 388C300 378 360 373 420 340C480 318 540 317 600 314C660 312 720 302 780 302C840 302 900 308 960 313C1020 315 1080 316 1140 314C1200 309"
          stroke="#FFB7C5"
          strokeWidth="2"
          fill="none"
          initial={{
            pathLength: 0,
          }}
          style={{
            pathLength: pathLengths[0],
          }}
          transition={transition}
        />
        <motion.path
          d="M0 352C120 352 180 352 240 344C300 338 360 326 420 321C480 314 540 316 600 309C660 307 720 306 780 307C840 310 900 314 960 314C1020 314 1080 298 1140 298C1200 298"
          stroke="#FFDDB7"
          strokeWidth="2"
          fill="none"
          initial={{
            pathLength: 0,
          }}
          style={{
            pathLength: pathLengths[1],
          }}
          transition={transition}
        />
        <motion.path
          d="M0 308C120 308 180 308 240 308C300 309 360 309 420 309C480 308 540 304 600 307C660 307 720 307 780 308C840 310 900 313 960 312C1020 309 1080 299 1140 299C1200 299"
          stroke="#B1C5FF"
          strokeWidth="2"
          fill="none"
          initial={{
            pathLength: 0,
          }}
          style={{
            pathLength: pathLengths[2],
          }}
          transition={transition}
        />
        <motion.path
          d="M0 263C120 263 180 263 240 274C300 278 360 290 420 296C480 301 540 302 600 304C660 307 720 310 780 311C840 313 900 301 960 301C1020 301 1080 318 1140 317C1200 317"
          stroke="#4FABFF"
          strokeWidth="2"
          fill="none"
          initial={{
            pathLength: 0,
          }}
          style={{
            pathLength: pathLengths[3],
          }}
          transition={transition}
        />
        <motion.path
          d="M0 218C120 217 180 217 240 227C300 235 360 274 420 280C480 287 540 294 600 301C660 302 720 302 780 303C840 307 900 312 960 313C1020 313 1080 299 1140 299C1200 299"
          stroke="#076EFF"
          strokeWidth="2"
          fill="none"
          initial={{
            pathLength: 0,
          }}
          style={{
            pathLength: pathLengths[4],
          }}
          transition={transition}
        />

        {/* Gaussian blur for the background paths */}

        <defs>
          <filter id="blurMe">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
        </defs>
      </svg>
    </div>
  );
};
