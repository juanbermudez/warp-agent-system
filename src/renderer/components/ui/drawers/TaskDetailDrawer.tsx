import { useState, useEffect } from 'react';

export function TaskDetailDrawer({ taskId, isOpen, onClose }) {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!taskId) return;

    const fetchTask = async () => {
      try {
        setLoading(true);
        // Replace this with IPC call to get task by ID
        // const result = await window.electronAPI.getTaskById(taskId);
        // setTask(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md bg-white shadow-xl">
          <div className="px-4 py-5">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Task Detail</h3>
            <button type="button" className="absolute top-4 right-4 text-gray-400 hover:text-gray-500" onClick={onClose}>
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-4 py-5">
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">Error: {error.message}</p>}
            {task && (
              <pre>
                {JSON.stringify(task, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}