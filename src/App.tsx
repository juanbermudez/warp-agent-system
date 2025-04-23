import MainLayout from "./renderer/layouts/MainLayout";
import DashboardView from "./renderer/views/dashboard/DashboardView";
import TaskListView from "./renderer/views/dashboard/TaskListView";
import { BrowserRouter, Route, Routes } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <MainLayout>
          <Routes>
            <Route path="/dashboard" element={<DashboardView />} />
            <Route path="/task-list" element={<TaskListView />} />
          </Routes>
        </MainLayout>
      </div>
    </BrowserRouter>
  );
}

export default App;
