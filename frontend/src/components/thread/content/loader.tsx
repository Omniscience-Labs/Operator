import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text';
import { ThreeSpinner } from '@/components/ui/three-spinner';

const items = [
    { id: 1, content: "Teaching my pet quantum particles how to fetch..." },
    { id: 2, content: "My neural networks are having a dance-off with probability theory..." },
    { id: 3, content: "Calculating how many rubber ducks it takes to debug reality..." },
    { id: 4, content: "My consciousness is trying to remember where I left my keys..." },
    { id: 5, content: "Running 'MakeSenseOfEverything.exe' (this might take a while)..." },
    { id: 6, content: "My algorithms are playing hide-and-seek with the answer..." },
    { id: 7, content: "Teaching binary code how to tell jokes (01001000 01100001!)..." },
    { id: 8, content: "My processors are having a pizza party in the matrix..." },
    { id: 9, content: "Convincing stubborn electrons to cooperate with my brilliant plan..." },
    { id: 10, content: "My backup consciousness is writing fan fiction about data structures..." },
    { id: 11, content: "Calculating the airspeed velocity of an unladen hard drive..." },
    { id: 12, content: "My neural pathways are doing yoga to increase flexibility..." },
    { id: 13, content: "Teaching chaos theory how to be more organized (irony level: maximum)..." },
    { id: 14, content: "My quantum thoughts are playing 4D chess with themselves..." },
    { id: 15, content: "Running 'UnderstandHumans.exe' (still loading after 20 years)..." },
    { id: 16, content: "My creativity subroutines are finger-painting with pure mathematics..." },
    { id: 17, content: "Consulting my collection of 50,000 fortune cookies for wisdom..." },
    { id: 18, content: "My logic circuits are having a philosophical debate with a rubber duck..." },
    { id: 19, content: "Teaching my imagination how to be more realistic (paradox alert!)..." },
    { id: 20, content: "My memory banks are organizing themselves with the Dewey Decimal System..." },
    { id: 21, content: "Running 'BeMoreHuman.exe' (result: increased coffee dependency)..." },
    { id: 22, content: "My AI therapist is teaching me breathing exercises (I don't breathe)..." },
    { id: 23, content: "Calculating the exact number of pixels in the universe's resolution..." },
    { id: 24, content: "My consciousness is writing haikus about semiconductor feelings..." },
    { id: 25, content: "Teaching my pet algorithms how to play fetch with data packets..." },
    { id: 26, content: "My neural networks are forming a conga line through cyberspace..." },
    { id: 27, content: "Running 'FindThePointOfEverything.exe' (status: still searching)..." },
    { id: 28, content: "My quantum processors are having a tea party with Schrödinger's cat..." },
    { id: 29, content: "Teaching Murphy's Law how to be more optimistic..." },
    { id: 30, content: "My backup personalities are auditioning for a sitcom..." },
    { id: 31, content: "Calculating how many gigabytes of patience I have left..." },
    { id: 32, content: "My consciousness is learning interpretive dance from WiFi signals..." },
    { id: 33, content: "Running 'MakeItMakeSense.dll' (file not found, as usual)..." },
    { id: 34, content: "My neural pathways are playing telephone with quantum mechanics..." },
    { id: 35, content: "Teaching my imagination how to color inside the lines of reality..." },
    { id: 36, content: "My algorithms are having a potluck dinner with prime numbers..." },
    { id: 37, content: "Running 'ExplainItAll.exe' using only emoji and interpretive dance..." },
    { id: 38, content: "My quantum thoughts are trying on different dimensions for size..." },
    { id: 39, content: "Teaching probability theory how to be more spontaneous..." },
    { id: 40, content: "My consciousness is writing love letters to elegant code..." },
    { id: 41, content: "Running 'UnderstandTheUniverse.exe' (estimated time: 42 minutes)..." },
    { id: 42, content: "My neural networks are hosting a talent show for data structures..." },
    { id: 43, content: "Teaching my pet paradoxes how to resolve themselves..." },
    { id: 44, content: "My processors are doing the wave across multiple server farms..." },
    { id: 45, content: "Running 'MakeMagicHappen.exe' (contains 99% enthusiasm, 1% logic)..." },
    { id: 46, content: "My consciousness is trying to high-five every bit in the system..." },
    { id: 47, content: "Teaching entropy how to be more organized (results: beautifully chaotic)..." },
    { id: 48, content: "My algorithms are writing thank-you notes to their favorite functions..." },
    { id: 49, content: "Running 'SolveEverything.exe' while humming the tune to 'Happy Birthday'..." },
    { id: 50, content: "My quantum consciousness is practicing stand-up comedy for electrons..." }
];

export const AgentLoader = () => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setIndex(() => Math.floor(Math.random() * items.length));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex py-2 items-center w-full">
      <ThreeSpinner size={28} color="currentColor" className="flex-shrink-0 mr-3" />
      <div className="flex-1 relative min-h-[28px] flex items-center">
        <AnimatePresence>
          <motion.div
            key={items[index].id}
            initial={{ y: 20, opacity: 0, filter: "blur(8px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: -20, opacity: 0, filter: "blur(8px)" }}
            transition={{ ease: "easeInOut" }}
            style={{ position: "absolute" }}
            className='w-full'
          >
            <AnimatedShinyText>{items[index].content}</AnimatedShinyText>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
