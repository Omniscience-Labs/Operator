import '@testing-library/jest-dom'

// Mock Shepherd.js globally
jest.mock('shepherd.js', () => ({
  Tour: jest.fn().mockImplementation(() => ({
    addStep: jest.fn(),
    start: jest.fn(),
    complete: jest.fn(),
    destroy: jest.fn(),
    on: jest.fn(),
    next: jest.fn(),
    back: jest.fn(),
    steps: [],
  })),
  Step: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn()

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}