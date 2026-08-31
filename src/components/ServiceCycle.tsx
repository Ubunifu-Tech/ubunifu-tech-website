'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from 'framer-motion';
import {
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from 'lucide-react';
import { services } from '@/content/services';
import styles from './ServiceCycle.module.css';

const AUTO_ADVANCE_MS = 6200;
const ease = [0.16, 1, 0.3, 1] as const;

const panelVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 12 : -12,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -8 : 8,
  }),
};

export const ServiceCycle: React.FC = () => {
  const cycleRef = useRef<HTMLDivElement>(null);
  const inView = useInView(cycleRef, { amount: 0.28 });
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [manualMode, setManualMode] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 821px)');
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState === 'visible');
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  const autoplaying = Boolean(
    !reduceMotion &&
      desktop &&
      inView &&
      pageVisible &&
      !interactionPaused &&
      !userPaused &&
      !manualMode &&
      activeIndex < services.length - 1,
  );

  useEffect(() => {
    if (!autoplaying) return;

    const timer = window.setTimeout(() => {
      setDirection(1);
      setActiveIndex((current) => Math.min(current + 1, services.length - 1));
    }, AUTO_ADVANCE_MS);

    return () => window.clearTimeout(timer);
  }, [activeIndex, autoplaying]);

  const selectService = useCallback(
    (index: number, intentional = true) => {
      if (index === activeIndex) {
        if (intentional) setManualMode(true);
        return;
      }

      setDirection(index > activeIndex ? 1 : -1);
      setActiveIndex(index);
      if (intentional) setManualMode(true);
    },
    [activeIndex],
  );

  const moveSelection = useCallback(
    (step: number) => {
      const next = (activeIndex + step + services.length) % services.length;
      selectService(next);
    },
    [activeIndex, selectService],
  );

  const handleTabKey = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let next: number | undefined;

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      next = (index + 1) % services.length;
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      next = (index - 1 + services.length) % services.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = services.length - 1;
    }

    if (typeof next !== 'number') return;
    event.preventDefault();
    selectService(next);
    document.getElementById(`service-cycle-tab-${next}`)?.focus();
  };

  const activeService = services[activeIndex];
  const ActiveIcon = activeService.icon;
  const sequenceStatus = manualMode
    ? 'Manual selection'
    : activeIndex === services.length - 1
      ? 'Guided cycle complete'
      : userPaused
        ? 'Guided cycle paused'
        : 'Guided cycle';

  return (
    <motion.div
      ref={cycleRef}
      className={styles.cycle}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: reduceMotion ? 0 : 0.58, ease }}
      onMouseEnter={() => setInteractionPaused(true)}
      onMouseLeave={() => setInteractionPaused(false)}
      onFocusCapture={() => setInteractionPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setInteractionPaused(false);
        }
      }}
    >
      <div className={styles.desktopRail} role="tablist" aria-label="Consulting capabilities">
        <div className={styles.railHeader}>
          <span>Choose a starting point</span>
          <span>{String(activeIndex + 1).padStart(2, '0')} / {String(services.length).padStart(2, '0')}</span>
        </div>

        {services.map((service, index) => {
          const Icon = service.icon;
          const active = index === activeIndex;

          return (
            <button
              id={`service-cycle-tab-${index}`}
              key={service.key}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="service-cycle-panel"
              tabIndex={active ? 0 : -1}
              className={`${styles.tab} ${active ? styles.tabActive : ''}`}
              onClick={() => selectService(index)}
              onKeyDown={(event) => handleTabKey(event, index)}
            >
              {active && (
                <motion.span
                  className={styles.activeMarker}
                  layoutId="service-cycle-active-marker"
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 420, damping: 40, mass: 0.58 }
                  }
                  aria-hidden="true"
                />
              )}
              <span className={styles.tabIndex}>{String(index + 1).padStart(2, '0')}</span>
              <span className={styles.tabIcon} aria-hidden="true"><Icon size={18} /></span>
              <span className={styles.tabLabel}>{service.title}</span>
              <ChevronRight className={styles.tabArrow} size={17} aria-hidden="true" />
              {active && (
                <span className={styles.progressTrack} aria-hidden="true">
                  <motion.span
                    key={`${activeIndex}-${autoplaying}`}
                    className={styles.progressFill}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: autoplaying ? 1 : 0 }}
                    transition={{ duration: autoplaying ? AUTO_ADVANCE_MS / 1000 : 0.16, ease: 'linear' }}
                  />
                </span>
              )}
            </button>
          );
        })}

        <div className={styles.railFooter}>
          <span>{sequenceStatus}</span>
          <button
            type="button"
            className={styles.tourControl}
            onClick={() => setUserPaused((paused) => !paused)}
            disabled={manualMode || activeIndex === services.length - 1}
            aria-label={userPaused ? 'Resume guided capability cycle' : 'Pause guided capability cycle'}
          >
            {userPaused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
            <span>{userPaused ? 'Resume' : 'Pause'}</span>
          </button>
        </div>
      </div>

      <div className={styles.desktopPanel}>
        <div className={styles.panelTopline}>
          <span>One team · connected delivery</span>
          <div className={styles.stepControls} aria-label="Capability controls">
            <button type="button" onClick={() => moveSelection(-1)} aria-label="Previous capability">
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => moveSelection(1)} aria-label="Next capability">
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <AnimatePresence initial={false} custom={direction}>
          <motion.span
            key={`sequence-${activeIndex}`}
            className={styles.panelSequence}
            custom={direction}
            initial={reduceMotion ? false : { opacity: 0, x: direction > 0 ? 24 : -24 }}
            animate={{ opacity: 0.055, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: direction > 0 ? -16 : 16 }}
            transition={{ duration: reduceMotion ? 0 : 0.44, ease }}
            aria-hidden="true"
          >
            {String(activeIndex + 1).padStart(2, '0')}
          </motion.span>
        </AnimatePresence>

        <div className={styles.panelViewport}>
          <AnimatePresence mode="sync" initial={false} custom={direction}>
            <motion.div
              id="service-cycle-panel"
              key={activeService.key}
              role="tabpanel"
              aria-labelledby={`service-cycle-tab-${activeIndex}`}
              className={styles.panelContent}
              custom={direction}
              variants={panelVariants}
              initial={reduceMotion ? false : 'enter'}
              animate="center"
              exit={reduceMotion ? undefined : 'exit'}
              transition={{ duration: reduceMotion ? 0 : 0.36, ease }}
            >
              <div className={styles.panelIcon} aria-hidden="true"><ActiveIcon size={28} /></div>
              <p className={styles.panelEyebrow}>{activeService.summary}</p>
              <h3 className={styles.panelTitle}>{activeService.title}</h3>
              <p className={styles.panelDescription}>{activeService.description}</p>

              <ul className={styles.outcomes} aria-label={`${activeService.title} includes`}>
                {activeService.items.slice(0, 3).map((item, index) => (
                  <motion.li
                    key={item}
                    initial={reduceMotion ? false : { opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : 0.1 + index * 0.045, ease }}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    {item}
                  </motion.li>
                ))}
              </ul>

              <Link href={`#${activeService.key}`} className={styles.panelLink}>
                Explore this capability <ArrowDownRight size={18} aria-hidden="true" />
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className={styles.mobileList} aria-label="Consulting capabilities">
        {services.map((service, index) => {
          const Icon = service.icon;
          const active = index === activeIndex;

          return (
            <div key={service.key} className={`${styles.mobileItem} ${active ? styles.mobileItemActive : ''}`}>
              <button
                type="button"
                className={styles.mobileTrigger}
                aria-expanded={active}
                aria-controls={`service-mobile-panel-${index}`}
                onClick={() => selectService(index)}
              >
                <span className={styles.mobileIndex}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.mobileIcon} aria-hidden="true"><Icon size={18} /></span>
                <span>{service.title}</span>
                <ChevronRight className={styles.mobileArrow} size={18} aria-hidden="true" />
              </button>

              <AnimatePresence initial={false}>
                {active && (
                  <motion.div
                    id={`service-mobile-panel-${index}`}
                    className={styles.mobilePanel}
                    initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.34, ease }}
                  >
                    <p className={styles.mobileSummary}>{service.summary}</p>
                    <p className={styles.mobileDescription}>{service.description}</p>
                    <ul className={styles.mobileOutcomes}>
                      {service.items.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
                    </ul>
                    <Link href={`#${service.key}`} className={styles.mobileLink}>
                      Explore this capability <ArrowDownRight size={17} aria-hidden="true" />
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
