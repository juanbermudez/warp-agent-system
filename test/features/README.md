# Warp Enhancement Test Suite

This test suite validates the implementation of the enhanced Warp Agent System features:

1. **Hierarchical Task Management**
2. **Configurable Workflows in CKG**
3. **Scoped Inheritance & Overrides**
4. **Time-Based Traversal**

## Test Organization

The test suite is organized into three main test files:

1. **scope-resolution.test.ts**: Tests for scoped configuration inheritance and overrides
2. **time-based-traversal.test.ts**: Tests for temporal event tracking and queries
3. **hierarchical-tasks.test.ts**: Tests for the task hierarchy implementation

## Running the Tests

To run the tests, use the following commands:

```bash
# Install testing dependencies
npm install --save-dev jest @jest/globals @types/jest ts-jest

# Run all tests
npm test

# Run a specific test file
npx jest scope-resolution.test.ts
npx jest time-based-traversal.test.ts
npx jest hierarchical-tasks.test.ts

# Run a specific test case
npx jest -t "should fetch hierarchical task structure"
```

## Test Environment Setup

The tests use Jest mocks to simulate the database layer, allowing us to test the implementations without requiring an actual Dgraph instance. Each test file:

1. Mocks the `GraphDatabase` class from `../../src/db/dgraph`
2. Provides mock implementations for `executeQuery` and `executeMutation`
3. Simulates database responses for different query patterns

## Scope Resolution Tests

The scope resolution tests validate that the system correctly:

1. Resolves configurations (rules, workflows, personas) based on scope hierarchy
2. Applies the most specific scope when overrides exist
3. Collects compositional rules from different scopes
4. Creates new scoped configurations with proper relationships

Key test cases include:
- Rule resolution with multiple scope levels
- Workflow resolution with project-specific overrides
- Persona resolution with fallback to defaults
- Creation of scoped configurations

## Time-Based Traversal Tests

The time-based traversal tests validate that the system correctly:

1. Creates TimePoint entities for significant events
2. Queries events within specific time windows
3. Retrieves entity history in chronological order
4. Links TimePoints to entities with appropriate relationships

Key test cases include:
- Querying events within a time window
- Retrieving entity history
- TimePoint creation for entity operations
- Special handling for status changes

## Hierarchical Task Tests

The hierarchical task tests validate that the system correctly:

1. Manages tasks at different levels (PROJECT, MILESTONE, TASK, SUBTASK)
2. Establishes parent-child relationships between tasks
3. Analyzes dependencies considering both explicit dependencies and workflow steps
4. Creates complete task hierarchies

Key test cases include:
- Fetching hierarchical task structures
- Creating tasks at different levels
- Updating parent-child relationships
- Dependency analysis with workflow awareness
- Creating complete task hierarchies

## Integration Considerations

In a full implementation, additional tests would be needed to validate:

1. Integration between the three feature areas
2. Performance characteristics with large datasets
3. Edge cases and error handling
4. Compatibility with existing code

## Adding New Tests

When adding new tests:

1. Follow the same pattern of mock setup in the `beforeEach` function
2. Keep tests focused on a single aspect or functionality
3. Use clear, descriptive test names that explain the expected behavior
4. Add necessary mocks for any new query or mutation patterns
5. Group related tests together in describe blocks

## Debugging Tests

When debugging failing tests:

1. Use `console.log` to inspect mock calls and responses
2. Check the mock implementation to ensure it returns expected data
3. Verify the actual function implementation aligns with the test expectations
4. Use Jest's `--verbose` flag for detailed output: `npx jest --verbose`
