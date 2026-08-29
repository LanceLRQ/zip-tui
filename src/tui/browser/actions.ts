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

/**
 * The row under the cursor, reduced to what the decision actually needs.
 *
 * `isDir` and `isArchive` are never both true in practice — the producer sets
 * `isArchive` only for non-directories — but if they were, archive wins.
 *
 * There is deliberately no way to express "this is the parent (`..`) row". A
 * caller sitting on that row should pass `null`, because the row's real action
 * is stepping out, not descending, and offering "enter" for it would mislabel
 * the hint line.
 */
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
  /**
   * True when a package is shown as one whole-tree listing instead of a single
   * directory. Meaningless on the filesystem, which has no such view.
   */
  treeView?: boolean;
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
 *
 * The order of the returned array is the order the hint line renders, so it is
 * part of the interface rather than an implementation detail.
 *
 * Only contextual actions appear here. Global keys — marking, the marked list,
 * view and sort toggles, help, quit — are always available and are handled by
 * the page directly, so listing them would be noise.
 */
export function availableActions(ctx: ActionContext): Action[] {
  const kind = ctx.location.kind;
  switch (kind) {
    case 'fs':
      return filesystemActions(ctx);
    case 'archive':
      return archiveActions(ctx);
    default:
      // a new Location kind needs its own action set decided deliberately,
      // not inherited from whichever branch happened to be last
      return assertNeverKind(kind);
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
  const out: Action[] = [];

  /*
   * A directory inside a package descends like any other, which is what
   * `Location.innerDir` is for. Only directories: a package nested inside
   * another has to be unpacked before it can be opened, so its row behaves
   * like a file.
   *
   * The tree view is excluded because its rows are the whole package at once
   * rather than one level. Descending there would move the address while the
   * listing stayed put, which reads as nothing having happened.
   */
  if (!ctx.treeView && ctx.cursor?.isDir) {
    out.push({ id: 'enter', key: 'Enter', labelKey: 'action.enter' });
  }

  out.push(
    ctx.selectionCount > 0
      ? {
          id: 'extract',
          key: 'x',
          labelKey: 'action.extractSelected',
          labelCount: ctx.selectionCount,
        }
      : { id: 'extract', key: 'x', labelKey: 'action.extractAll' },
  );
  out.push({ id: 'test', key: 't', labelKey: 'action.test' });

  // one key, two destinations: at the root it leaves the package, below it goes
  // up a level. The label has to say which, or it misdescribes half its uses.
  const atRoot = ctx.location.kind === 'archive' && ctx.location.innerDir === '';
  out.push({
    id: 'leave',
    key: '←',
    labelKey: atRoot ? 'action.leaveArchive' : 'action.leaveLevel',
  });

  return out;
}
