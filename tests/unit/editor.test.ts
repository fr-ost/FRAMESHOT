import { describe, expect, it } from 'vitest';
import { fitObject, handleAt, hitTest, moveObject, nextMarkerNumber, objectBounds, resizeBounds, simplifyPoints } from '../../src/editor/model/objects';
import { applyStyle, EditorStore, styleOf } from '../../src/editor/model/store';
import { applyMatrix, cropDoc, docMatrix, flipDoc, isPristine, resetDoc, resizeDoc, rotateDoc } from '../../src/editor/model/transform';
import { createDoc, isValidDoc, type EditorDoc, type EditorObject } from '../../src/editor/model/types';

const rect = (id: string, x: number, y: number, w = 10, h = 10): EditorObject => ({ id, type: 'rect', x, y, w, h, stroke: '#f00', strokeWidth: 2, fill: null, radius: 0, opacity: 1 });
const arrow = (id: string): EditorObject => ({ id, type: 'arrow', x1: 0, y1: 0, x2: 100, y2: 0, color: '#f00', width: 4, heads: 'end', opacity: 1 });

describe('document transform pipeline', () => {
  it('maps source to output identically for a fresh document', () => {
    const doc = createDoc(400, 300);
    expect(applyMatrix(docMatrix(doc), { x: 10, y: 20 })).toEqual({ x: 10, y: 20 });
    expect(isPristine(doc)).toBe(true);
  });

  it('rotates clockwise: output size swaps and points map (x,y) → (H−y, x)', () => {
    const doc = { ...createDoc(400, 300), objects: [rect('a', 10, 20)] };
    const r = rotateDoc(doc, 'cw');
    expect(r.output).toEqual({ width: 300, height: 400 });
    const m = docMatrix(r);
    expect(applyMatrix(m, { x: 0, y: 0 })).toEqual({ x: 300, y: 0 });
    expect(applyMatrix(m, { x: 400, y: 300 })).toEqual({ x: 0, y: 400 });
    const o = r.objects[0] as Extract<EditorObject, { type: 'rect' }>;
    expect([o.x, o.y, o.w, o.h]).toEqual([270, 10, 10, 10]);
    // Four clockwise rotations return to the start.
    const back = rotateDoc(rotateDoc(rotateDoc(r, 'cw'), 'cw'), 'cw');
    expect(back.orientation).toEqual([1, 0, 0, 1]);
    expect((back.objects[0] as { x: number }).x).toBeCloseTo(10);
  });

  it('cw then ccw is the identity', () => {
    const doc = { ...createDoc(400, 300), objects: [arrow('a')] };
    const r = rotateDoc(rotateDoc(doc, 'cw'), 'ccw');
    expect(r.orientation).toEqual([1, 0, 0, 1]);
    expect(r.output).toEqual(doc.output);
    expect(r.objects[0]).toEqual(doc.objects[0]);
  });

  it('flips horizontally and vertically', () => {
    const doc = createDoc(400, 300);
    expect(applyMatrix(docMatrix(flipDoc(doc, 'h')), { x: 10, y: 20 })).toEqual({ x: 390, y: 20 });
    expect(applyMatrix(docMatrix(flipDoc(doc, 'v')), { x: 10, y: 20 })).toEqual({ x: 10, y: 280 });
  });

  it('crops in output coordinates even after rotation', () => {
    const rotated = rotateDoc({ ...createDoc(400, 300), objects: [rect('a', 50, 60)] }, 'cw'); // 300×400
    const c = cropDoc(rotated, { x: 100, y: 50, w: 150, h: 200 });
    expect(c.output).toEqual({ width: 150, height: 200 });
    // Output (0,0) of the crop is rotated-output (100,50) → source (50, 200).
    const inv = docMatrix(c);
    expect(applyMatrix(inv, { x: 50, y: 200 })).toEqual({ x: 0, y: 0 });
    expect(c.crop).toEqual({ x: 50, y: 50, w: 200, h: 150 });
    // Objects shift with the crop.
    const o = c.objects[0] as { x: number; y: number };
    const before = rotated.objects[0] as { x: number; y: number };
    expect([o.x, o.y]).toEqual([before.x - 100, before.y - 50]);
  });

  it('clamps and normalizes crop rectangles', () => {
    const doc = createDoc(100, 100);
    expect(cropDoc(doc, { x: 80, y: 80, w: -50, h: -50 }).output).toEqual({ width: 50, height: 50 });
    expect(cropDoc(doc, { x: 50, y: 50, w: 500, h: 500 }).output).toEqual({ width: 50, height: 50 });
    expect(cropDoc(doc, { x: 10, y: 10, w: 0, h: 5 })).toBe(doc);
  });

  it('resizes output and scales objects and stroke widths', () => {
    const doc = { ...createDoc(400, 300), objects: [rect('a', 100, 100, 40, 40)] };
    const r = resizeDoc(doc, 200, 150);
    expect(r.output).toEqual({ width: 200, height: 150 });
    const o = r.objects[0] as Extract<EditorObject, { type: 'rect' }>;
    expect([o.x, o.y, o.w, o.h, o.strokeWidth]).toEqual([50, 50, 20, 20, 1]);
    expect(applyMatrix(docMatrix(r), { x: 400, y: 300 })).toEqual({ x: 200, y: 150 });
  });

  it('resets to the original', () => {
    const doc = rotateDoc(cropDoc({ ...createDoc(400, 300), objects: [rect('a', 1, 1)] }, { x: 0, y: 0, w: 100, h: 100 }), 'cw');
    const r = resetDoc(doc);
    expect(isPristine(r)).toBe(true);
  });

  it('validates stored documents', () => {
    const doc = createDoc(10, 10);
    expect(isValidDoc(doc, { width: 10, height: 10 })).toBe(true);
    expect(isValidDoc(doc, { width: 11, height: 10 })).toBe(false);
    expect(isValidDoc({ ...doc, objects: 'x' }, { width: 10, height: 10 })).toBe(false);
    expect(isValidDoc(null, { width: 10, height: 10 })).toBe(false);
  });
});

describe('object geometry', () => {
  it('hit-tests strokes, fills and z-order (annotations above effects)', () => {
    const objs: EditorObject[] = [
      rect('r', 0, 0, 100, 100),
      { id: 'b', type: 'blur', x: 0, y: 0, w: 100, h: 100, radius: 10, opacity: 1 },
      arrow('a'),
    ];
    expect(hitTest(objs, { x: 50, y: 1 }, 3)?.id).toBe('a');
    expect(hitTest(objs, { x: 50, y: 50 }, 3)?.id).toBe('b'); // unfilled rect interior falls through to the blur
    expect(hitTest(objs, { x: 1, y: 50 }, 3)?.id).toBe('r');
    expect(hitTest(objs, { x: 500, y: 500 }, 3)).toBeNull();
  });

  it('computes bounds including stroke width', () => {
    expect(objectBounds(rect('r', 10, 10, 20, 20))).toEqual({ x: 9, y: 9, w: 22, h: 22 });
  });

  it('finds handles and resizes bounds, with aspect lock', () => {
    const objs = [rect('r', 0, 0, 100, 50)];
    expect(handleAt(objs, { x: 101, y: 51 }, 4)).toBe('se');
    expect(handleAt([arrow('a')], { x: 100, y: 0 }, 4)).toBe('p2');
    expect(resizeBounds({ x: 0, y: 0, w: 100, h: 50 }, 'se', { x: 200, y: 60 }, true)).toEqual({ x: 0, y: 0, w: 200, h: 100 });
    expect(resizeBounds({ x: 0, y: 0, w: 100, h: 50 }, 'e', { x: 150, y: 999 }, false)).toEqual({ x: 0, y: 0, w: 150, h: 50 });
  });

  it('fits objects into new bounds and moves them', () => {
    const r = fitObject(rect('r', 0, 0, 10, 10), { x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 20, h: 40 });
    expect(r).toMatchObject({ x: 5, y: 5, w: 20, h: 40 });
    expect(moveObject(arrow('a'), 5, 7)).toMatchObject({ x1: 5, y1: 7, x2: 105, y2: 7 });
  });

  it('simplifies freehand strokes and numbers markers', () => {
    const line = Array.from({ length: 100 }, (_, i) => [i, 0]).flat();
    expect(simplifyPoints(line, 0.5)).toEqual([0, 0, 99, 0]);
    expect(nextMarkerNumber([{ id: 'm', type: 'marker', x: 0, y: 0, n: 4, size: 30, fill: '#000', textColor: '#fff', opacity: 1 }])).toBe(5);
  });
});

describe('EditorStore', () => {
  const make = () => new EditorStore(createDoc(400, 300));

  it('supports undo/redo of object edits', () => {
    const s = make();
    s.addObject(rect('a', 0, 0));
    s.addObject(rect('b', 20, 20));
    expect(s.getState().doc.objects).toHaveLength(2);
    expect(s.getState().canUndo).toBe(true);
    s.undo();
    expect(s.getState().doc.objects.map((o) => o.id)).toEqual(['a']);
    s.redo();
    expect(s.getState().doc.objects.map((o) => o.id)).toEqual(['a', 'b']);
    s.undo();
    s.addObject(rect('c', 0, 0));
    expect(s.getState().canRedo).toBe(false);
  });

  it('commits a whole gesture as one undo step', () => {
    const s = make();
    s.addObject(rect('a', 0, 0));
    s.beginGesture();
    for (let i = 1; i <= 10; i++) s.updateObject('a', { x: i } as Partial<EditorObject>, true);
    s.endGesture();
    expect((s.getState().doc.objects[0] as { x: number }).x).toBe(10);
    s.undo();
    expect((s.getState().doc.objects[0] as { x: number }).x).toBe(0);
  });

  it('cancels gestures without history', () => {
    const s = make();
    s.beginGesture();
    s.updateTransient({ ...s.getState().doc, objects: [rect('x', 0, 0)] });
    s.cancelGesture();
    expect(s.getState().doc.objects).toHaveLength(0);
    expect(s.getState().canUndo).toBe(false);
  });

  it('reorders, duplicates, deletes and nudges the selection', () => {
    const s = make();
    s.addObject(rect('a', 0, 0));
    s.addObject(rect('b', 0, 0));
    s.addObject(rect('c', 0, 0));
    s.select(['a']);
    s.reorder('front');
    expect(s.getState().doc.objects.map((o) => o.id)).toEqual(['b', 'c', 'a']);
    s.reorder('backward');
    expect(s.getState().doc.objects.map((o) => o.id)).toEqual(['b', 'a', 'c']);
    s.reorder('back');
    expect(s.getState().doc.objects.map((o) => o.id)).toEqual(['a', 'b', 'c']);
    s.duplicateSelection();
    expect(s.getState().doc.objects).toHaveLength(4);
    s.nudgeSelection(5, 0);
    const dup = s.getState().doc.objects[3] as { x: number };
    expect(dup.x).toBeGreaterThan(5);
    s.deleteSelection();
    expect(s.getState().doc.objects).toHaveLength(3);
  });

  it('applies style changes to the selection and previews live', () => {
    const s = make();
    s.addObject(rect('a', 0, 0));
    s.select(['a']);
    s.setStyle({ color: '#00ff00', strokeWidth: 9 });
    expect(s.getState().doc.objects[0]).toMatchObject({ stroke: '#00ff00', strokeWidth: 9 });
    const rev = s.getState().revision;
    s.previewStyle({ strokeWidth: 12 });
    s.previewStyle({ strokeWidth: 14 });
    s.commitPreview();
    expect(s.getState().revision).toBe(rev + 1);
    s.undo();
    expect(s.getState().doc.objects[0]).toMatchObject({ strokeWidth: 9 });
  });

  it('maps styles to and from every object type', () => {
    const text: EditorObject = { id: 't', type: 'text', x: 0, y: 0, text: 'hi', font: 'sans', size: 20, color: '#000', bold: false, background: null, outline: false, opacity: 1 };
    expect(applyStyle(text, { fontSize: 40, color: '#fff' })).toMatchObject({ size: 40, color: '#fff' });
    expect(styleOf(text)).toMatchObject({ fontSize: 20, color: '#000' });
    const blur: EditorObject = { id: 'b', type: 'blur', x: 0, y: 0, w: 1, h: 1, radius: 5, opacity: 1 };
    expect(applyStyle(blur, { blurRadius: 30 })).toMatchObject({ radius: 30 });
  });

  it('crops through the crop tool and zooms around a point', () => {
    const s = make();
    s.setTool('crop');
    expect(s.getState().cropRect).toEqual({ x: 0, y: 0, w: 400, h: 300 });
    s.setCropRect({ x: 10, y: 10, w: 100, h: 50 });
    s.applyCrop();
    expect(s.getState().doc.output).toEqual({ width: 100, height: 50 });
    expect(s.getState().tool).toBe('select');
    s.setView({ zoom: 1, panX: 0, panY: 0 });
    s.zoomAt(2, 100, 100);
    expect(s.getState().view).toEqual({ zoom: 2, panX: -100, panY: -100 });
  });

  it('caps history at 100 entries', () => {
    const s = make();
    for (let i = 0; i < 120; i++) s.addObject(rect(`r${i}`, i, i));
    let undos = 0;
    while (s.getState().canUndo) {
      s.undo();
      undos++;
    }
    expect(undos).toBe(100);
    expect(s.getState().doc.objects).toHaveLength(20);
  });
});

export type { EditorDoc };

import { aspectResize } from '../../src/editor/model/objects';

describe('aspect-locked crop', () => {
  const bounds = { w: 1000, h: 800 };
  const orig = { x: 100, y: 100, w: 320, h: 180 }; // 16:9
  const r = 16 / 9;
  const ratioOf = (x: { w: number; h: number }) => x.w / x.h;

  it('corners keep the opposite corner fixed', () => {
    const se = aspectResize(orig, 'se', { x: 0, y: 0 }, { x: 740, y: 300 }, r, bounds);
    expect([se.x, se.y]).toEqual([100, 100]);
    expect(se.w).toBeCloseTo(640, 6);
    expect(ratioOf(se)).toBeCloseTo(r, 9);
    const nw = aspectResize(orig, 'nw', { x: 0, y: 0 }, { x: 0, y: 0 }, r, bounds);
    expect(nw.x + nw.w).toBeCloseTo(420, 6);
    expect(nw.y + nw.h).toBeCloseTo(280, 6);
    expect(ratioOf(nw)).toBeCloseTo(r, 9);
  });

  it('the bottom edge grows the height (and width around the centre); the top edge keeps the bottom fixed', () => {
    const s = aspectResize(orig, 's', { x: 0, y: 0 }, { x: 260, y: 370 }, r, bounds);
    expect(s.y).toBe(100);
    expect(s.h).toBeCloseTo(270, 6);
    expect(s.x + s.w / 2).toBeCloseTo(260, 6);
    expect(ratioOf(s)).toBeCloseTo(r, 9);
    const n = aspectResize(orig, 'n', { x: 0, y: 0 }, { x: 260, y: 190 }, r, bounds);
    expect(n.y + n.h).toBeCloseTo(280, 6);
    expect(n.h).toBeCloseTo(90, 6);
    expect(ratioOf(n)).toBeCloseTo(r, 9);
  });

  it('side edges grow the width and stay centred vertically', () => {
    const e = aspectResize(orig, 'e', { x: 0, y: 0 }, { x: 580, y: 0 }, r, bounds);
    expect(e.x).toBe(100);
    expect(e.w).toBeCloseTo(480, 6);
    expect(e.y + e.h / 2).toBeCloseTo(190, 6);
  });

  it('never leaves the image and keeps the ratio when clamped', () => {
    for (const handle of ['se', 'sw', 'ne', 'nw', 'n', 's', 'e', 'w', 'new'] as const) {
      const out = aspectResize(orig, handle, { x: 500, y: 400 }, { x: 5000, y: -3000 }, r, bounds);
      expect(out.x).toBeGreaterThanOrEqual(-1e-6);
      expect(out.y).toBeGreaterThanOrEqual(-1e-6);
      expect(out.x + out.w).toBeLessThanOrEqual(bounds.w + 1e-6);
      expect(out.y + out.h).toBeLessThanOrEqual(bounds.h + 1e-6);
      expect(ratioOf(out)).toBeCloseTo(r, 6);
    }
  });

  it('draws a new rectangle from its start point in any direction', () => {
    const up = aspectResize(orig, 'new', { x: 600, y: 500 }, { x: 440, y: 300 }, 1, bounds);
    expect(up.x + up.w).toBe(600);
    expect(up.y + up.h).toBe(500);
    expect(up.w).toBeCloseTo(up.h, 9);
  });
});
