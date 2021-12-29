import React, { useEffect, useState, useRef } from 'react';
import { microphone } from 'lib/audio/microphone';
import './AssistantMicDots.scss';

/**
 * Renders mic dots which responds to user's loudness and
 * manages audio data from microhone.
 */
function AssistantMicDots() {
  const [micLevel, setMicLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const micDotsContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set a max threshold as it could trigger a false-positive
    // of the user speaking when "ping" sound is played
    let speakingLevelThrehold = 1;

    // Reset the threshold only after the "ping" is played
    setTimeout(() => {
      speakingLevelThrehold = 0.3;
    }, 300);

    // Manage mic audio data
    microphone.on('mic:data', (data) => {
      const { buffer, level } = data;

      if (level > speakingLevelThrehold) {
        setIsSpeaking(true);
      }

      setMicLevel(level);
    });

    // Interval handles for mic dots "waiting-to-speak" animation
    let intervalHandles: number[] = [];

    bootstrapWaitingToSpeakAnimation(micDotsContainer).then((intervals) => {
      intervalHandles = intervals;
    });

    // Cleanup on unmount
    return () => {
      // Remove "mic:data" event listener when unmounting
      microphone.off('mic:data');

      // Cleanup intervals if the user hasn't spoken anything to disable
      // the "waiting-to-speak" animation
      intervalHandles.forEach((intervalId) => clearInterval(intervalId));
    };
  }, []);

  return (
    <div
      id="assistant-mic-dots-container"
      data-isspeaking={isSpeaking}
      ref={micDotsContainer}
      style={{
        '--microphone-level': isSpeaking ? micLevel : 0,
      } as React.CSSProperties}
    >
      <div className="blue-dot assistant-mic-dot" />
      <div className="red-dot assistant-mic-dot" />
      <div className="yellow-dot assistant-mic-dot" />
      <div className="green-dot assistant-mic-dot" />
    </div>
  );
}

/**
 * Bootstraps **Waiting-to-speak** animation on the microphone dots
 */
function bootstrapWaitingToSpeakAnimation(
  micDotsContainerRef: React.RefObject<HTMLDivElement>,
): Promise<number[]> {
  // Animation Parameters
  // Controls animation behavior

  const dotOscillationDuration = 800;
  const dotOscillationAmplitude = 2;
  const dotOscillationDelayFactor = 120;

  // Resolve interval handles to the caller.
  // These interval handles could be used to cleanup
  // running intervals when the component unmounts.

  return new Promise((resolve, reject) => {
    const intervalHandles: number[] = [];
    const micDotsContainer = micDotsContainerRef.current;

    // If `micDotsContainer` is not `ref`ed properly, reject the promise
    if (micDotsContainer === null) {
      reject(
        Error([
          'Failed to bootstrap "waiting-to-speak" animation.',
          'Could not get ref to "micDotsContainer"',
        ].join(' ')),
      );

      return;
    }

    // Wait till the dots are revealed by initial animation
    setTimeout(() => {
      const dots = micDotsContainer.querySelectorAll('.assistant-mic-dot'); // Mic Dots
      const dirs = Array<number>(dots.length).fill(1); // Direction vectors

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i] as HTMLDivElement;

        // Reset some CSS properties
        dot.style.setProperty('animation', 'none');
        dot.style.setProperty('opacity', '1');
        dot.style.setProperty(
          'transition',
          `transform ${dotOscillationDuration}ms ease-in-out, height 200ms ease-in-out`,
        );

        // Staggerred animation
        setTimeout(() => {
          const oscillate = () => {
            const dir = dirs[i];
            dirs[i] *= -1;

            // Disable "waiting-to-speak" animation once the user starts speaking
            if (micDotsContainer.getAttribute('data-isspeaking') === 'true') {
              dot.style.setProperty('transform', 'translateY(0)');

              // No need to oscillate anymore
              clearInterval(intervalId);
              return;
            }

            dot.style.setProperty(
              'transform',
              `translateY(${dotOscillationAmplitude * dir}px)`,
            );
          };

          // Oscillate the dots
          const intervalId = setInterval(oscillate, dotOscillationDuration);
          oscillate();

          intervalHandles.push(intervalId);
        }, dotOscillationDelayFactor * i);

        // Return the interval IDs
        resolve(intervalHandles);
      }
    }, 500);
  });
}

export default AssistantMicDots;
