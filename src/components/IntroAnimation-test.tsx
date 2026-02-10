"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface IntroAnimationProps {
  onFinish?: () => void;
}

export default function IntroAnimation({ onFinish }: IntroAnimationProps) {
  // 1. DEFAULT TO FALSE (Hidden). 
  // This prevents it from flashing on screen when you navigate back to the dashboard.
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 2. Check storage immediately upon mounting
    const hasSeen = sessionStorage.getItem("hasSeenIntro");

    if (hasSeen) {
      // 3. If seen, DO NOT SHOW. Just tell parent we are done.
      // This happens instantly, so the user just sees the dashboard/login immediately.
      if (onFinish) onFinish();
    } else {
      // 4. Only if NOT seen, verify we are ready and show animation
      setShow(true);

      // Set timer to remove the animation
      const timer = setTimeout(() => {
        setShow(false);
        sessionStorage.setItem("hasSeenIntro", "true");
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [onFinish]);

  return (
    <AnimatePresence 
      // Ensure parent waits for exit animation to finish
      onExitComplete={() => {
        // Only trigger finish if we actually showed something
        // Otherwise the useEffect above handles the 'instant' finish
        if (show && onFinish) onFinish();
      }}
    >
      {show && (
        <motion.div
          key="intro-overlay"
          initial={{ opacity: 0 }} // Start invisible to be safe
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tighter">
              Thesis Mentoring <span className="text-blue-500"> Hub 5.0</span>
            </h1>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: 0.5, duration: 1 }}
              className="h-1 bg-blue-500 mt-4 rounded-full mx-auto"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}