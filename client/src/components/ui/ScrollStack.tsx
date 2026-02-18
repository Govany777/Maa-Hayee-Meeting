import React, { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export interface ScrollStackItemProps {
    itemClassName?: string;
    children: ReactNode;
    index?: number;
}

export const ScrollStackItem: React.FC<ScrollStackItemProps> = ({ children, itemClassName = '', index = 0 }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "start start"]
    });

    // Native look stacking using sticky and index-based top
    // JS Scaling and opacity for polish
    const scale = useTransform(scrollYProgress, [0.8, 1], [1, 0.95 - index * 0.01]);
    const opacity = useTransform(scrollYProgress, [0.95, 1], [1, 0.9]);

    return (
        <motion.div
            ref={ref}
            className={`scroll-stack-card sticky w-full h-[22rem] p-8 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] box-border origin-top bg-white/40 backdrop-blur-xl border border-white/20 ${itemClassName}`.trim()}
            style={{
                top: `${80 + index * 30}px`, // Fixed sticky position
                scale,
                opacity,
                zIndex: index,
            }}
        >
            {children}
        </motion.div>
    );
};

interface ScrollStackProps {
    className?: string;
    children: ReactNode;
}

const ScrollStack: React.FC<ScrollStackProps> = ({
    children,
    className = '',
}) => {
    const [isMobile, setIsMobile] = useState(false);

    useLayoutEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!isMobile) return <>{children}</>;

    return (
        <div className={`relative w-full flex flex-col gap-16 pb-[25vh] ${className}`.trim()}>
            {React.Children.map(children, (child, index) => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child as React.ReactElement<any>, { index });
                }
                return child;
            })}
        </div>
    );
};

export default ScrollStack;
