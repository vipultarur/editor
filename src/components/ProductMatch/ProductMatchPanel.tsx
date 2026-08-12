import React, { useState } from 'react';
import { useSession } from '../../state/SessionContext';
import type { MatchGroup } from '../../types/matchShort';
import MatchGroupEditor from './MatchGroupEditor';
import MatchCanvasPlayer from './MatchCanvasPlayer';
import SoundLibraryModal from './SoundLibraryModal';
import CreateGroupModal from './CreateGroupModal';

export default function ProductMatchPanel() {
  const { state, dispatch } = useSession();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    () => state.matchGroups[0]?.id || null
  );
  const [viewMode, setViewMode] = useState<'list' | 'editor' | 'preview'>('preview');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSoundLibraryOpen, setIsSoundLibraryOpen] = useState(false);

  const selectedGroup =
    state.matchGroups.find((g) => g.id === selectedGroupId) || null;

  // When user clicks a group card on the list screen
  const handleSelectGroup = (group: MatchGroup) => {
    setSelectedGroupId(group.id);
    if (group.isGenerated) {
      setViewMode('preview');
    } else {
      setViewMode('editor');
    }
  };

  const handleCreateGroup = (newGroup: MatchGroup) => {
    dispatch({ type: 'ADD_MATCH_GROUP', payload: newGroup });
    setSelectedGroupId(newGroup.id);
    setViewMode('editor');
  };

  const handleUpdateGroup = (updates: Partial<MatchGroup>) => {
    if (!selectedGroupId) return;
    dispatch({
      type: 'UPDATE_MATCH_GROUP',
      payload: { id: selectedGroupId, updates },
    });
  };

  const handleDeleteGroup = (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation();
    if (state.matchGroups.length <= 1) return;
    dispatch({ type: 'DELETE_MATCH_GROUP', payload: groupId });
    if (selectedGroupId === groupId) {
      setSelectedGroupId(null);
      setViewMode('list');
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-[var(--color-glass-border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <span>🎯 "Match / No Match" Product Reveal Short Studio</span>
            <span className="badge badge-primary text-xs">9:16 Short Video</span>
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Create automated vertical product reveal short videos. Choose video duration (10s, 15s, 20s, custom), configure background, sounds & 3 items!
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsSoundLibraryOpen(true)}
            className="btn-secondary text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 font-semibold whitespace-nowrap"
          >
            <span>🎵 Sound Library</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg whitespace-nowrap"
          >
            <span>➕ Create New Group</span>
          </button>
        </div>
      </div>

      {/* SCREEN 1: GROUPS LIST DASHBOARD SCREEN */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Your Product Reveal Groups ({state.matchGroups.length})
            </h3>
            <span className="text-xs text-[var(--color-text-muted)] font-medium">
              Click any group to view or edit
            </span>
          </div>

          {/* Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {state.matchGroups.map((group) => (
              <div
                key={group.id}
                onClick={() => handleSelectGroup(group)}
                className="glass-panel p-5 rounded-2xl border border-[var(--color-glass-border)] hover:border-indigo-500/50 hover:bg-white/5 transition-all cursor-pointer space-y-4 relative group"
              >
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <span>📦 {group.name}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-secondary text-[0.65rem] font-bold px-2 py-0.5">
                      ⏱️ {group.videoDuration || 10}s
                    </span>
                    {group.isGenerated ? (
                      <span className="badge badge-success text-[0.65rem] font-bold px-2 py-0.5">
                        🎬 Video Ready
                      </span>
                    ) : (
                      <span className="badge badge-warning text-[0.65rem] font-bold px-2 py-0.5">
                        ✏️ Draft
                      </span>
                    )}
                  </div>
                </div>

                {/* Thumbnail Items Preview (3 Items) */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-[var(--color-glass-border)]">
                  {group.items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-1.5 rounded-lg bg-black/30 border border-white/10 text-center space-y-1"
                    >
                      <div className="h-12 flex items-center justify-center overflow-hidden">
                        <img
                          src={item.targetImageUrl}
                          alt="Thumbnail"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="text-[0.6rem] font-semibold text-[var(--color-text-muted)] truncate">
                        {item.name}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Action bar */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-indigo-400 font-bold group-hover:translate-x-1 transition-transform">
                    {group.isGenerated ? '▶️ Open Video Preview →' : '✏️ Open Group Editor →'}
                  </span>

                  {state.matchGroups.length > 1 && (
                    <button
                      onClick={(e) => handleDeleteGroup(e, group.id)}
                      className="text-red-400 hover:text-red-300 p-1 opacity-60 hover:opacity-100 transition-opacity"
                      title="Delete Group"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SCREEN 2: GROUP EDITOR SCREEN */}
      {viewMode === 'editor' && selectedGroup && (
        <div className="space-y-6">
          {/* Back & Mode Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--color-glass-border)]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('list')}
                className="btn-secondary text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-bold"
              >
                <span>← All Groups</span>
              </button>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>✏️ Editing: {selectedGroup.name}</span>
                <span className="badge badge-primary text-xs">
                  ⏱️ {selectedGroup.videoDuration || 10}s Duration
                </span>
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  handleUpdateGroup({ isGenerated: true });
                  setViewMode('preview');
                }}
                className="btn-primary text-xs px-5 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2"
              >
                <span>🎬 Go to Video Preview & Download</span>
              </button>
            </div>
          </div>

          <MatchGroupEditor group={selectedGroup} onUpdateGroup={handleUpdateGroup} />
        </div>
      )}

      {/* SCREEN 3: PREVIEW & DOWNLOAD SCREEN */}
      {viewMode === 'preview' && selectedGroup && (
        <div className="space-y-6">
          {/* Back & Edit Button Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--color-glass-border)]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('list')}
                className="btn-secondary text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-bold"
              >
                <span>← All Groups</span>
              </button>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🎬 Video Preview: {selectedGroup.name}</span>
                <span className="badge badge-primary text-xs">
                  ⏱️ {selectedGroup.videoDuration || 10}s Short
                </span>
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('editor')}
                className="btn-secondary text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-2"
              >
                <span>✏️ Edit Group</span>
              </button>
            </div>
          </div>

          {/* Canvas Player & Exporter */}
          <div className="flex justify-center">
            <MatchCanvasPlayer group={selectedGroup} />
          </div>
        </div>
      )}

      {/* Create Group Wizard Modal */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateGroup={handleCreateGroup}
      />

      {/* Shared Master Sound Library Modal */}
      <SoundLibraryModal
        isOpen={isSoundLibraryOpen}
        onClose={() => setIsSoundLibraryOpen(false)}
        onSelectSound={() => {}}
      />
    </div>
  );
}
