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
        viewBox="0 0 3000 1000"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M0 663C300 663 450 666 600 647C750 630 900 621 1050 566C1200 531 1350 529 1500 523C1650 519 1800 503 1950 504C2100 504 2250 514 2400 522C2550 525 2700 526 2850 523C3000 515"
          stroke="#FFB7C5"
          strokeWidth="3"
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
          d="M0 587C300 587 450 587 600 573C750 563 900 543 1050 535C1200 523 1350 526 1500 515C1650 512 1800 510 1950 512C2100 516 2250 523 2400 523C2550 523 2700 496 2850 497C3000 497"
          stroke="#FFDDB7"
          strokeWidth="3"
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
          d="M0 514C300 514 450 513 600 513C750 514 900 515 1050 515C1200 514 1350 506 1500 511C1650 511 1800 512 1950 513C2100 516 2250 521 2400 519C2550 515 2700 499 2850 499C3000 499"
          stroke="#B1C5FF"
          strokeWidth="3"
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
          d="M0 438C300 438 450 438 600 456C750 464 900 484 1050 494C1200 501 1350 503 1500 507C1650 512 1800 516 1950 518C2100 521 2250 501 2400 501C2550 501 2700 529 2850 528C3000 528"
          stroke="#4FABFF"
          strokeWidth="3"
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
          d="M0 364C300 362 450 361 600 378C750 391 900 457 1050 467C1200 478 1350 491 1500 502C1650 503 1800 504 1950 505C2100 511 2250 520 2400 521C2550 521 2700 498 2850 498C3000 498"
          stroke="#076EFF"
          strokeWidth="3"
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

        <path
          d="M0 663C300 663 450 666 600 647C750 630 900 621 1050 566C1200 531 1350 529 1500 523C1650 519 1800 503 1950 504C2100 504 2250 514 2400 522C2550 525 2700 526 2850 523C3000 515"
          stroke="#FFB7C5"
          strokeWidth="3"
          fill="none"
          pathLength={1}
          filter="url(#blurMe)"
        />
        <path
          d="M0 587C300 587 450 587 600 573C750 563 900 543 1050 535C1200 523 1350 526 1500 515C1650 512 1800 510 1950 512C2100 516 2250 523 2400 523C2550 523 2700 496 2850 497C3000 497"
          stroke="#FFDDB7"
          strokeWidth="3"
          fill="none"
          pathLength={1}
          filter="url(#blurMe)"
        />
        <path
          d="M0 514C300 514 450 513 600 513C750 514 900 515 1050 515C1200 514 1350 506 1500 511C1650 511 1800 512 1950 513C2100 516 2250 521 2400 519C2550 515 2700 499 2850 499C3000 499"
          stroke="#B1C5FF"
          strokeWidth="3"
          fill="none"
          pathLength={1}
          filter="url(#blurMe)"
        />
        <path
          d="M0 438C300 438 450 438 600 456C750 464 900 484 1050 494C1200 501 1350 503 1500 507C1650 512 1800 516 1950 518C2100 521 2250 501 2400 501C2550 501 2700 529 2850 528C3000 528"
          stroke="#4FABFF"
          strokeWidth="3"
          fill="none"
          pathLength={1}
          filter="url(#blurMe)"
        />
        <path
          d="M0 364C300 362 450 361 600 378C750 391 900 457 1050 467C1200 478 1350 491 1500 502C1650 503 1800 504 1950 505C2100 511 2250 520 2400 521C2550 521 2700 498 2850 498C3000 498"
          stroke="#076EFF"
          strokeWidth="3"
          fill="none"
          pathLength={1}
          filter="url(#blurMe)"
        />

        <defs>
          <filter id="blurMe">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
          </filter>
        </defs>
      </svg>
    </div>
  );
};
