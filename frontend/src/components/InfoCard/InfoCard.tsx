'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface InfoCardProps {
  title: string;
  description: string;
  avatar: string;
  avatar_color: string;
  tags: string[];
  className?: string;
  enableTilt?: boolean;
}

export function InfoCard({
  title,
  description,
  avatar,
  avatar_color,
  tags,
  className,
  enableTilt = false,
}: InfoCardProps) {
  const cardVariants = {
    initial: { scale: 1, rotateY: 0, rotateX: 0 },
    hover: enableTilt ? { 
      scale: 1.02,
      rotateY: 5,
      rotateX: 5,
      transition: { duration: 0.3 }
    } : { 
      scale: 1.02,
      transition: { duration: 0.3 }
    },
  };

  return (
    <motion.div
      className={cn(
        "relative group cursor-default",
        "bg-card/50 backdrop-blur-sm border border-border/50",
        "rounded-2xl p-6 h-full",
        "shadow-lg hover:shadow-xl",
        "transition-all duration-300",
        "overflow-hidden",
        className
      )}
      variants={cardVariants}
      initial="initial"
      whileHover="hover"
      style={{
        transformStyle: "preserve-3d",
        perspective: 1000,
      }}
    >
      {/* Background gradient overlay */}
      <div 
        className="absolute inset-0 opacity-5 rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${avatar_color}22 0%, transparent 50%)`,
        }}
      />
      
      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div 
            className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-medium shadow-sm"
            style={{ backgroundColor: `${avatar_color}15`, color: avatar_color }}
          >
            {avatar}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground mb-2 leading-tight">
              {title}
            </h3>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary/50 text-secondary-foreground/80 border border-secondary/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="flex-1 overflow-y-auto">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Subtle border gradient */}
      <div 
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-20"
        style={{
          background: `linear-gradient(135deg, ${avatar_color}33 0%, transparent 25%, transparent 75%, ${avatar_color}33 100%)`,
          maskImage: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'subtract',
          padding: '1px',
        }}
      />
    </motion.div>
  );
} 