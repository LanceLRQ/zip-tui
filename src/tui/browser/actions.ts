import { assertNeverKind, type Location } from './location.js';

export type ActionId = 'compress' | 'extract' | 'test' | 'enter' | 'leave';

export interface Action {
  id: ActionId;
  /** Key that triggers it, as shown in the hint line. */
  key: string;
  /** i18n key for the label. */
  labelKey: string;
  /** Interpolation count, for labels that carry one. */
  labelCount?: number;
}

/** The row under the cursor, reduced to what the decision actually needs. */
export interface CursorInfo {
  id: string;
  isDir: boolean;
  isArchive: boolean;
}

export interface ActionContext {
  location: Location;
  /** Null when the listing is empty. */
  cursor: CursorInfo | null;
  /** Marked rows in the domain belonging to `location.kind`. */
  selectionCount: number;
}

/**
 * Which actions the current situation offers.
 *
 * Nothing here is a mode: the answer falls out of where we are, what the
 * cursor sits on, and what is marked. Compression only exists on the
 * filesystem because that is the only place material to compress can live;
 * extraction only exists where there is a package to take it from.
 *
 * `extract` is deliberately one action with two readings — inside a package it
 * takes the marked rows when there are any and the whole thing when there are
 * not. Keeping it under one key keeps the keymap small, and the label states
 * which it will do.
 */
export function availableActions(ctx: ActionContext): Action[] {
  switch (ctx.location.kind) {
    case 'fs':
      return filesystemActions(ctx);
    case 'archive':
      return archiveActions(ctx);
    default:
      // a new Location kind needs its own action set decided deliberately,
      // not inherited from whichever branch happened to be last
      return assertNeverKind(ctx.location);
  }
}

function filesystemActions(ctx: ActionContext): Action[] {
  const out: Action[] = [];
  if (ctx.selectionCount > 0) {
    out.push({
      id: 'compress',
      key: 'a',
      labelKey: 'action.compressSelected',
      labelCount: ctx.selectionCount,
    });
  }
  if (ctx.cursor?.isArchive) {
    out.push({ id: 'enter', key: 'Enter', labelKey: 'action.enter' });
    out.push({ id: 'extract', key: 'x', labelKey: 'action.extractArchive' });
    out.push({ id: 'test', key: 't', labelKey: 'action.test' });
  } else if (ctx.cursor?.isDir) {
    out.push({ id: 'enter', key: 'Enter', labelKey: 'action.enter' });
  }
  return out;
}

function archiveActions(ctx: ActionContext): Action[] {
  const extract: Action =
    ctx.selectionCount > 0
      ? {
          id: 'extract',
          key: 'x',
          labelKey: 'action.extractSelected',
          labelCount: ctx.selectionCount,
        }
      : { id: 'extract', key: 'x', labelKey: 'action.extractAll' };
  return [
    extract,
    { id: 'test', key: 't', labelKey: 'action.test' },
    { id: 'leave', key: '←', labelKey: 'action.leaveArchive' },
  ];
}
