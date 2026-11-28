import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, isValid, parseISO } from 'date-fns';
import { useClients } from '../hooks/useClients';
import { useCreateProject, useDeleteProject, useProjects, useUpdateProject } from '../hooks/useProjects';
import { type Project, type ProjectStatus } from '../types/api';

const STATUS_OPTIONS: { value: ProjectStatus; label: string; color: 'success' | 'default' | 'warning' }[] = [
  { value: 'active', label: 'Active', color: 'success' },
  { value: 'completed', label: 'Completed', color: 'default' },
  { value: 'on-hold', label: 'On hold', color: 'warning' },
];

interface ProjectFormData {
  name: string;
  description: string;
  clientId: number;
  startDate: Date | null;
  status: ProjectStatus;
}

const emptyForm = (): ProjectFormData => ({
  name: '',
  description: '',
  clientId: 0,
  startDate: new Date(),
  status: 'active',
});

const errorMessage = (err: unknown, fallback: string) => {
  const error = err as { response?: { data?: { error?: string; details?: string[] } } };
  const data = error.response?.data;
  return data?.details?.join(', ') || data?.error || fallback;
};

const ProjectsPage: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [startDateEdited, setStartDateEdited] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>(emptyForm);
  const [error, setError] = useState('');

  const { data: projectsData, isLoading: projectsLoading } = useProjects();
  const { data: clientsData, isLoading: clientsLoading } = useClients();

  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();

  const projects = projectsData?.projects || [];
  const clients = clientsData?.clients || [];
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleOpen = (project?: Project) => {
    setStartDateEdited(false);
    if (project) {
      const localDate = parseISO(project.start_date);
      setEditingProject(project);
      setFormData({
        name: project.name,
        description: project.description || '',
        clientId: project.client_id,
        startDate: isValid(localDate) && format(localDate, 'yyyy-MM-dd') === project.start_date ? localDate : null,
        status: project.status,
      });
    } else {
      setEditingProject(null);
      setFormData(emptyForm());
    }
    setError('');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingProject(null);
    setFormData(emptyForm());
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    if (!formData.clientId) {
      setError('Please select a client');
      return;
    }

    const data = {
      name: formData.name,
      description: formData.description,
      clientId: formData.clientId,
      status: formData.status,
    };

    const options = {
      onSuccess: handleClose,
      onError: (err: unknown) => setError(errorMessage(err, editingProject ? 'Failed to update project' : 'Failed to create project')),
    };

    if (editingProject && !startDateEdited) {
      updateMutation.mutate({ id: editingProject.id, data }, options);
      return;
    }

    if (!formData.startDate || !isValid(formData.startDate)) {
      setError('Please enter a valid start date');
      return;
    }

    const startDate = format(formData.startDate, 'yyyy-MM-dd');
    if (editingProject) {
      const update = startDate === editingProject.start_date ? data : { ...data, startDate };
      updateMutation.mutate({ id: editingProject.id, data: update }, options);
    } else {
      createMutation.mutate({ ...data, startDate, description: data.description || undefined }, options);
    }
  };

  const handleDelete = (project: Project) => {
    if (window.confirm(`Are you sure you want to delete "${project.name}"?`)) {
      deleteMutation.mutate(project.id, {
        onError: (err: unknown) => setError(errorMessage(err, 'Failed to delete project')),
      });
    }
  };

  if (projectsLoading || clientsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Projects</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            disabled={clients.length === 0}
          >
            Add Project
          </Button>
        </Box>

        {error && !open && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {clients.length === 0 ? (
          <Alert severity="info">
            You need to create at least one client before you can add projects.
          </Alert>
        ) : (
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {projects.length > 0 ? (
                    projects.map((project) => {
                      const status = STATUS_OPTIONS.find((option) => option.value === project.status);
                      return (
                        <TableRow key={project.id}>
                          <TableCell>
                            <Typography variant="subtitle1" fontWeight="medium">
                              {project.name}
                            </Typography>
                          </TableCell>
                          <TableCell>{project.client_name}</TableCell>
                          <TableCell>{project.start_date}</TableCell>
                          <TableCell>
                            <Chip label={status?.label ?? project.status} color={status?.color ?? 'default'} size="small" />
                          </TableCell>
                          <TableCell>
                            {project.description ? (
                              <Typography variant="body2" color="text.secondary">
                                {project.description}
                              </Typography>
                            ) : (
                              <Chip label="No description" size="small" variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              aria-label={`Edit ${project.name}`}
                              onClick={() => handleOpen(project)}
                              color="primary"
                              size="small"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              aria-label={`Delete ${project.name}`}
                              onClick={() => handleDelete(project)}
                              color="error"
                              size="small"
                              disabled={deleteMutation.isPending}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary" sx={{ py: 3 }}>
                          No projects found. Create your first project to get started.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>{editingProject ? 'Edit Project' : 'Add New Project'}</DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <TextField
                autoFocus
                margin="dense"
                label="Project Name"
                fullWidth
                required
                inputProps={{ maxLength: 255 }}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isSaving}
              />

              <FormControl fullWidth margin="dense" required>
                <InputLabel id="project-client-label">Client</InputLabel>
                <Select
                  labelId="project-client-label"
                  label="Client"
                  value={formData.clientId || ''}
                  onChange={(e) => setFormData({ ...formData, clientId: Number(e.target.value) })}
                  disabled={isSaving}
                >
                  {clients.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <DatePicker
                label="Start Date"
                value={formData.startDate}
                onChange={(date) => {
                  setFormData({ ...formData, startDate: date });
                  setStartDateEdited(true);
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'dense',
                    required: !editingProject || startDateEdited,
                    helperText: editingProject && !startDateEdited && !formData.startDate
                      ? `Stored date: ${editingProject.start_date}`
                      : undefined,
                    disabled: isSaving,
                  },
                }}
              />

              <FormControl fullWidth margin="dense" required>
                <InputLabel id="project-status-label">Status</InputLabel>
                <Select
                  labelId="project-status-label"
                  label="Status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                  disabled={isSaving}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                margin="dense"
                label="Description"
                fullWidth
                multiline
                rows={3}
                inputProps={{ maxLength: 1000 }}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={isSaving}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={isSaving}>
                {isSaving ? <CircularProgress size={24} /> : editingProject ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default ProjectsPage;
