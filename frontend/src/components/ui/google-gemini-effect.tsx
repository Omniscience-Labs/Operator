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
        viewBox="0 0 2000 1000"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <motion.path
          d="M0 663C200 663 300 666 400 647C500 630 600 621 700 566C800 531 900 529 1000 523C1100 519 1200 503 1300 504C1400 504 1500 514 1600 522C1700 525 1800 526 1900 523C2000 515"
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
          d="M0 587C200 587 300 587 400 573C500 563 600 543 700 535C800 523 900 526 1000 515C1100 512 1200 510 1300 512C1400 516 1500 523 1600 523C1700 523 1800 496 1900 497C2000 497"
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
          d="M0 514C200 514 300 513 400 513C500 514 600 515 700 515C800 514 900 506 1000 511C1100 511 1200 512 1300 513C1400 516 1500 521 1600 519C1700 515 1800 499 1900 499C2000 499"
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
          d="M0 438C200 438 300 438 400 456C500 464 600 484 700 494C800 501 900 503 1000 507C1100 512 1200 516 1300 518C1400 521 1500 501 1600 501C1700 501 1800 529 1900 528C2000 528"
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
          d="M0 364C200 362 300 361 400 378C500 391 600 457 700 467C800 478 900 491 1000 502C1100 503 1200 504 1300 505C1400 511 1500 520 1600 521C1700 521 1800 498 1900 498C2000 498"
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
          d="M0 663C200 663 300 666 400 647C500 630 600 621 700 566C800 531 900 529 1000 523C1100 519 1200 503 1300 504C1400 504 1500 514 1600 522C1700 525 1800 526 1900 523C2000 515"
          stroke="#FFB7C5"
          strokeWidth="3"
          fill="none"
          pathLength={1}
          filter="url(#blurMe)"
        />
        <path
          d="M0 587C200 587 300 587 400 573C500 563 600 543 700 535C800 523 900 526 1000 515C1100 512 1200 510 1300 512C1400 516 1500 523 1600 523C1700 523 1800 496 1900 497C2000 497"
          stroke="#FFDDB7"
          strokeWidth="3"
          fill="none"
          pathLength={1}
          filter="url(#blurMe)"
        />
        <path
          d="M0 514C200 514 300 513 400 513C500 514 600 515 700 515C800 514 900 506 1000 511C1100 511 1200 512 1300 513C1400 516 1500 521 1600 519C1700 515 1800 499 1900 499C2000 499"
          stroke="#B1C5FF"
          strokeWidth="3"
          fill="none"
          pathLength={1}
          filter="url(#blurMe)"
        />
        <path
          d="M0 438C200 438 300 438 400 456C500 464 600 484 700 494C800 501 900 503 1000 507C1100 512 1200 516 1300 518C1400 521 1500 501 1600 501C1700 501 1800 529 1900 528C2000 528"
          stroke="#4FABFF"
          strokeWidth="3"
          fill="none"
          pathLength={1}
          filter="url(#blurMe)"
        />
        <path
          d="M0 364C200 362 300 361 400 378C500 391 600 457 700 467C800 478 900 491 1000 502C1100 503 1200 504 1300 505C1400 511 1500 520 1600 521C1700 521 1800 498 1900 498C2000 498"
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
