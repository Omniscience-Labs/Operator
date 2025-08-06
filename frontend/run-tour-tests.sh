#!/bin/bash

# Tour Test Runner Script
# Run comprehensive tests for Shepherd tour functionality

echo "🧪 Running Tour Tests..."
echo "=========================="

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run specific tour tests
echo "🎯 Running Tour Component Tests..."
npm test -- --testPathPattern="tour" --verbose --coverage

# Run individual test suites
echo ""
echo "📋 Test Coverage Summary:"
echo "=========================="

echo "✅ OperatorTour Basic Tests"
npm test -- --testPathPattern="OperatorTour.test.tsx" --silent

echo "✅ OperatorTour Enhanced Tests" 
npm test -- --testPathPattern="OperatorTour.enhanced.test.tsx" --silent

echo "✅ Element Finder Tests"
npm test -- --testPathPattern="ElementFinders.test.tsx" --silent

echo "✅ Tour Progression Tests"
npm test -- --testPathPattern="TourProgression.test.tsx" --silent

echo "✅ AgentsPageTour Tests"
npm test -- --testPathPattern="AgentsPageTour.test.tsx" --silent

echo "✅ PublishAgentTour Tests"
npm test -- --testPathPattern="PublishAgentTour.test.tsx" --silent

echo ""
echo "🎉 All tour tests completed!"
echo ""
echo "📊 To run tests with watch mode:"
echo "npm test -- --testPathPattern=\"tour\" --watch"
echo ""
echo "📈 To run tests with detailed coverage:"
echo "npm test -- --testPathPattern=\"tour\" --coverage --verbose"