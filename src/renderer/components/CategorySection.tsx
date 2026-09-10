// ============================================================
// src/renderer/components/CategorySection.tsx
// Individual accordion category section.
// Contains Quick Fix buttons, Windows Settings shortcuts, and PDF guide buttons.
// ============================================================

import React from 'react';
import type { Category } from '../../shared/types';
import QuickFixButton from './QuickFixButton';

interface CategorySectionProps {
  category: Category;
  isOpen: boolean;
  onToggle: () => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  isOpen,
  onToggle,
}) => {
  const handleOpenSettings = (uri: string) => {
    window.electronAPI.openSettings(uri).catch(console.error);
  };

  const handleOpenPdf = async (filename: string) => {
    const result = await window.electronAPI.openPdf(filename);
    if (!result.success) {
      // Simple alert — can be replaced with a toast UI in Phase 2
      alert(`Unable to open PDF.\n${result.error ?? 'Please check that the file exists.'}`);
    }
  };

  return (
    <div className={`category-section${isOpen ? ' open' : ''}`}>
      {/* ── Accordion header ── */}
      <button className="category-header" onClick={onToggle}>
        {category.icon && (
          <span className="category-icon">{category.icon}</span>
        )}
        <span className="category-title">{category.title}</span>
        <span className="category-chevron">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* ── Accordion content (rendered only when open) ── */}
      {isOpen && (
        <div className="category-content">
          {/* Quick Fix button list */}
          {category.quickFixes.length > 0 && (
            <div className="section-group">
              <div className="section-label">⚡ Quick Fix</div>
              {category.quickFixes.map(action => (
                <QuickFixButton
                  key={action.id}
                  action={action}
                  categoryId={category.id}
                />
              ))}
            </div>
          )}

          {/* Windows Settings shortcuts */}
          {category.settingsShortcuts.length > 0 && (
            <div className="section-group">
              <div className="section-label">⚙️ Settings Shortcuts</div>
              {category.settingsShortcuts.map(shortcut => (
                <button
                  key={shortcut.id}
                  className="action-btn settings-btn"
                  onClick={() => handleOpenSettings(shortcut.uri)}
                >
                  {shortcut.label}
                </button>
              ))}
            </div>
          )}

          {/* PDF self-diagnosis guide */}
          {category.pdfGuide && (
            <div className="section-group">
              <div className="section-label">📄 Troubleshooting Guide</div>
              <button
                className="action-btn pdf-btn"
                onClick={() => handleOpenPdf(category.pdfGuide!.filename)}
              >
                {category.pdfGuide.label}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategorySection;
