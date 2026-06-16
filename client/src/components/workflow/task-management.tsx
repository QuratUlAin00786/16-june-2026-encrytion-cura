import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Bell, 
  User, 
  Calendar,
  Plus,
  Filter,
  Stethoscope,
  Pill,
  FlaskConical
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Task {
  id: number;
  type: 'appointment_reminder' | 'prescription_renewal' | 'lab_followup' | 'chronic_review' | 'vaccination' | 'custom';
  title: string;
  description: string;
  patientId: number;
  patientName: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  dueDate: string;
  assignedTo: string;
  createdAt: string;
  completedAt?: string;
  automated: boolean;
}

const taskTypeIcons = {
  appointment_reminder: Calendar,
  prescription_renewal: Pill,
  lab_followup: FlaskConical,
  chronic_review: Stethoscope,
  vaccination: CheckCircle2,
  custom: AlertTriangle
};

const priorityColors = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

const statusColors = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800'
};

export function TaskManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTask, setNewTask] = useState({
    type: 'custom' as Task['type'],
    title: '',
    description: '',
    patientId: '',
    priority: 'medium' as Task['priority'],
    dueDate: ''
  });

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: () => apiRequest("GET", "/api/tasks")
  });

  const { data: patients } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: () => apiRequest("GET", "/api/patients")
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      return apiRequest('POST', '/api/tasks', taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task created",
        description: "New task has been added to the workflow",
      });
      setShowCreateTask(false);
      setNewTask({
        type: 'custom',
        title: '',
        description: '',
        patientId: '',
        priority: 'medium',
        dueDate: ''
      });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Task> }) => {
      return apiRequest('PATCH', `/api/tasks/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task updated",
        description: "Task status has been updated",
      });
    }
  });

  const handleCreateTask = () => {
    if (!newTask.title || !newTask.patientId) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const selectedPatient = patients?.find((p: any) => p.id === parseInt(newTask.patientId));
    
    createTaskMutation.mutate({
      ...newTask,
      patientId: parseInt(newTask.patientId),
      patientName: selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : '',
      assignedTo: 'Current User', // Would be actual user in real implementation
      automated: false
    });
  };

  const handleUpdateTaskStatus = (taskId: number, status: Task['status']) => {
    updateTaskMutation.mutate({
      id: taskId,
      updates: { 
        status,
        completedAt: status === 'completed' ? new Date().toISOString() : undefined
      }
    });
  };

  const filteredTasks = tasks?.filter((task: Task) => {
    if (filter === 'all') return true;
    if (filter === 'overdue') return task.status === 'overdue' || new Date(task.dueDate) < new Date();
    if (filter === 'urgent') return task.priority === 'urgent';
    if (filter === 'automated') return task.automated;
    return task.status === filter;
  }) || [];

  const overdueTasks = tasks?.filter((task: Task) => 
    task.status !== 'completed' && new Date(task.dueDate) < new Date()
  ).length || 0;

  const urgentTasks = tasks?.filter((task: Task) => 
    task.priority === 'urgent' && task.status !== 'completed'
  ).length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Task Management</h2>
          <p className="text-gray-600">Automated workflows and manual tasks</p>
        </div>
        
        <div className="flex gap-4">
          {overdueTasks > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{overdueTasks}</div>
              <div className="text-sm text-red-700">Overdue</div>
            </div>
          )}
          
          {urgentTasks > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{urgentTasks}</div>
              <div className="text-sm text-orange-700">Urgent</div>
            </div>
          )}
          
          <Button onClick={() => setShowCreateTask(true)} className="bg-medical-blue hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <Filter className="h-4 w-4 text-gray-500" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="automated">Automated</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="text-sm text-gray-500 ml-4">
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Create Task Form */}
      {showCreateTask && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Task</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Task Type</label>
                <Select 
                  value={newTask.type} 
                  onValueChange={(value: Task['type']) => setNewTask(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appointment_reminder">Appointment Reminder</SelectItem>
                    <SelectItem value="prescription_renewal">Prescription Renewal</SelectItem>
                    <SelectItem value="lab_followup">Lab Follow-up</SelectItem>
                    <SelectItem value="chronic_review">Chronic Disease Review</SelectItem>
                    <SelectItem value="vaccination">Vaccination</SelectItem>
                    <SelectItem value="custom">Custom Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Patient</label>
                <Select 
                  value={newTask.patientId} 
                  onValueChange={(value) => setNewTask(prev => ({ ...prev, patientId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients?.map((patient: any) => (
                      <SelectItem key={patient.id} value={patient.id.toString()}>
                        {patient.firstName} {patient.lastName} - {patient.patientId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Priority</label>
                <Select 
                  value={newTask.priority} 
                  onValueChange={(value: Task['priority']) => setNewTask(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Due Date</label>
                <Input 
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input 
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter task title"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea 
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter task description"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleCreateTask}
                disabled={createTaskMutation.isPending}
                className="bg-medical-blue hover:bg-blue-700"
              >
                Create Task
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowCreateTask(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.map((task: Task) => {
          const TaskIcon = taskTypeIcons[task.type];
          const isOverdue = task.status !== 'completed' && new Date(task.dueDate) < new Date();
          
          return (
            <Card key={task.id} className={`${isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <TaskIcon className={`h-5 w-5 ${task.automated ? 'text-blue-600' : 'text-gray-600'}`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">{task.title}</h3>
                        {task.automated && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                            Automated
                          </Badge>
                        )}
                        <Badge className={`text-xs ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </Badge>
                        <Badge className={`text-xs ${statusColors[task.status]}`}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {task.patientName}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                        </div>
                        <div>
                          Assigned to {task.assignedTo}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {task.status === 'pending' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                      >
                        Start
                      </Button>
                    )}
                    
                    {task.status === 'in_progress' && (
                      <Button 
                        size="sm"
                        onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Complete
                      </Button>
                    )}
                    
                    {task.status === 'completed' && task.completedAt && (
                      <div className="text-xs text-green-600">
                        ✓ Completed {formatDistanceToNow(new Date(task.completedAt), { addSuffix: true })}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-500">
              {filter === 'all' ? 'No tasks have been created yet' : `No ${filter} tasks found`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}