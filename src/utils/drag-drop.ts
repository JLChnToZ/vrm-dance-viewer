import { interceptEvent } from './helper-functions';

export function registerDropZone(
  element: GlobalEventHandlers,
  dropCallback?: (dataTransfer: DataTransfer) => void,
  dragEnterCallback?: ((dataTransfer: DataTransfer) => void) | null,
  dragOverCallback?: ((dataTransfer: DataTransfer) => void) | null,
  dragLeaveCallback?: ((dataTransfer: DataTransfer) => void) | null,
) {
  const dragOverFallbackHandler = dropCallback != null ? null : defaultDragOverHandler;
  element.addEventListener('dragenter', wrapDragEvent(dragEnterCallback ?? dragOverFallbackHandler));
  element.addEventListener('dragover', wrapDragEvent(dragOverCallback ?? dragOverFallbackHandler));
  element.addEventListener('dragleave', wrapDragEvent(dragLeaveCallback));
  element.addEventListener('drop', wrapDragEvent(dropCallback));
}

function wrapDragEvent(callback?: ((dataTransfer: DataTransfer) => void) | null): (e: DragEvent) => void {
  return callback != null ? e => {
    interceptEvent(e);
    if(e.dataTransfer != null)
      callback(e.dataTransfer);
  } : interceptEvent;
}

function defaultDragOverHandler(dataTransfer: DataTransfer) {
  dataTransfer.dropEffect = 'none';
}
