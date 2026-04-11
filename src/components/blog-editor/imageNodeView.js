/**
 * ProseMirror NodeView for customImage nodes (Phase 8).
 * Loads the image via loadImageWithCache and displays it.
 * In edit mode shows resize/align controls on hover.
 */
import { $view } from '@milkdown/kit/utils';
import { customImageNode } from './customNodes';
import { loadImageWithCache } from '../../utils/imageCache';

function applyContainerStyle(container, attrs) {
  const { alignment, width } = attrs;
  container.style.textAlign = alignment === 'left' ? 'left' : alignment === 'right' ? 'right' : 'center';
  container.style.display = 'block';
  container.style.margin = '12px 0';
  container.style.position = 'relative';
  container.style.userSelect = 'none';
  if (width) {
    container.style.maxWidth = `${Math.min(width, 800)}px`;
    if (alignment === 'center') {
      container.style.marginLeft = 'auto';
      container.style.marginRight = 'auto';
    }
  }
}

function createImageNodeView(editable) {
  return (node, view, getPos) => {
    const { mediaId, width, height, alignment } = node.attrs;
    let currentMediaId = mediaId;

    // Outer container
    const dom = document.createElement('figure');
    dom.setAttribute('data-custom-image', '');
    dom.setAttribute('data-media-id', mediaId || '');
    dom.style.margin = '0';
    dom.style.padding = '0';
    dom.style.display = 'block';
    applyContainerStyle(dom, node.attrs);

    // Image element
    const img = document.createElement('img');
    img.alt = 'Article image';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.borderRadius = '4px';
    img.style.display = 'block';
    if (width) img.style.width = `${width}px`;
    if (height) img.style.height = `${height}px`;
    if (alignment === 'center') {
      img.style.margin = '0 auto';
    }
    img.draggable = false;

    // Loading placeholder
    const placeholder = document.createElement('div');
    placeholder.style.cssText =
      'background:#f0f0f0;border-radius:4px;min-height:80px;display:flex;align-items:center;justify-content:center;';
    placeholder.innerHTML = '<span style="color:#999;font-size:14px;">Loading image…</span>';

    dom.appendChild(placeholder);

    // Load image asynchronously
    let cancelled = false;
    if (mediaId) {
      loadImageWithCache(mediaId)
        .then((url) => {
          if (cancelled) return;
          img.src = url;
          if (dom.contains(placeholder)) {
            dom.replaceChild(img, placeholder);
          }
        })
        .catch(() => {
          if (cancelled) return;
          placeholder.innerHTML = '<span style="color:#f57c00;font-size:12px;">Image unavailable</span>';
        });
    } else {
      placeholder.innerHTML = '<span style="color:#f44336;font-size:12px;">No image selected</span>';
    }

    // Edit-mode controls overlay
    let controlsEl = null;
    let resizeHandleEl = null;
    if (editable) {
      controlsEl = document.createElement('div');
      controlsEl.style.cssText =
        'position:absolute;top:4px;right:4px;display:none;gap:4px;flex-direction:column;z-index:10;';
      controlsEl.className = 'image-node-controls';

      const makeBtn = (label, title) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.title = title;
        btn.type = 'button';
        btn.style.cssText =
          'background:rgba(0,0,0,0.6);color:white;border:none;border-radius:3px;padding:2px 6px;cursor:pointer;font-size:11px;';
        return btn;
      };

      const alignLeft = makeBtn('◀', 'Align left');
      const alignCenter = makeBtn('■', 'Align center');
      const alignRight = makeBtn('▶', 'Align right');

      [alignLeft, alignCenter, alignRight].forEach((btn, i) => {
        const al = ['left', 'center', 'right'][i];
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const pos = typeof getPos === 'function' ? getPos() : null;
          if (pos !== null && pos !== undefined) {
            const tr = view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, alignment: al });
            view.dispatch(tr);
          }
        });
        controlsEl.appendChild(btn);
      });

      dom.appendChild(controlsEl);

      // Bottom-right drag handle to resize image width.
      resizeHandleEl = document.createElement('div');
      resizeHandleEl.className = 'image-node-resize-handle';
      resizeHandleEl.title = 'Resize image';
      resizeHandleEl.style.cssText =
        'position:absolute;right:6px;bottom:6px;width:14px;height:14px;border-radius:3px;background:rgba(0,0,0,0.55);border:1px solid rgba(255,255,255,0.85);cursor:nwse-resize;display:none;z-index:11;';

      resizeHandleEl.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pos = typeof getPos === 'function' ? getPos() : null;
        if (pos === null || pos === undefined) return;

        const startX = e.clientX;
        const renderedWidth = img.getBoundingClientRect().width || 320;
        const startWidth = Math.round(node.attrs.width || renderedWidth);
        const minWidth = 120;
        const maxWidth = 1200;
        let latestWidth = startWidth;

        const onMouseMove = (moveEvent) => {
          const delta = moveEvent.clientX - startX;
          const nextWidth = Math.max(minWidth, Math.min(maxWidth, Math.round(startWidth + delta)));
          latestWidth = nextWidth;
          img.style.width = `${nextWidth}px`;
          img.style.height = '';
        };

        const onMouseUp = () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          const nodeAtPos = view.state.doc.nodeAt(pos);
          if (!nodeAtPos || nodeAtPos.type.name !== 'customImage') return;
          const tr = view.state.tr.setNodeMarkup(pos, undefined, {
            ...nodeAtPos.attrs,
            width: latestWidth,
            height: null,
          });
          view.dispatch(tr);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });

      dom.appendChild(resizeHandleEl);

      dom.addEventListener('mouseenter', () => {
        if (controlsEl) controlsEl.style.display = 'flex';
        if (resizeHandleEl) resizeHandleEl.style.display = 'block';
      });
      dom.addEventListener('mouseleave', () => {
        if (controlsEl) controlsEl.style.display = 'none';
        if (resizeHandleEl) resizeHandleEl.style.display = 'none';
      });
    }

    return {
      dom,
      update(newNode) {
        if (newNode.type !== node.type) return false;
        // Update attrs
        node = newNode;
        const { mediaId: newMediaId, width: newWidth, height: newHeight, alignment: newAlign } = newNode.attrs;
        applyContainerStyle(dom, newNode.attrs);
        if (img.parentNode === dom) {
          if (newWidth) img.style.width = `${newWidth}px`;
          else img.style.width = '';
          if (newHeight) img.style.height = `${newHeight}px`;
          else img.style.height = '';
          img.style.margin = newAlign === 'center' ? '0 auto' : '0';
        }
        // Reload image if mediaId changed
        if (newMediaId !== currentMediaId && newMediaId) {
          currentMediaId = newMediaId;
          cancelled = true;
          cancelled = false;
          const newPlaceholder = document.createElement('div');
          newPlaceholder.style.cssText =
            'background:#f0f0f0;border-radius:4px;min-height:80px;display:flex;align-items:center;justify-content:center;';
          newPlaceholder.innerHTML = '<span style="color:#999;font-size:14px;">Loading image…</span>';
          if (dom.contains(img)) dom.replaceChild(newPlaceholder, img);
          loadImageWithCache(newMediaId)
            .then((url) => {
              if (cancelled) return;
              img.src = url;
              if (dom.contains(newPlaceholder)) dom.replaceChild(img, newPlaceholder);
            })
            .catch(() => {
              newPlaceholder.innerHTML =
                '<span style="color:#f57c00;font-size:12px;">Image unavailable</span>';
            });
        }
        return true;
      },
      destroy() {
        cancelled = true;
      },
      stopEvent() {
        return false;
      },
    };
  };
}

export const customImageViewPlugin = $view(customImageNode, () => createImageNodeView(true));
export const customImageReadonlyViewPlugin = $view(customImageNode, () => createImageNodeView(false));
