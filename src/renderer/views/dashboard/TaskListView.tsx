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