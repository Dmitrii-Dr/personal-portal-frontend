import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress,
    Alert,
    Chip,
    Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { fetchWithAuth } from '../utils/api';
import dayjs from 'dayjs';

const UserAgreementsSection = () => {
    const { t } = useTranslation();
    const [agreements, setAgreements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingAgreement, setEditingAgreement] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        content: '',
    });
    const [saveLoading, setSaveLoading] = useState(false);
    const [slugError, setSlugError] = useState('');

    const validateSlug = (slug) => {
        const regex = /^[a-zA-Z0-9-_]+$/;
        return regex.test(slug);
    };

    useEffect(() => {
        fetchAgreements();
    }, []);

    const fetchAgreements = async () => {
        setLoading(true);
        try {
            const response = await fetchWithAuth('/api/v1/admin/agreements');
            if (response.ok) {
                const data = await response.json();
                setAgreements(Array.isArray(data) ? data : []);
            } else {
                throw new Error('Failed to fetch agreements');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (agreement = null) => {
        if (agreement) {
            setEditingAgreement(agreement);
            setFormData({
                name: agreement.name || '',
                slug: agreement.slug || '',
                content: agreement.content || '',
            });
        } else {
            setEditingAgreement(null);
            setFormData({
                name: '',
                slug: '',
                content: '',
            });
        }

        setSlugError('');
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingAgreement(null);
        setFormData({ name: '', slug: '', content: '' });
        setSlugError('');
    };

    const handleSave = async () => {
        if (!formData.name.trim() || !formData.slug.trim() || !formData.content.trim()) {
            return;
        }

        if (!validateSlug(formData.slug)) {
            setSlugError(t('admin.sessionConfiguration.userAgreements.slugValidationError'));
            return;
        }

        setSaveLoading(true);
        try {
            const url = editingAgreement
                ? `/api/v1/admin/agreements/${editingAgreement.id}`
                : '/api/v1/admin/agreements';
            const method = editingAgreement ? 'PUT' : 'POST';

            const response = await fetchWithAuth(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error('Failed to save agreement');
            }

            await fetchAgreements();
            handleCloseDialog();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaveLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this agreement?')) {
            return;
        }

        try {
            const response = await fetchWithAuth(`/api/v1/admin/agreements/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete agreement');
            }

            await fetchAgreements();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">{t('admin.sessionConfiguration.userAgreements.title')}</Typography>
                    <Tooltip title={t('admin.sessionConfiguration.userAgreements.addAgreement')}>
                        <IconButton
                            color="primary"
                            onClick={() => handleOpenDialog()}
                        >
                            <AddIcon />
                        </IconButton>
                    </Tooltip>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                        <CircularProgress />
                    </Box>
                ) : agreements.length > 0 ? (
                    <List>
                        {agreements.map((agreement) => (
                            <ListItem key={agreement.id} divider>
                                <ListItemText
                                    primary={agreement.name}
                                    secondary={
                                        <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            <Typography variant="body2" color="text.secondary" noWrap>
                                                {agreement.content.substring(0, 100)}...
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {t('admin.sessionConfiguration.userAgreements.lastUpdated', { date: dayjs(agreement.updatedAt).format('MMM D, YYYY HH:mm') })}
                                                • {t('admin.sessionConfiguration.userAgreements.version', { version: agreement.version })}
                                            </Typography>
                                        </Box>
                                    }
                                />
                                <ListItemSecondaryAction>
                                    <IconButton edge="end" onClick={() => handleOpenDialog(agreement)} sx={{ mr: 1 }}>
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton edge="end" onClick={() => handleDelete(agreement.id)} color="error">
                                        <DeleteIcon />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        {t('admin.sessionConfiguration.userAgreements.noAgreementsFound')}
                    </Typography>
                )}

                <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                    <DialogTitle>
                        {editingAgreement ? t('admin.sessionConfiguration.userAgreements.editAgreement') : t('admin.sessionConfiguration.userAgreements.newAgreement')}
                    </DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Name"
                            fullWidth
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <TextField
                            margin="dense"
                            label={t('admin.sessionConfiguration.userAgreements.slug')}
                            fullWidth
                            value={formData.slug}
                            onChange={(e) => {
                                setFormData({ ...formData, slug: e.target.value });
                                if (slugError) setSlugError('');
                            }}
                            error={!!slugError}
                            helperText={slugError}
                            required
                        />
                        <TextField
                            margin="dense"
                            label={t('admin.sessionConfiguration.userAgreements.content')}
                            fullWidth
                            multiline
                            rows={10}
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            required
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog} disabled={saveLoading}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={handleSave}
                            variant="contained"
                            disabled={saveLoading || !formData.name.trim() || !formData.slug.trim() || !formData.content.trim()}
                        >
                            {saveLoading ? <CircularProgress size={24} /> : t('common.save')}
                        </Button>
                    </DialogActions>
                </Dialog>
            </CardContent>
        </Card>
    );
};

export default UserAgreementsSection;
