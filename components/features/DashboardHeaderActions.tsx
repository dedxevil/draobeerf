import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Dashboard } from '../../types';
import Modal from '../ui/Modal';
import DashboardForm from './DashboardForm';
import { PencilIcon, TrashIcon, PlusIcon, ChevronDownIcon } from '../layout/Icons';
import Tooltip from '../ui/Tooltip';

interface DashboardHeaderActionsProps {
    isMobile: boolean;
}

export const DashboardHeaderActions: React.FC<DashboardHeaderActionsProps> = ({ isMobile }) => {
    const { dashboards, settings, setActiveDashboard, addDashboard, updateDashboard, deleteDashboard } = useAppContext();
    const { addToast } = useToast();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null);

    const dropdownRef = useRef<HTMLDivElement>(null);

    const activeDashboard = dashboards.find(d => d.id === settings.activeDashboardId) || dashboards[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectDashboard = (id: string) => {
        setActiveDashboard(id);
        setIsDropdownOpen(false);
    };

    const handleAddDashboard = () => {
        setEditingDashboard(null);
        setIsFormModalOpen(true);
    };

    const handleRenameDashboard = () => {
        if (activeDashboard) {
            setEditingDashboard(activeDashboard);
            setIsFormModalOpen(true);
        }
    };
    
    const handleDeleteDashboard = () => {
        if (dashboards.length > 1) {
            setIsDeleteModalOpen(true);
        } else {
            addToast("You cannot delete the last dashboard.", { type: 'warning' });
        }
    };

    const handleSaveDashboard = (name: string) => {
        if (editingDashboard) {
            updateDashboard({ ...editingDashboard, name });
        } else {
            addDashboard(name);
        }
        setIsFormModalOpen(false);
    };
    
    const confirmDelete = () => {
        if (activeDashboard) {
            deleteDashboard(activeDashboard.id);
        }
        setIsDeleteModalOpen(false);
    }
    
    const handleAddChartClick = () => {
        document.dispatchEvent(new CustomEvent('openAddChartModal'));
    };

    if (!activeDashboard) {
        return (
             <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-text-primary">Loading...</h1>
            </div>
        );
    }
    
    return (
        <>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {/* Dashboard Switcher Dropdown */}
                    <div ref={dropdownRef} className="relative">
                        <Tooltip text="Switch or manage dashboards" position="bottom">
                            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 text-lg md:text-xl font-semibold text-text-primary hover:bg-secondary/20 p-2 rounded-lg">
                                {activeDashboard.name}
                                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                        </Tooltip>
                        {isDropdownOpen && (
                            <div className="absolute top-full mt-2 w-64 bg-secondary rounded-md shadow-lg z-20 border border-secondary/50">
                                <div className="p-2 text-xs text-text-secondary uppercase">Switch Dashboard</div>
                                <ul className="max-h-60 overflow-y-auto snapdash-scrollbar">
                                    {dashboards.map(d => (
                                        <li key={d.id}>
                                            <button onClick={() => handleSelectDashboard(d.id)} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-secondary/70">
                                                {d.name}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    {/* Dashboard Actions */}
                    <Tooltip text="Rename Dashboard">
                        <button onClick={handleRenameDashboard} className="p-2 text-text-secondary hover:text-text-primary hover:bg-secondary/20 rounded-lg">
                            <PencilIcon className="w-4 h-4" />
                        </button>
                    </Tooltip>
                    <Tooltip text="Delete Dashboard">
                        <button onClick={handleDeleteDashboard} disabled={dashboards.length <= 1} className="p-2 text-red-500 hover:text-red-400 hover:bg-secondary/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-red-500">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                    <Tooltip text="Add a new chart to this dashboard">
                        <button onClick={handleAddChartClick} className="bg-primary hover:bg-primary/80 text-white font-bold p-2 md:py-2 md:px-4 rounded-lg transition-colors flex items-center gap-2">
                            <PlusIcon className="w-5 h-5" />
                            {!isMobile && <span className="hidden md:inline">Add Chart</span>}
                        </button>
                    </Tooltip>
                    <Tooltip text="Create a new dashboard">
                        <button onClick={handleAddDashboard} className="bg-secondary hover:bg-secondary/70 text-white font-bold p-2 md:py-2 md:px-4 rounded-lg transition-colors flex items-center gap-2">
                            <PlusIcon className="w-5 h-5" />
                            {!isMobile && <span className="hidden md:inline">Add Dashboard</span>}
                        </button>
                    </Tooltip>
                </div>
            </div>

            {isFormModalOpen && (
                <Modal title={editingDashboard ? 'Rename Dashboard' : 'Create New Dashboard'} onClose={() => setIsFormModalOpen(false)}>
                    <DashboardForm 
                        dashboard={editingDashboard}
                        onSave={handleSaveDashboard}
                        onCancel={() => setIsFormModalOpen(false)}
                    />
                </Modal>
            )}
            
            {isDeleteModalOpen && activeDashboard && (
                 <Modal title="Confirm Dashboard Deletion" onClose={() => setIsDeleteModalOpen(false)}>
                    <div className="space-y-4">
                        <p className="text-text-secondary">Are you sure you want to delete the dashboard "{activeDashboard.name}"? All charts on this dashboard will also be deleted.</p>
                        <div className="flex justify-end gap-4 pt-4">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="bg-secondary hover:bg-secondary/70 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                Delete
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};