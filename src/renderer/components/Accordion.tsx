// ============================================================
// src/renderer/components/Accordion.tsx
// Renders the category list in accordion (expand/collapse) format.
// Multiple categories can be open at the same time.
// ============================================================

import React, { useState } from 'react';
import type { Category } from '../../shared/types';
import CategorySection from './CategorySection';

interface AccordionProps {
  categories: Category[];
}

const Accordion: React.FC<AccordionProps> = ({ categories }) => {
  // Set of open category IDs — first category is open by default
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(categories[0] ? [categories[0].id] : [])
  );

  const toggle = (id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="accordion">
      {categories.map(category => (
        <CategorySection
          key={category.id}
          category={category}
          isOpen={openIds.has(category.id)}
          onToggle={() => toggle(category.id)}
        />
      ))}
    </div>
  );
};

export default Accordion;
