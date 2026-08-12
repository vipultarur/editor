import { useEditor, EditorProvider } from '../../state/EditorContext';
import TopToolbar from './TopToolbar';
import SidebarNav from './LeftSidebar/SidebarNav';
import MediaTab from './LeftSidebar/MediaTab';
import AudioTab from './LeftSidebar/AudioTab';
import TextTab from './LeftSidebar/TextTab';
import CaptionsTab from './LeftSidebar/CaptionsTab';
import ElementsTab from './LeftSidebar/ElementsTab';
import FiltersTab from './LeftSidebar/FiltersTab';
import EffectsTab from './LeftSidebar/EffectsTab';
import TransitionsTab from './LeftSidebar/TransitionsTab';
import TemplatesTab from './LeftSidebar/TemplatesTab';
import BackgroundTab from './LeftSidebar/BackgroundTab';
import CanvasPreview from './Preview/CanvasPreview';
import PropertiesPanel from './Properties/PropertiesPanel';
import MultiTrackTimeline from './Timeline/MultiTrackTimeline';
import ExportModal from './Modals/ExportModal';
import ShortcutsModal from './Modals/ShortcutsModal';
import ProjectSettingsModal from './Modals/ProjectSettingsModal';
import DownloaderPanel from '../DownloaderPanel';

function EditorWorkspaceContent() {
  const { activeSidebarTab } = useEditor();

  return (
    <div className="flex flex-col w-full h-screen bg-[#070a12] text-[var(--color-text-primary)] overflow-hidden select-none">
      {/* Top Action Toolbar */}
      <TopToolbar />

      {/* Main Middle Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar Navigation Icons */}
        <SidebarNav />

        {/* Active Sidebar Tab Panel Drawer */}
        <div className="w-72 bg-[var(--color-bg-surface)] border-r border-[var(--color-glass-border)] flex flex-col h-full flex-shrink-0 z-10">
          {activeSidebarTab === 'media' && <MediaTab />}
          {activeSidebarTab === 'audio' && <AudioTab />}
          {activeSidebarTab === 'text' && <TextTab />}
          {activeSidebarTab === 'captions' && <CaptionsTab />}
          {activeSidebarTab === 'elements' && <ElementsTab />}
          {activeSidebarTab === 'filters' && <FiltersTab />}
          {activeSidebarTab === 'effects' && <EffectsTab />}
          {activeSidebarTab === 'transitions' && <TransitionsTab />}
          {activeSidebarTab === 'templates' && <TemplatesTab />}
          {activeSidebarTab === 'background' && <BackgroundTab />}
        </div>

        {/* Center Multi-Layer Interactive Canvas Preview Stage */}
        <CanvasPreview />

        {/* Right Contextual Properties Inspector Panel */}
        <PropertiesPanel />
      </div>

      {/* Bottom Multi-Track Draggable Timeline */}
      <MultiTrackTimeline />

      {/* Global Modals */}
      <ExportModal />
      <ShortcutsModal />
      <ProjectSettingsModal />
    </div>
  );
}

export default function VideoEditorWorkspace() {
  return (
    <EditorProvider>
      <EditorWorkspaceContent />
    </EditorProvider>
  );
}
