=<Tabs>
  =<Tab title="Paint.tsx">
```tsx
import { start, draw } from './painter';

export default function Paint() {
  let color = '#3B82F6';
  let width = 4;
  const colors = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

  return () => (
    <div class="flex flex-col h-full bg-[#fffbe8]">
      <canvas
        width="280"
        height="380"
        onPointerDown={start}
        onPointerMove={(e) => draw(e, color, width)}
      />
      <div class="toolbar flex justify-between px-3 py-2 border-t">
        {/* Color picker */}
        <div class="colors flex gap-1">
          {colors.map(c => (
            <button onClick={() => color = c} style={{ backgroundColor: c }} />
          ))}
        </div>
        {/* Stroke width picker */}
        <div class="widths flex gap-1 items-center">
          {[2, 4, 8, 12].map(w => (
            <button onClick={() => width = w} style={{ width: `${w}px`, height: `${w}px` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
```
  =</Tab>

  =<Tab title="painter.ts">
```ts
let isDrawing = false;

export function start(e: PointerEvent) {
  isDrawing = true;
  const canvas = e.currentTarget as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  ctx.beginPath();
  ctx.moveTo(e.offsetX, e.offsetY);
}

export function draw(e: PointerEvent, color: string, width: number) {
  if (!isDrawing) return;
  const canvas = e.currentTarget as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}
```
  =</Tab>
=</Tabs>
