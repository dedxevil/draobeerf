import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { CommandCenter } from '../../types';
import Modal from '../ui/Modal';
import CommandCenterForm from './CommandCenterForm';
import AddChartsToCCModal from './AddChartsToCCModal';
import { PlusIcon, PencilIcon, ViewIcon, TrashIcon, PresentationIcon, ChevronDownIcon } from '../layout/Icons';
import Tooltip from '../ui/Tooltip';

interface CommandCenterHeaderActionsProps {
    isMobile: boolean;
}

export const CommandCenterHeaderActions: React.FC<CommandCenterHeaderActionsProps> = ({ isMobile }) => {
    const { 
        commandCenters, 
        settings, 
        setActiveCommandCenter, 
        addCommandCenter, 
        updateCommandCenter, 
        deleteCommandCenter,
        isCommandCenterEditMode,
        setCommandCenterEditMode,
    } = useAppContext();
    
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isAddChartModalOpen, setIsAddChartModalOpen] = useState(false);
    const [editingCC, setEditingCC] = useState<CommandCenter | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const activeCC = commandCenters.find(c => c.id === settings.activeCommandCenterId) || null;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAdd = () => {
        setEditingCC(null);
        setIsFormModalOpen(true);
    };
    
    const handleEdit = () => {
        if (activeCC) {
            setEditingCC(activeCC);
            setIsFormModalOpen(true);
        }
    };
    
    const handleDelete = () => setIsDeleteModalOpen(true);
    const confirmDeleteAction = () => {
        if (activeCC) {
            deleteCommandCenter(activeCC.id);
        }
        setIsDeleteModalOpen(false);
    };
    
    const handleSaveForm = (name: string, chartIds: string[]) => {
        if (editingCC) {
            updateCommandCenter({ ...editingCC, name, chartIds });
        } else {
            addCommandCenter(name, chartIds);
        }
        setIsFormModalOpen(false);
    };

    return (
        <>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {activeCC ? (
                        <>
                            <div ref={dropdownRef} className="relative">
                                <Tooltip text="Switch Command Center" position="bottom">
                                    <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 text-lg font-semibold text-text-primary hover:bg-secondary/20 p-2 rounded-lg">
                                        {activeCC.name}
                                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                </Tooltip>
                                {isDropdownOpen && (
                                    <div className="absolute top-full mt-2 w-64 bg-secondary rounded-md shadow-lg z-20 border border-secondary/50">
                                        {commandCenters.map(cc => (
                                            <button key={cc.id} onClick={() => { setActiveCommandCenter(cc.id); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-secondary/70">
                                                {cc.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <Tooltip text="Edit Name & Charts"><button onClick={handleEdit} className="p-2 text-text-secondary hover:text-text-primary hover:bg-secondary/20 rounded-lg"><PencilIcon className="w-4 h-4" /></button></Tooltip>
                            <Tooltip text="Delete"><button onClick={handleDelete} className="p-2 text-red-500 hover:text-red-400 hover:bg-secondary/20 rounded-lg"><TrashIcon className="w-4 h-4" /></button></Tooltip>
                        </>
                    ) : (
                        <h1 className="text-xl font-semibold text-text-primary">Command Centers</h1>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Tooltip text="Create New Command Center">
                        <button onClick={handleAdd} className="bg-primary hover:bg-primary/80 text-white font-bold p-2 rounded-lg transition-colors flex items-center gap-2">
                            <PlusIcon className="w-5 h-5" />
                            {!isMobile && <span className="hidden md:inline text-sm">Create New</span>}
                        </button>
                    </Tooltip>
                    {activeCC && (
                        <>
                            <div className="flex items-center gap-1 p-1 bg-secondary/30 rounded-lg text-xs">
                                <button onClick={() => setCommandCenterEditMode(false)} className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${!isCommandCenterEditMode ? 'bg-primary text-white' : 'hover:bg-secondary'}`}><ViewIcon className="w-4 h-4"/>View</button>
                                <button onClick={() => setCommandCenterEditMode(true)} className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${isCommandCenterEditMode ? 'bg-primary text-white' : 'hover:bg-secondary'}`}><PencilIcon className="w-4 h-4"/>Edit</button>
                            </div>
                            {isCommandCenterEditMode && (
                                <Tooltip text="Add Charts to Layout">
                                    <button onClick={() => setIsAddChartModalOpen(true)} className="bg-secondary hover:bg-secondary/70 text-white font-bold p-2 rounded-lg transition-colors flex items-center gap-2">
                                        <PlusIcon className="w-5 h-5" />
                                    </button>
                                </Tooltip>
                            )}
                            <Tooltip text="Enter Presentation Mode">
                                <Link to={`/command-centers/${activeCC.id}/present`} className="bg-accent hover:bg-accent/80 text-white font-bold p-2 rounded-lg transition-colors flex items-center gap-2">
                                   <PresentationIcon className="w-5 h-5" />
                                </Link>
                            </Tooltip>
                        </>
                    )}
                </div>
            </div>

            {isFormModalOpen && (
                <Modal title={editingCC ? "Edit Command Center" : "Create Command Center"} onClose={() => setIsFormModalOpen(false)}>
                    <CommandCenterForm commandCenter={editingCC} onSuccess={() => setIsFormModalOpen(false)} />
                </Modal>
            )}

            {isAddChartModalOpen && activeCC && (
                <AddChartsToCCModal 
                    commandCenter={activeCC} 
                    onClose={() => setIsAddChartModalOpen(false)} 
                />
            )}

            {isDeleteModalOpen && activeCC && (
                <Modal title="Confirm Deletion" onClose={() => setIsDeleteModalOpen(false)}>
                    <div className="space-y-4">
                        <p className="text-text-secondary">Are you sure you want to delete the command center "{activeCC.name}"?</p>
                        <div className="flex justify-end gap-4 pt-4">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="bg-secondary hover:bg-secondary/70 text-white font-bold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                            <button onClick={confirmDeleteAction} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Delete</button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};