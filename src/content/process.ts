// How a project runs: four stages in an order, each ending in something the
// client can hold us to. Rendered on /build ("What happens after you say yes?")
// and read by the website assistant, so the two cannot describe it differently.
//
// The about page names the same four stages in its own words (`approach` in
// about.tsx: Listen first, Scope honestly, Build iteratively, Run and evolve),
// in the same order. They are one process, not two; keep the order aligned if
// either list changes.

export type ProcessStage = {
  title: string;
  description: string;
  /**
   * Rendered inside the sentence "You get <output>.", so keep it a lower-case
   * noun phrase, not a sentence.
   */
  output: string;
};

export const processStages: ReadonlyArray<ProcessStage> = [
  {
    title: 'Understand',
    description: 'We discuss what you need, how your team works, and the constraints to account for.',
    output: 'a shared brief and priorities',
  },
  {
    title: 'Shape',
    description: 'We agree what to build, the budget, the timeline, and what each side will provide.',
    output: 'an agreed scope and delivery plan',
  },
  {
    title: 'Build',
    description: 'We build in stages, test the system, and review working versions with your team.',
    output: 'usable deliverables, reviewed together',
  },
  {
    title: 'Operate',
    description: 'We document the handover and provide hosting and ongoing support where agreed.',
    output: 'clear ownership and agreed support',
  },
];
