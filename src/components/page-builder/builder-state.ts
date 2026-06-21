"use client";

import { useState, useCallback, useReducer, useRef, useEffect } from "react";
import { PageContentV1, PageBlock } from "@/lib/page-builder/schema";
import { BlockType, Block } from "@/lib/page-builder/types";
import { createBlockFromRegistry } from "@/lib/page-builder/registry";
import { createBlockId } from "@/lib/page-builder/ids";
import { contentHash } from "@/lib/page-builder/hash";
import { getTemplateById } from "@/lib/page-builder/block-templates";

interface BuilderState {
  content: PageContentV1;
  selectedBlockId: string | null;
  historyPast: PageContentV1[];
  historyFuture: PageContentV1[];
}

const MAX_HISTORY = 50;

type BuilderAction =
  | { type: "SELECT_BLOCK"; blockId: string | null }
  | { type: "ADD_BLOCK"; blockType: BlockType }
  | { type: "ADD_TEMPLATE"; templateId: string }
  | { type: "UPDATE_BLOCK"; blockId: string; data: Partial<PageBlock["data"]> }
  | { type: "REMOVE_BLOCK"; blockId: string }
  | { type: "MOVE_BLOCK"; fromIndex: number; toIndex: number }
  | { type: "DUPLICATE_BLOCK"; blockId: string }
  | { type: "MOVE_BLOCK_BY_ID"; blockId: string; direction: "up" | "down" }
  | { type: "ADD_SECTION"; templateBlocks?: PageBlock[] }
  | { type: "ADD_BLOCK_TO_SECTION"; sectionId: string; blockType: BlockType }
  | { type: "UPDATE_SECTION"; sectionId: string; data: Partial<PageBlock["data"]> }
  | { type: "REMOVE_CHILD_FROM_SECTION"; sectionId: string; childId: string }
  | { type: "DUPLICATE_SECTION"; sectionId: string }
  | { type: "ADD_REUSABLE"; reusableId: string }
  | { type: "PASTE_BLOCK"; block: PageBlock }
  | { type: "SET_CONTENT"; content: PageContentV1 }
  | { type: "COMMIT"; content: PageContentV1; selectedBlockId?: string | null }
  | { type: "UNDO" }
  | { type: "REDO" };

function builderReducer(
  state: BuilderState,
  action: BuilderAction
): BuilderState {
  switch (action.type) {
    case "SELECT_BLOCK":
      return {
        ...state,
        selectedBlockId: action.blockId,
      };

    case "ADD_BLOCK": {
      const newBlock = createBlockFromRegistry(action.blockType);
      const newContent = {
        ...state.content,
        blocks: [...state.content.blocks, newBlock],
      };
      // Sofort in History committen für Undo/Redo
      const newPast = [...state.historyPast, state.content];
      const limitedPast = newPast.slice(-MAX_HISTORY);
      return {
        ...state,
        content: newContent,
        selectedBlockId: newBlock.id,
        historyPast: limitedPast,
        historyFuture: [], // Clear future on new action
      };
    }

    case "UPDATE_BLOCK": {
      // Für UPDATE_BLOCK: Nur committen wenn sich Content wirklich geändert hat
      // (wird durch Auto-Commit-Mechanismus gehandhabt, um Debouncing zu ermöglichen)
      const updatedBlocks = state.content.blocks.map((block) =>
        block.id === action.blockId
          ? {
              ...block,
              data: {
                ...block.data,
                ...action.data,
              },
            }
          : block
      );
      return {
        ...state,
        content: {
          ...state.content,
          blocks: updatedBlocks,
        },
      };
    }

    case "REMOVE_BLOCK": {
      const filteredBlocks = state.content.blocks.filter(
        (block) => block.id !== action.blockId
      );
      const newSelectedId =
        state.selectedBlockId === action.blockId
          ? filteredBlocks.length > 0
            ? filteredBlocks[0].id
            : null
          : state.selectedBlockId;
      const newContent = {
        ...state.content,
        blocks: filteredBlocks,
      };
      // Sofort in History committen
      const newPast = [...state.historyPast, state.content];
      const limitedPast = newPast.slice(-MAX_HISTORY);
      return {
        ...state,
        content: newContent,
        selectedBlockId: newSelectedId,
        historyPast: limitedPast,
        historyFuture: [],
      };
    }

    case "MOVE_BLOCK": {
      const { fromIndex, toIndex } = action;
      if (
        fromIndex < 0 ||
        fromIndex >= state.content.blocks.length ||
        toIndex < 0 ||
        toIndex >= state.content.blocks.length
      ) {
        return state;
      }

      const newBlocks = [...state.content.blocks];
      const [movedBlock] = newBlocks.splice(fromIndex, 1);
      newBlocks.splice(toIndex, 0, movedBlock);

      const newContent = {
        ...state.content,
        blocks: newBlocks,
      };
      // Sofort in History committen
      const newPast = [...state.historyPast, state.content];
      const limitedPast = newPast.slice(-MAX_HISTORY);
      return {
        ...state,
        content: newContent,
        historyPast: limitedPast,
        historyFuture: [],
      };
    }

    case "DUPLICATE_BLOCK": {
      const blockIndex = state.content.blocks.findIndex(
        (b) => b.id === action.blockId
      );
      if (blockIndex === -1) return state;

      const originalBlock = state.content.blocks[blockIndex];
      const duplicatedBlock: PageBlock = {
        ...originalBlock,
        id: createBlockId(),
        data: JSON.parse(JSON.stringify(originalBlock.data)), // Deep copy
      };

      const newBlocks = [...state.content.blocks];
      newBlocks.splice(blockIndex + 1, 0, duplicatedBlock);

      const newContent = {
        ...state.content,
        blocks: newBlocks,
      };
      // Sofort in History committen
      const newPast = [...state.historyPast, state.content];
      const limitedPast = newPast.slice(-MAX_HISTORY);
      return {
        ...state,
        content: newContent,
        selectedBlockId: duplicatedBlock.id,
        historyPast: limitedPast,
        historyFuture: [],
      };
    }

    case "PASTE_BLOCK": {
      const pastedBlock: PageBlock = {
        ...action.block,
        id: createBlockId(), // Neue ID generieren
        data: JSON.parse(JSON.stringify(action.block.data)), // Deep copy
      };

      const newBlocks = [...state.content.blocks, pastedBlock];
      const newContent = {
        ...state.content,
        blocks: newBlocks,
      };
      // Sofort in History committen
      const newPast = [...state.historyPast, state.content];
      const limitedPast = newPast.slice(-MAX_HISTORY);
      return {
        ...state,
        content: newContent,
        selectedBlockId: pastedBlock.id,
        historyPast: limitedPast,
        historyFuture: [],
      };
    }

    case "MOVE_BLOCK_BY_ID": {
      const blockIndex = state.content.blocks.findIndex(
        (b) => b.id === action.blockId
      );
      if (blockIndex === -1) return state;

      const direction = action.direction;
      const targetIndex = direction === "up" ? blockIndex - 1 : blockIndex + 1;

      if (targetIndex < 0 || targetIndex >= state.content.blocks.length) {
        return state;
      }

      const newBlocks = [...state.content.blocks];
      [newBlocks[blockIndex], newBlocks[targetIndex]] = [
        newBlocks[targetIndex],
        newBlocks[blockIndex],
      ];

      const newContent = {
        ...state.content,
        blocks: newBlocks,
      };
      // Sofort in History committen
      const newPast = [...state.historyPast, state.content];
      const limitedPast = newPast.slice(-MAX_HISTORY);
      return {
        ...state,
        content: newContent,
        historyPast: limitedPast,
        historyFuture: [],
      };
    }

    case "ADD_TEMPLATE": {
      const template = getTemplateById(action.templateId);
      if (!template) return state;

      const templateBlocks = template.blocksFactory();
      const newContent = {
        ...state.content,
        blocks: [...state.content.blocks, ...templateBlocks],
      };

      // Sofort in History committen
      const newPast = [...state.historyPast, state.content];
      const limitedPast = newPast.slice(-MAX_HISTORY);
      return {
        ...state,
        content: newContent,
        selectedBlockId: templateBlocks[0]?.id || state.selectedBlockId,
        historyPast: limitedPast,
        historyFuture: [],
      };
    }

    case "ADD_SECTION": {
      const sectionBlock: PageBlock = {
        id: createBlockId(),
        type: "section",
        data: {
          title: "",
          layout: "default",
          background: "none",
          padding: "md",
          children: action.templateBlocks || [],
        },
      };

      const newContent = {
        ...state.content,
        blocks: [...state.content.blocks, sectionBlock],
      };

      // Sofort in History committen
      const newPast = [...state.historyPast, state.content];
      const limitedPast = newPast.slice(-MAX_HISTORY);
      return {
        ...state,
        content: newContent,
        selectedBlockId: sectionBlock.id,
        historyPast: limitedPast,
        historyFuture: [],
      };
    }

    case "ADD_BLOCK_TO_SECTION": {
      const sectionIndex = state.content.blocks.findIndex(
        (b) => b.id === action.sectionId && b.type === "section"
      );
      if (sectionIndex === -1) return state;

      const section = state.content.blocks[sectionIndex];
      const sectionData = section.data as { children?: Block[] };
      const newChild = createBlockFromRegistry(action.blockType);

      const updatedSection: PageBlock = {
        ...section,
        data: {
          ...sectionData,
          children: [...(sectionData.children || []), newChild],
        },
      };

      const newBlocks = [...state.content.blocks];
      newBlocks[sectionIndex] = updatedSection;

      const newContent = {
        ...state.content,
        blocks: newBlocks,
      };
      // Sofort in History committen
      const newPast = [...state.historyPast, state.content];
      const limitedPast = newPast.slice(-MAX_HISTORY);
      return {
        ...state,
        content: newContent,
        selectedBlockId: newChild.id,
        historyPast: limitedPast,
        historyFuture: [],
      };
    }

    case "UPDATE_SECTION": {
      const sectionIndex = state.content.blocks.findIndex(
        (b) => b.id === action.sectionId && b.type === "section"
      );
      if (sectionIndex === -1) return state;

      const section = state.content.blocks[sectionIndex];
      const newBlocks = [...state.content.blocks];
      newBlocks[sectionIndex] = {
        ...section,
        data: {
          ...section.data,
          ...action.data,
        },
      };

      return {
        ...state,
        content: {
          ...state.content,
          blocks: newBlocks,
        },
      };
    }

    case "REMOVE_CHILD_FROM_SECTION": {
      const sectionIndex = state.content.blocks.findIndex(
        (b) => b.id === action.sectionId && b.type === "section"
      );
      if (sectionIndex === -1) return state;

      const section = state.content.blocks[sectionIndex];
      const sectionData = section.data as { children?: Block[] };
      const filteredChildren = (sectionData.children || []).filter(
        (c) => c.id !== action.childId
      );

      const updatedSection: PageBlock = {
        ...section,
        data: {
          ...sectionData,
          children: filteredChildren,
        },
      };

      const newBlocks = [...state.content.blocks];
      newBlocks[sectionIndex] = updatedSection;

      const newContent = {
        ...state.content,
        blocks: newBlocks,
      };
      // Sofort in History committen
      const newPast = [...state.historyPast, state.content];
      const limitedPast = newPast.slice(-MAX_HISTORY);
      return {
        ...state,
        content: newContent,
        historyPast: limitedPast,
        historyFuture: [],
      };
    }

    case "DUPLICATE_SECTION": {
      const sectionIndex = state.content.blocks.findIndex(
        (b) => b.id === action.sectionId && b.type === "section"
      );
      if (sectionIndex === -1) return state;

      const section = state.content.blocks[sectionIndex];
      const sectionData = section.data as { children?: Block[] };

      // Deep clone children with new IDs
      const clonedChildren = (sectionData.children || []).map((child) => ({
        ...child,
        id: createBlockId(),
        data: JSON.parse(JSON.stringify(child.data)),
      }));

      const duplicatedSection: PageBlock = {
        ...section,
        id: createBlockId(),
        data: {
          ...sectionData,
          children: clonedChildren,
        },
      };

      const newBlocks = [...state.content.blocks];
      newBlocks.splice(sectionIndex + 1, 0, duplicatedSection);

      const newContent = {
        ...state.content,
        blocks: newBlocks,
      };
      // Sofort in History committen
      const newPast = [...state.historyPast, state.content];
      const limitedPast = newPast.slice(-MAX_HISTORY);
      return {
        ...state,
        content: newContent,
        selectedBlockId: duplicatedSection.id,
        historyPast: limitedPast,
        historyFuture: [],
      };
    }

    case "ADD_REUSABLE": {
      const reusableBlock: PageBlock = {
        id: createBlockId(),
        type: "reusable",
        data: {
          reusableId: action.reusableId,
        },
      };

      const newContent = {
        ...state.content,
        blocks: [...state.content.blocks, reusableBlock],
      };

      // Sofort in History committen
      const newPast = [...state.historyPast, state.content];
      const limitedPast = newPast.slice(-MAX_HISTORY);
      return {
        ...state,
        content: newContent,
        selectedBlockId: reusableBlock.id,
        historyPast: limitedPast,
        historyFuture: [],
      };
    }

    case "SET_CONTENT":
      return {
        ...state,
        content: action.content,
        selectedBlockId:
          action.content.blocks.length > 0
            ? action.content.blocks[0].id
            : null,
        historyPast: [],
        historyFuture: [],
      };

    case "COMMIT": {
      // Push current content to historyPast (limit size)
      const newPast = [...state.historyPast, state.content];
      const limitedPast = newPast.slice(-MAX_HISTORY);

      return {
        ...state,
        content: action.content,
        selectedBlockId: action.selectedBlockId ?? state.selectedBlockId,
        historyPast: limitedPast,
        historyFuture: [], // Clear future on new commit
      };
    }

    case "UNDO": {
      if (state.historyPast.length === 0) return state;

      const previousContent = state.historyPast[state.historyPast.length - 1];
      const newPast = state.historyPast.slice(0, -1);
      const newFuture = [state.content, ...state.historyFuture];

      // Prüfe ob selectedBlockId noch existiert
      const blockExists = previousContent.blocks.some(
        (b) => b.id === state.selectedBlockId
      );
      const newSelectedId = blockExists
        ? state.selectedBlockId
        : previousContent.blocks.length > 0
          ? previousContent.blocks[0].id
          : null;

      // Markiere als UNDO für useEffect
      if (typeof window !== "undefined") {
        (window as any).__builderUndoRedo = true;
      }

      return {
        ...state,
        content: previousContent,
        selectedBlockId: newSelectedId,
        historyPast: newPast,
        historyFuture: newFuture,
      };
    }

    case "REDO": {
      if (state.historyFuture.length === 0) return state;

      const nextContent = state.historyFuture[0];
      const newFuture = state.historyFuture.slice(1);
      const newPast = [...state.historyPast, state.content];

      // Prüfe ob selectedBlockId noch existiert
      const blockExists = nextContent.blocks.some(
        (b) => b.id === state.selectedBlockId
      );
      const newSelectedId = blockExists
        ? state.selectedBlockId
        : nextContent.blocks.length > 0
          ? nextContent.blocks[0].id
          : null;

      // Markiere als REDO für useEffect
      if (typeof window !== "undefined") {
        (window as any).__builderUndoRedo = true;
      }

      return {
        ...state,
        content: nextContent,
        selectedBlockId: newSelectedId,
        historyPast: newPast,
        historyFuture: newFuture,
      };
    }

    default:
      return state;
  }
}

/**
 * Hook für Builder State Management mit History
 */
export function useBuilderState(initialContent: PageContentV1) {
  const [state, dispatch] = useReducer(builderReducer, {
    content: initialContent,
    selectedBlockId: initialContent.blocks.length > 0 ? initialContent.blocks[0].id : null,
    historyPast: [],
    historyFuture: [],
  });

  // Refs für Content Tracking und Debouncing
  const previousContentRef = useRef<PageContentV1>(state.content);
  const commitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUndoRedoRef = useRef(false);
  const lastActionRef = useRef<string | null>(null);

  const commit = useCallback(
    (newContent: PageContentV1, selectedBlockId?: string | null) => {
      // Prüfe ob Content sich wirklich geändert hat
      if (contentHash(previousContentRef.current) === contentHash(newContent)) {
        return; // Keine Änderung, kein Commit
      }

      previousContentRef.current = newContent;
      dispatch({
        type: "COMMIT",
        content: newContent,
        selectedBlockId,
      });
    },
    []
  );

  // Auto-Commit nach Content-Änderungen (debounced für Text-Inputs)
  useEffect(() => {
    // Skip commit wenn durch UNDO/REDO verursacht
    if (typeof window !== "undefined" && (window as any).__builderUndoRedo) {
      (window as any).__builderUndoRedo = false;
      previousContentRef.current = state.content;
      return;
    }

    // Skip commit wenn durch SET_CONTENT verursacht (initial load)
    if (lastActionRef.current === "SET_CONTENT") {
      previousContentRef.current = state.content;
      lastActionRef.current = null;
      return;
    }

    if (commitTimeoutRef.current) {
      clearTimeout(commitTimeoutRef.current);
    }

    // Für UPDATE_BLOCK: debounce (Text-Inputs)
    const delay = lastActionRef.current === "UPDATE_BLOCK" ? 500 : 0;

    commitTimeoutRef.current = setTimeout(() => {
      commit(state.content, state.selectedBlockId);
    }, delay);

    return () => {
      if (commitTimeoutRef.current) {
        clearTimeout(commitTimeoutRef.current);
      }
    };
    // Bewusst nur von state.content abhängig: der Commit soll durch INHALTS-
    // änderungen ausgelöst werden, nicht durch reine Block-Auswahl.
    // state.selectedBlockId wird zum Commit-Zeitpunkt aktuell mitgelesen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.content, commit]);

  const selectBlock = useCallback(
    (blockId: string | null) => {
      dispatch({ type: "SELECT_BLOCK", blockId });
    },
    []
  );

  const addBlock = useCallback(
    (blockType: BlockType) => {
      lastActionRef.current = "ADD_BLOCK";
      dispatch({ type: "ADD_BLOCK", blockType });
    },
    []
  );

  const updateBlock = useCallback(
    (blockId: string, data: Partial<PageBlock["data"]>) => {
      lastActionRef.current = "UPDATE_BLOCK";
      dispatch({ type: "UPDATE_BLOCK", blockId, data });
    },
    []
  );

  const removeBlock = useCallback(
    (blockId: string) => {
      lastActionRef.current = "REMOVE_BLOCK";
      dispatch({ type: "REMOVE_BLOCK", blockId });
    },
    []
  );

  const moveBlock = useCallback(
    (fromIndex: number, toIndex: number) => {
      lastActionRef.current = "MOVE_BLOCK";
      dispatch({ type: "MOVE_BLOCK", fromIndex, toIndex });
    },
    []
  );

  const duplicateBlock = useCallback(
    (blockId: string) => {
      lastActionRef.current = "DUPLICATE_BLOCK";
      dispatch({ type: "DUPLICATE_BLOCK", blockId });
    },
    []
  );

  const moveBlockById = useCallback(
    (blockId: string, direction: "up" | "down") => {
      lastActionRef.current = "MOVE_BLOCK_BY_ID";
      dispatch({ type: "MOVE_BLOCK_BY_ID", blockId, direction });
    },
    []
  );

  const setContent = useCallback(
    (content: PageContentV1) => {
      lastActionRef.current = "SET_CONTENT";
      previousContentRef.current = content;
      dispatch({ type: "SET_CONTENT", content });
    },
    []
  );

  const undo = useCallback(() => {
    lastActionRef.current = "UNDO";
    dispatch({ type: "UNDO" });
  }, []);

  const redo = useCallback(() => {
    lastActionRef.current = "REDO";
    dispatch({ type: "REDO" });
  }, []);

  const addTemplate = useCallback(
    (templateId: string) => {
      lastActionRef.current = "ADD_TEMPLATE";
      dispatch({ type: "ADD_TEMPLATE", templateId });
    },
    []
  );

  const addSection = useCallback(
    (templateBlocks?: PageBlock[]) => {
      lastActionRef.current = "ADD_SECTION";
      dispatch({ type: "ADD_SECTION", templateBlocks });
    },
    []
  );

  const addBlockToSection = useCallback(
    (sectionId: string, blockType: BlockType) => {
      lastActionRef.current = "ADD_BLOCK_TO_SECTION";
      dispatch({ type: "ADD_BLOCK_TO_SECTION", sectionId, blockType });
    },
    []
  );

  const updateSection = useCallback(
    (sectionId: string, data: Partial<PageBlock["data"]>) => {
      lastActionRef.current = "UPDATE_SECTION";
      dispatch({ type: "UPDATE_SECTION", sectionId, data });
    },
    []
  );

  const removeChildFromSection = useCallback(
    (sectionId: string, childId: string) => {
      lastActionRef.current = "REMOVE_CHILD_FROM_SECTION";
      dispatch({ type: "REMOVE_CHILD_FROM_SECTION", sectionId, childId });
    },
    []
  );

  const duplicateSection = useCallback(
    (sectionId: string) => {
      lastActionRef.current = "DUPLICATE_SECTION";
      dispatch({ type: "DUPLICATE_SECTION", sectionId });
    },
    []
  );

  const addReusable = useCallback(
    (reusableId: string) => {
      lastActionRef.current = "ADD_REUSABLE";
      dispatch({ type: "ADD_REUSABLE", reusableId });
    },
    []
  );

  const pasteBlock = useCallback(
    (block: PageBlock) => {
      lastActionRef.current = "PASTE_BLOCK";
      dispatch({ type: "PASTE_BLOCK", block });
    },
    []
  );

  return {
    content: state.content,
    selectedBlockId: state.selectedBlockId,
    canUndo: state.historyPast.length > 0,
    canRedo: state.historyFuture.length > 0,
    selectBlock,
    addBlock,
    addTemplate,
    updateBlock,
    removeBlock,
    moveBlock,
    duplicateBlock,
    moveBlockById,
    addSection,
    addBlockToSection,
    updateSection,
    removeChildFromSection,
    duplicateSection,
    addReusable,
    pasteBlock,
    setContent,
    undo,
    redo,
    commit,
  };
}
