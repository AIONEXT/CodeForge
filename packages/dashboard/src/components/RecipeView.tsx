import React, { useState } from 'react';
import type { Recipe } from '../types';

interface RecipeViewProps {
  recipes: Recipe[];
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return 'highly reliable';
  if (confidence >= 0.7) return 'reliable';
  if (confidence >= 0.5) return 'moderate';
  return 'experimental';
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.9) return '#3fb950';
  if (confidence >= 0.7) return '#58a6ff';
  if (confidence >= 0.5) return '#d29922';
  return '#f85149';
}

export const RecipeView: React.FC<RecipeViewProps> = ({ recipes }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);

  const handleCopy = async (command: string, recipeId: string, stepIdx: number) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedIdx(`${recipeId}-${stepIdx}`);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      // Fallback: do nothing
    }
  };

  const sortedRecipes = [...recipes].sort((a, b) => b.confidence - a.confidence);

  if (sortedRecipes.length === 0) {
    return (
      <div className="recipes recipes--empty">
        <div className="recipes__icon">
          <svg width="48" height="48" viewBox="0 0 16 16" fill="#30363d">
            <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.28 5.22a.75.75 0 010 1.06l-2.72 2.72 2.72 2.72a.75.75 0 11-1.06 1.06L7.5 9.06l-2.72 2.72a.75.75 0 11-1.06-1.06L6.44 8 3.66 5.22a.75.75 0 011.06-1.06L7.5 6.94l2.72-2.72a.75.75 0 011.06 0z"/>
          </svg>
        </div>
        <h3>No recipes yet</h3>
        <p>Recipes are auto-generated from repeated command patterns across your sessions.</p>
      </div>
    );
  }

  return (
    <div className="recipes">
      <div className="recipes__header">
        <h2 className="recipes__title">Project Recipes</h2>
        <span className="recipes__count">{sortedRecipes.length} recipe{sortedRecipes.length !== 1 ? 's' : ''}</span>
      </div>

      {sortedRecipes.map(recipe => {
        const isExpanded = expandedId === recipe.id;

        return (
          <div key={recipe.id} className={`recipe ${isExpanded ? 'recipe--expanded' : ''}`}>
            <button
              className="recipe__header"
              onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
              aria-expanded={isExpanded}
            >
              <div className="recipe__title-row">
                <h3 className="recipe__name">{recipe.name}</h3>
                <span className="recipe__category">{recipe.category}</span>
              </div>
              <p className="recipe__description">{recipe.description}</p>
              <div className="recipe__meta">
                <span className="recipe__confidence" style={{ color: confidenceColor(recipe.confidence) }}>
                  {confidenceLabel(recipe.confidence)} ({Math.round(recipe.confidence * 100)}%)
                </span>
                <span className="recipe__steps-count">{recipe.steps.length} steps</span>
                {recipe.derivedFrom.length > 0 && (
                  <span className="recipe__derived">from {recipe.derivedFrom.length} session{recipe.derivedFrom.length !== 1 ? 's' : ''}</span>
                )}
                {recipe.lastUsed && (
                  <span className="recipe__last-used">last used {new Date(recipe.lastUsed).toLocaleDateString()}</span>
                )}
              </div>
              <svg className={`recipe__expand-icon ${isExpanded ? 'recipe__expand-icon--open' : ''}`} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
              </svg>
            </button>

            {isExpanded && (
              <div className="recipe__steps">
                <ol className="recipe__step-list">
                  {recipe.steps.map(step => (
                    <li key={step.order} className="recipe__step">
                      <div className="recipe__step-number">{step.order}</div>
                      <div className="recipe__step-content">
                        <p className="recipe__step-description">{step.description}</p>
                        <div className="recipe__step-command-wrapper">
                          <code className="recipe__step-command">{step.command}</code>
                          <button
                            className={`recipe__copy-btn ${copiedIdx === `${recipe.id}-${step.order - 1}` ? 'recipe__copy-btn--copied' : ''}`}
                            onClick={() => handleCopy(step.command, recipe.id, step.order - 1)}
                            title="Copy command"
                          >
                            {copiedIdx === `${recipe.id}-${step.order - 1}` ? (
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"/></svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
