"use client";
import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export default function LampDemo() {
  return (
    <LampContainer>
      <motion.h1
        initial={{ opacity: 0.5, y: 100 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="mt-8 bg-gradient-to-br from-slate-300 to-slate-500 py-4 bg-clip-text text-center text-4xl font-medium tracking-tight text-transparent md:text-7xl"
      >
        Build lamps <br /> the right way
      </motion.h1>
    </LampContainer>
  );
}

export const LampContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background w-full rounded-md z-0",
        className
      )}
    >
      <div className="relative flex w-full flex-1 scale-y-125 items-center justify-center isolate z-0">
        {/* Left cone - positioned 25% from left */}
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
          className="absolute inset-auto left-[25%] h-56 overflow-visible w-[30rem] bg-gradient-conic from-cyan-500 via-transparent to-transparent text-white [--conic-position:from_70deg_at_center_top] -translate-x-1/2"
        >
          <div className="absolute w-[100%] left-0 bg-background h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute w-40 h-[100%] left-0 bg-background bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]" />
        </motion.div>
        
        {/* Right cone - positioned 25% from left (mirrored) */}
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
          className="absolute inset-auto left-[25%] h-56 w-[30rem] bg-gradient-conic from-transparent via-transparent to-cyan-500 text-white [--conic-position:from_290deg_at_center_top] translate-x-1/2"
        >
          <div className="absolute w-40 h-[100%] right-0 bg-background bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)]" />
          <div className="absolute w-[100%] right-0 bg-background h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
        </motion.div>
        
        {/* Background blur elements */}
        <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-background blur-2xl"></div>
        <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md"></div>
        
        {/* Lamp bar - positioned higher over the Operator text */}
        <motion.div
          initial={{ width: "15rem" }}
          whileInView={{ width: "30rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-50 h-0.5 w-[30rem] -translate-y-[11rem] left-[25%] -translate-x-1/2 bg-cyan-400 pointer-events-none select-none outline-none"
        ></motion.div>

        {/* Core glow - brightest and most focused with radial gradient */}
        <motion.div
          initial={{ width: "15rem", opacity: 0 }}
          whileInView={{ width: "25rem", opacity: 0.4 }}
          transition={{
            delay: 0.3,
            duration: 1.2,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-30 h-32 w-[25rem] -translate-y-[11rem] left-[25%] -translate-x-1/2 rounded-full blur-xl pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(34, 211, 238, 0.4) 0%, rgba(34, 211, 238, 0.25) 25%, rgba(34, 211, 238, 0.1) 50%, transparent 75%)',
            maskImage: 'radial-gradient(ellipse at center, black 0%, rgba(0,0,0,0.8) 30%, rgba(0,0,0,0.4) 60%, transparent 100%)'
          }}
        ></motion.div>

        {/* Mid glow - medium spread with improved gradient */}
        <motion.div
          initial={{ width: "20rem", opacity: 0 }}
          whileInView={{ width: "40rem", opacity: 0.3 }}
          transition={{
            delay: 0.3,
            duration: 1.5,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-20 h-48 w-[40rem] -translate-y-[11rem] left-[25%] -translate-x-1/2 rounded-full blur-2xl pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(34, 211, 238, 0.25) 0%, rgba(34, 211, 238, 0.15) 20%, rgba(34, 211, 238, 0.08) 40%, rgba(34, 211, 238, 0.03) 60%, transparent 80%)',
            maskImage: 'radial-gradient(ellipse at center, black 0%, rgba(0,0,0,0.7) 25%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 75%, transparent 100%)'
          }}
        ></motion.div>

        {/* Outer glow - most diffuse with seamless edges */}
        <motion.div
          initial={{ width: "30rem", opacity: 0 }}
          whileInView={{ width: "60rem", opacity: 0.2 }}
          transition={{
            delay: 0.4,
            duration: 2.0,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-10 h-64 w-[60rem] -translate-y-[11rem] left-[25%] -translate-x-1/2 rounded-full blur-3xl pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(34, 211, 238, 0.15) 0%, rgba(34, 211, 238, 0.08) 15%, rgba(34, 211, 238, 0.04) 30%, rgba(34, 211, 238, 0.02) 45%, rgba(34, 211, 238, 0.01) 60%, transparent 80%)',
            maskImage: 'radial-gradient(ellipse at center, black 0%, rgba(0,0,0,0.6) 20%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.05) 70%, transparent 100%)'
          }}
        ></motion.div>

        {/* Atmospheric glow - very large and subtle with perfect edge blending */}
        <motion.div
          initial={{ width: "40rem", opacity: 0 }}
          whileInView={{ width: "100rem", opacity: 0.15 }}
          transition={{
            delay: 0.5,
            duration: 2.5,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-5 h-96 w-[100rem] -translate-y-[11rem] left-[25%] -translate-x-1/2 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(34, 211, 238, 0.08) 0%, rgba(34, 211, 238, 0.04) 10%, rgba(34, 211, 238, 0.02) 20%, rgba(34, 211, 238, 0.01) 30%, rgba(34, 211, 238, 0.005) 40%, transparent 60%)',
            maskImage: 'radial-gradient(ellipse at center, black 0%, rgba(0,0,0,0.5) 15%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.02) 50%, transparent 80%)',
            filter: 'blur(80px)'
          }}
        ></motion.div>

        {/* Ultra-wide atmospheric glow for seamless blending */}
        <motion.div
          initial={{ width: "60rem", opacity: 0 }}
          whileInView={{ width: "120rem", opacity: 0.08 }}
          transition={{
            delay: 0.6,
            duration: 3.0,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-0 h-[32rem] w-[120rem] -translate-y-[11rem] left-[25%] -translate-x-1/2 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(34, 211, 238, 0.03) 0%, rgba(34, 211, 238, 0.015) 8%, rgba(34, 211, 238, 0.008) 15%, rgba(34, 211, 238, 0.004) 25%, rgba(34, 211, 238, 0.002) 35%, transparent 50%)',
            maskImage: 'radial-gradient(ellipse at center, black 0%, rgba(0,0,0,0.3) 10%, rgba(0,0,0,0.05) 25%, rgba(0,0,0,0.01) 40%, transparent 70%)',
            filter: 'blur(120px)'
          }}
        ></motion.div>
        


        {/* Top mask - moved higher */}
        <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[16rem] bg-background"></div>
      </div>

      <div className="relative z-50 flex -translate-y-80 flex-col items-center px-5">
        {children}
      </div>
    </div>
  );
};
