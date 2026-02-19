
import React, { Component } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, List, ListItem, ListItemText, ListItemAvatar, Avatar } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import AppContext from './AppContext';
import ERPUtils from './ERPUtils';
import ApiGateway from './ApiGateway'; // If needed for generating preview URLs directly here
import './FileUpload.css';

export default class UploadViewPopup extends Component {
    constructor(props) {
        super(props);
        this.state = {
            previewUrl: null,
            previewType: null,
            previewOpen: false
        }
    }

    handleClose = () => {
        this.props.closePopup();
    }

    handleFileClick = (file) => {
        if (file.url) {
            window.open(file.url, '_blank');
        } else if (file.file) {
            // Handle local file preview if url not yet generated (basic handling)
            const url = URL.createObjectURL(file.file);
            window.open(url, '_blank');
        }
    }

    handleDelete = (file) => {
        // Ask for confirmation potentially via AppContext.alert before deletion if desired
        // For now directly call prop
        this.props.onDelete(file);
    }

    handleFileChange = (event) => {
        const files = Array.from(event.target.files);
        const processedFiles = files.map(file => ({
            name: file.name,
            file: file,
            size: file.size,
            type: file.type
        }));

        // Pass to parent to handle (upload logic is in parent)
        this.props.generateURLAndSubmit(processedFiles);
        event.target.value = null; // Reset input
    }

    triggerFileInput = () => {
        document.getElementById('hidden-file-input').click();
    }

    render() {
        const { data, isViewOnly, isSubmitButton, openUploadWindow } = this.props;

        return (
            <Dialog open={true} onClose={this.handleClose} fullWidth maxWidth="md">
                <DialogTitle>
                    {isViewOnly ? "View Files" : "Upload & View Files"}
                    <IconButton
                        aria-label="close"
                        onClick={this.handleClose}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: (theme) => theme.palette.grey[500],
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {/* File List */}
                    <List>
                        {data && data.map((file, index) => (
                            <ListItem key={index}
                                secondaryAction={
                                    !isViewOnly && (
                                        <IconButton edge="end" aria-label="delete" onClick={() => this.handleDelete(file)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    )
                                }
                            >
                                <ListItemAvatar>
                                    <Avatar>
                                        <FileOpenIcon />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={file.originalFileName || file.fileName || file.name}
                                    secondary={file.size ? `${(file.size / 1024).toFixed(2)} KB` : ''}
                                    onClick={() => this.handleFileClick(file)}
                                    style={{ cursor: 'pointer', textDecoration: 'underline', color: 'blue' }}
                                />
                            </ListItem>
                        ))}
                        {(!data || data.length === 0) && (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'gray' }}>No files uploaded.</div>
                        )}
                    </List>

                    {/* Hidden File Input */}
                    <input
                        type="file"
                        id="hidden-file-input"
                        style={{ display: 'none' }}
                        multiple={this.props.isMulti}
                        onChange={this.handleFileChange}
                        accept={this.props.acceptedFormats}
                    />

                </DialogContent>
                <DialogActions>
                    {!isViewOnly && (
                        <Button variant="contained" color="primary" onClick={this.triggerFileInput}>
                            Browse & Upload
                        </Button>
                    )}
                    <Button onClick={this.handleClose} color="primary">
                        Close
                    </Button>
                    {/* Submit button logic if handled here, but parent handles submit typically */}
                    {isSubmitButton && (
                        <Button onClick={() => this.props.submitData(null, false)} color="success" variant="contained">
                            Save Changes
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        );
    }
}
