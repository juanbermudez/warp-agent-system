import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge,
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
              <TableCell>{task.agent || "-"}</TableCell>
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
    case "completed":
      return "green";
    case "in_progress":
      return "blue";
    case "pending":
      return "yellow";
    case "blocked":
      return "red";
    case "awaiting_hitl":
      return "purple";
    default:
      return "gray";
  }
}