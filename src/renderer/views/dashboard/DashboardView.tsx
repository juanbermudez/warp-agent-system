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