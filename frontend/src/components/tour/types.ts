// TypeScript declarations for Shepherd.js
declare module 'shepherd.js' {
  export interface TourOptions {
    defaultStepOptions?: StepOptions;
    useModalOverlay?: boolean;
    modalOverlayOpeningPadding?: number;
  }

  export interface StepOptions {
    id?: string;
    title?: string;
    text?: string;
    attachTo?: {
      element: string;
      on: 'top' | 'bottom' | 'left' | 'right';
    };
    buttons?: StepButton[];
    cancelIcon?: {
      enabled: boolean;
      label: string;
    };
    classes?: string;
    scrollTo?: boolean;
    popperOptions?: any;
  }

  export interface StepButton {
    text: string;
    action: () => void;
    classes?: string;
  }

  export class Tour {
    constructor(options: TourOptions);
    addStep(step: StepOptions): void;
    start(): void;
    complete(): void;
    next(): void;
    back(): void;
    on(event: string, handler: () => void): void;
  }

  export class Step {
    constructor(tour: Tour, options: StepOptions);
  }
} 