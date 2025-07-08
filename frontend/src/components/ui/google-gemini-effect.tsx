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
        viewBox="0 0 1400 600"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M0 150C200 160 400 180 600 250C700 280 800 320 1000 360C1200 380 1400 420"
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
          d="M0 200C200 210 400 230 600 280C700 300 800 320 1000 340C1200 350 1400 380"
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
          d="M0 300C200 300 400 300 600 300C700 300 800 300 1000 300C1200 300 1400 300"
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
          d="M0 400C200 390 400 370 600 320C700 300 800 280 1000 260C1200 250 1400 220"
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
          d="M0 450C200 440 400 420 600 350C700 320 800 280 1000 240C1200 220 1400 180"
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
