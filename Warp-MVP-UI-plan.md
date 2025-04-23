# Enhanced Warp MVP UI Implementation Guide

## Overview & Context

This guide provides a comprehensive implementation plan for the Warp MVP UI, with specific emphasis on template adaptation and context for the Warp agent system architecture.

### Key Implementation Sources

1. **Dashboard Template**: Located at `ui-examples/dashboard-template-main` - A complete Tremor-based dashboard that will serve as the foundation for our Electron application UI
2. **Website Template**: Located at `ui-examples/website-template` - A separate template for the standalone marketing site

### Warp System Architecture Context

The Warp system is a multi-agent architecture for software development:

- **Central Knowledge Graph (CKG)**: Stores hierarchical task structure, workflow definitions, scoped configurations
- **Agent System**: Orchestrator coordinates specialized agents (PL, DE, FE, BE, QA)
- **Task Hierarchy**: Project → Milestone → Task → SubTask with JIT decomposition
- **Workflow Enforcement**: Tasks follow defined workflow steps with scope-specific configurations
- **HITL Integration**: Human checkpoints for approvals at critical junctures

The UI's primary purpose is to provide a read-only visualization of this system, showing task status, agent activities, and logs without interactive capabilities beyond basic navigation.

## Implementation Plan

### Phase 1: Electron App UI - Project Initialization & Template Copy

#### Task 1.1: Establish UI Directory & Copy Dashboard Template
```bash
# Create the renderer directory
mkdir -p src/renderer

# Copy the entire dashboard template into renderer directory
cp -r ui-examples/dashboard-template-main/* src/renderer/

# Navigate into renderer directory
cd src/renderer
```

#### Task 1.2: Adapt Vite Configuration
Modify the existing `vite.config.ts` from the template to work within the Electron environment:

```typescript
// src/renderer/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './', // Required for Electron to load assets correctly
  build: {
    outDir: '../../dist/renderer', // Output to the correct location for Electron
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

#### Task 1.3: Configure Template Dependencies
The dashboard template already includes Tremor, Tailwind, etc. Ensure all dependencies are correctly installed:

```bash
# Review existing package.json from template
cat package.json

# Install any missing dependencies
npm install
```

#### Task 1.4: Configure Electron Integration
Update the main Electron process to load the Vite-built renderer:

```typescript
// src/index.ts (Main Electron process)
import { app, BrowserWindow } from 'electron';
import * as path from 'path';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
});
```

### Phase 2: Dashboard Template Analysis & Adaptation

#### Task 2.1: Review Template Structure & Component Inventory
Analyze the dashboard template structure and create an inventory of all Tremor components used:

```bash
# List the template's structure
find . -type f -name "*.tsx" | sort
```

Create a component inventory document to catalog all Tremor components used in the template:

```typescript
// src/renderer/docs/tremor-component-inventory.md
# Tremor Component Inventory

## Layout Components
- Card: Used for content containers
- Grid: Used for responsive layouts
- Flex: Used for flexible layouts
- Col: Used within Grid for column layouts
- Divider: Used for visual separation

## Data Display Components
- Table: Used for tabular data
- List: Used for simple lists
- BarList: Used for lists with metrics
- Text: Used for body text
- Title: Used for section titles
- Metric: Used for large number display

## Navigation Components
- Tab: Used for content tabs
- TabGroup: Used as container for Tab components
- TabList: Used for grouping Tab elements
- TabPanel: Used for tab content

## Form Components
- TextInput: Used for text entry
- Select: Used for dropdown selection
- NumberInput: Used for number entry
- DateRangePicker: Used for date selection

## Charts
- BarChart: Used for comparison charts
- LineChart: Used for trend visualization
- DonutChart: Used for part-to-whole visualization

## Each component should be directly reused rather than recreated.
```

Key components to identify:
- Layout components (Sidebar, Header)
- Dashboard views
- Data tables
- Charts and visualizations
- Navigation structure

#### Task 2.2: Adapt Main Layout
Modify the main layout component from the template to reflect Warp's structure:

```typescript
// src/renderer/layouts/MainLayout.tsx (adapted from template)
import { Sidebar } from '../components/ui/layout/Sidebar';
import { Header } from '../components/ui/layout/Header';

// Use the existing template structure, with Warp-specific navigation items
const navItems = [
  { name: 'Dashboard', href: '/', icon: 'HomeIcon' },
  { name: 'Tasks', href: '/tasks', icon: 'ClipboardListIcon' },
  { name: 'Agents', href: '/agents', icon: 'UserGroupIcon' },
  { name: 'Settings', href: '/settings', icon: 'CogIcon' },
];

export function MainLayout({ children }) {
  // Keep the template's layout structure intact
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      <Sidebar navItems={navItems} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
```

#### Task 2.3: Adapt Task Table from Template
Find an appropriate table component in the template and adapt it for task display:

```typescript
// src/renderer/components/ui/table/TaskTable.tsx
// (Based on an existing table component from the template)
import { 
  Card, 
  Table, 
  TableHead, 
  TableRow, 
  TableHeaderCell, 
  TableBody, 
  TableCell, 
  Badge
} from "@tremor/react";

// Use the template's table structure with Warp-specific fields
export function TaskTable({ tasks, onTaskSelect }) {
  return (
    <Card>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Agent</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks.map((task) => (
            <TableRow 
              key={task.id}
              onClick={() => onTaskSelect?.(task.id)}
              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <TableCell>
                <div style={{ paddingLeft: `${task.level * 1.5}rem` }}>
                  {task.name}
                </div>
              </TableCell>
              <TableCell>{task.type}</TableCell>
              <TableCell>
                <Badge color={getStatusColor(task.status)}>
                  {task.status}
                </Badge>
              </TableCell>
              <TableCell>{task.agent || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

// Use the template's color scheme for status indicators
function getStatusColor(status) {
  switch (status.toLowerCase()) {
    case 'completed': return 'green';
    case 'in_progress': return 'blue';
    case 'pending': return 'yellow';
    case 'blocked': return 'red';
    case 'awaiting_hitl': return 'purple';
    default: return 'gray';
  }
}
```

#### Task 2.4: Adapt Authentication from Login 4 Block
Find and adapt the Login 4 block from examples:

```bash
# Copy the Login 4 block from examples
cp ui-examples/login-4/* src/renderer/components/ui/auth/
```

### Phase 3: Views Implementation (Adapting Template Pages)

#### Task 3.1: Dashboard View
Adapt the dashboard view from the template:

```typescript
// src/renderer/views/dashboard/DashboardView.tsx
// (Based on the template's dashboard page)
import { Grid, Card, Title, Text, Metric, BarList, DonutChart } from "@tremor/react";

export function DashboardView() {
  // Use the template's dashboard layout with Warp-specific metrics
  return (
    <div className="space-y-6">
      <Title>Warp System Dashboard</Title>
      
      <Grid numItems={1} numItemsMd={2} numItemsLg={3} className="gap-6">
        {/* Task Stats Card - from template */}
        <Card>
          <Title>Task Overview</Title>
          <Metric>42 Active Tasks</Metric>
          <DonutChart
            data={[
              { name: 'Completed', value: 15 },
              { name: 'In Progress', value: 20 },
              { name: 'Awaiting HITL', value: 5 },
              { name: 'Blocked', value: 2 },
            ]}
            category="value"
            index="name"
            className="mt-6"
          />
        </Card>
        
        {/* Agent Activity Card - from template */}
        <Card>
          <Title>Agent Activity</Title>
          <BarList
            data={[
              { name: 'Backend Engineer', value: 12 },
              { name: 'Frontend Engineer', value: 10 },
              { name: 'QA Tester', value: 8 },
              { name: 'Design Engineer', value: 5 },
              { name: 'Product Lead', value: 3 },
            ]}
            className="mt-6"
          />
        </Card>
        
        {/* HITL Queue Card - from template */}
        <Card>
          <Title>HITL Queue</Title>
          <Metric>5 Pending Reviews</Metric>
          <Text>Latest: Code Review for Task #1234</Text>
        </Card>
      </Grid>
    </div>
  );
}
```

#### Task 3.2: Task List View
Adapt a list view from the template:

```typescript
// src/renderer/views/dashboard/TaskListView.tsx
// (Based on the template's list page)
import { useState } from 'react';
import { Card, Title, TabGroup, TabList, Tab, TabPanels, TabPanel } from "@tremor/react";
import { TaskTable } from '../../components/ui/table/TaskTable';
import { TaskDetailDrawer } from '../../components/ui/drawers/TaskDetailDrawer';

// Mock data - would be replaced with Electron IPC data in Phase 6
const mockTasks = [
  // Sample task data structure matching Warp architecture
];

export function TaskListView() {
  // Adapt the template's tab structure for task filtering
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  
  return (
    <div className="space-y-6">
      <Title>Tasks</Title>
      
      <Card>
        <TabGroup 
          index={selectedTab} 
          onIndexChange={setSelectedTab}
        >
          <TabList>
            <Tab>All Tasks</Tab>
            <Tab>In Progress</Tab>
            <Tab>Awaiting HITL</Tab>
            <Tab>Completed</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <TaskTable 
                tasks={mockTasks} 
                onTaskSelect={setSelectedTaskId} 
              />
            </TabPanel>
            {/* Additional tab panels with filtered tasks */}
          </TabPanels>
        </TabGroup>
      </Card>
      
      {selectedTaskId && (
        <TaskDetailDrawer
          taskId={selectedTaskId}
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}
```

### Phase 4: Landing Page Setup (Website Template)

#### Task 4.1: Create Landing Page Directory & Copy Template
```bash
# Create website directory at the root level (separate from src/)
mkdir -p website

# Copy the website template into the website directory
cp -r ui-examples/website-template/* website/

# Navigate into website directory
cd website
```

#### Task 4.2: Adapt Website Template
The website implementation is completely separate from the Electron app:

```bash
# Install dependencies for the website project
npm install

# Start the website dev server to test
npm run dev
```

### Phase 5: Data Integration via Electron IPC

#### Task 5.1: Define IPC Communication
Set up the Electron IPC channels for data communication:

```typescript
// src/preload.ts (Electron preload script)
import { contextBridge, ipcRenderer } from 'electron';

// Expose safe IPC channels to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Task data
  getTasks: () => ipcRenderer.invoke('get-tasks'),
  getTaskById: (taskId) => ipcRenderer.invoke('get-task-by-id', taskId),
  getTaskLogs: (taskId) => ipcRenderer.invoke('get-task-logs', taskId),
  
  // Authentication
  login: (credentials) => ipcRenderer.invoke('login', credentials),
  logout: () => ipcRenderer.invoke('logout'),
  getUser: () => ipcRenderer.invoke('get-user'),
});
```

#### Task 5.2: Implement Data Hooks
Create hooks to access the IPC channels:

```typescript
// src/renderer/hooks/useTaskData.ts
import { useState, useEffect } from 'react';

export function useTaskData() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const result = await window.electronAPI.getTasks();
        setTasks(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTasks();
    
    // Set up polling or event-based updates
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, []);
  
  return { tasks, loading, error };
}
```

### Phase 6: Connect UI to Warp Agent System

#### Task 6.1: Update Task Table with Real Data
Modify the task view to use real data from Electron IPC:

```typescript
// src/renderer/views/dashboard/TaskListView.tsx (updated)
import { useTaskData } from '../../hooks/useTaskData';

export function TaskListView() {
  const { tasks, loading, error } = useTaskData();
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  
  // Now using real data from the Warp agent system
  return (
    <div className="space-y-6">
      <Title>Tasks</Title>
      
      {loading ? (
        <Card>
          <div className="h-32 flex items-center justify-center">
            <Spinner />
          </div>
        </Card>
      ) : error ? (
        <Card>
          <Text color="red">Error loading tasks: {error.message}</Text>
        </Card>
      ) : (
        <Card>
          <TaskTable 
            tasks={tasks} 
            onTaskSelect={setSelectedTaskId} 
          />
        </Card>
      )}
      
      {selectedTaskId && (
        <TaskDetailDrawer
          taskId={selectedTaskId}
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}
```

## Implementation Tips

### Core Component Directive

**IMPORTANT: DO NOT CREATE NEW COMPONENTS IF TREMOR PROVIDES AN EQUIVALENT**

When implementing the Warp UI:

1. **Always use existing Tremor components first** - The Tremor library provides a comprehensive set of components that should cover most needs:
   - Layout: `Grid`, `Flex`, `Col`, `Divider`
   - Data display: `Table`, `Card`, `List`, `BarList`
   - Navigation: `Tab`, `TabGroup`, `TabList`
   - Feedback: `Badge`, `Button`, `Alert`
   - Forms: `TextInput`, `Select`, `DateRangePicker`
   - Charts: `BarChart`, `DonutChart`, `LineChart`, etc.

2. **Create thin wrapper components only when necessary** to:
   - Add consistent props specific to Warp's data model
   - Apply consistent styling across the application
   - Handle repeated composition patterns (e.g., a Card with a Title and Table inside)

3. **Extend existing components rather than building new ones** by:
   - Using composition patterns (wrapping Tremor components)
   - Leveraging CSS/Tailwind for styling customizations
   - Adding Warp-specific functionality around core Tremor components

Example of correct component usage:
```typescript
// GOOD: Using Tremor components directly
import { Card, Title, Table } from "@tremor/react";

function TaskSection() {
  return (
    <Card>
      <Title>Tasks</Title>
      <Table>
        {/* Table content */}
      </Table>
    </Card>
  );
}
```

Example of what to avoid:
```typescript
// BAD: Creating custom components that duplicate Tremor functionality
function CustomCard({ children }) {
  return <div className="bg-white rounded-lg shadow p-4">{children}</div>;
}

function CustomTitle({ children }) {
  return <h2 className="text-xl font-bold mb-4">{children}</h2>;
}
```

### Template Adaptation Strategy

1. **Preserve the Template Structure**: Keep the core Tremor dashboard structure intact
2. **Minimal Customization**: Focus on adapting the content, not redesigning the UI
3. **Component Reuse**: Identify and reuse template components wherever possible
4. **Consistent Styling**: Maintain the template's color scheme and visual hierarchy

### Warp-Specific Considerations

1. **Task Hierarchy Visualization**: Use indentation in tables to show the Project → Milestone → Task → SubTask hierarchy
2. **Agent Role Color Coding**: Use consistent colors for different agent roles
3. **HITL Indicator**: Use prominent visual indicators for tasks awaiting human review
4. **Log Display**: Implement expandable log sections in the task detail view

### Tremor Component Usage Guidelines

1. **Card for Content Grouping**: Wrap logical sections in Card components
2. **Grid for Layout**: Use Grid for responsive layouts
3. **TabGroup for Filtering**: Use TabGroup for switching between different data views
4. **Badges for Status**: Use Badge components for task status indicators
5. **Charts for Metrics**: Use Tremor's chart components for basic visualizations

## Data Structure Mapping

### Warp CKG to UI Data Model

The Warp CKG contains hierarchical task data that needs to be flattened for UI display:

```typescript
// Task data structure mapping from CKG to UI
interface UITask {
  id: string;               // From CKG Task.id
  name: string;             // From CKG Task.name
  description: string;      // From CKG Task.description
  type: string;             // 'Project', 'Milestone', 'Task', or 'SubTask'
  status: string;           // Derived from CKG Task.status
  agent: string;            // From CKG ASSIGNED_TO relationship
  level: number;            // Calculated based on hierarchy depth
  parentId: string;         // From CKG PART_OF relationship
  logs: TaskLog[];          // From CKG LOGS_TO relationships
  scopeContext: {           // From CKG Task.scopeContext
    userId?: string;
    projectId?: string;
    teamId?: string;
    orgId?: string;
  };
}
```

### Agent System to UI Status Mapping

The Warp agent system states need to be mapped to UI status indicators:

```typescript
// Agent status mapping
const agentStatusMap = {
  'idle': { label: 'Idle', color: 'gray' },
  'busy': { label: 'Working', color: 'blue' },
  'waiting_hitl': { label: 'Awaiting Human Input', color: 'purple' },
  'error': { label: 'Error', color: 'red' },
};

// Task status mapping
const taskStatusMap = {
  'not_started': { label: 'Not Started', color: 'gray' },
  'in_progress': { label: 'In Progress', color: 'blue' },
  'awaiting_hitl': { label: 'Awaiting HITL', color: 'purple' },
  'blocked': { label: 'Blocked', color: 'red' },
  'completed': { label: 'Completed', color: 'green' },
};
```

## Component Library Structure

The component library should be structured as follows:

```
src/renderer/components/
├── ui/                   # Base reusable components
│   ├── README.md         # Documentation emphasizing Tremor reuse
│   ├── layout/           # Layout components (thin wrappers)
│   │   ├── MainLayout.tsx  # Based directly on template layout
│   │   ├── Sidebar.tsx     # Direct reuse from template
│   │   └── Header.tsx      # Direct reuse from template
│   ├── data/             # Data display components
│   │   ├── TaskTable.tsx   # Thin wrapper around Tremor Table
│   │   └── LogDisplay.tsx  # Composed from Tremor components
│   ├── drawers/          # Slide-in panels
│   │   └── TaskDetailDrawer.tsx # Composed from Tremor components
│   └── auth/             # Authentication components
│       └── LoginForm.tsx   # From Login 4 block template
└── composite/            # Business-specific composite components
    ├── README.md         # Documentation for domain components
    ├── TaskList.tsx      # Business component using ui/data/TaskTable
    └── TaskDetail.tsx    # Business component using multiple ui components
```

### Component Creation Guidelines

1. **Direct Use**: For simple cases, use Tremor components directly in views
   ```tsx
   import { Card, Title, Text } from "@tremor/react";
   
   function SimpleView() {
     return (
       <Card>
         <Title>Task Overview</Title>
         <Text>Simple description</Text>
       </Card>
     );
   }
   ```

2. **Thin Wrapper**: Only create wrappers when adding Warp-specific props or composition
   ```tsx
   import { Table } from "@tremor/react";
   
   // Thin wrapper that adds Warp task-specific props
   function TaskTable({ tasks, onSelect }) {
     return (
       <Table>
         {/* Task-specific implementation */}
       </Table>
     );
   }
   ```

3. **Composition**: Compose Tremor components rather than creating new UI primitives
   ```tsx
   import { Card, Title, Badge, Flex } from "@tremor/react";
   
   // Composite component using multiple Tremor components
   function TaskCard({ task }) {
     return (
       <Card>
         <Flex>
           <Title>{task.name}</Title>
           <Badge color={getStatusColor(task.status)}>{task.status}</Badge>
         </Flex>
       </Card>
     );
   }
   ```

## Conclusion

This implementation plan provides a comprehensive approach to adapting the Tremor dashboard template for the Warp MVP UI. By following these guidelines, you'll create a read-only visualization layer that effectively displays the Warp agent system's activities and task hierarchy.

The key success factors are:
1. Directly using Tremor components whenever possible
2. Maintaining template structure and patterns
3. Creating a thin wrapper component library that builds on Tremor rather than replacing it
4. Focusing on composition over creation for any custom UI needs

Remember that the UI serves as an observation tool rather than an interaction platform at this stage, focusing on clear presentation of the underlying agent system's operation.