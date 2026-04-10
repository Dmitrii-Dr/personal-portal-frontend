/**
 * ProseMirror NodeViews for admonitionPanel and admonitionBody (Phase 6).
 * admonitionPanel: styled card with settings popover; body holds block content only.
 */
import { $view } from '@milkdown/kit/utils';
import { admonitionPanelNode, admonitionBodyNode } from './customNodes';

// ─── Admonition Body ─────────────────────────────────────────────────────────

function createAdmonitionBodyView() {
  return () => {
    const dom = document.createElement('div');
    dom.setAttribute('data-admonition-body', '');
    dom.style.cssText = 'padding:4px 2px 2px;outline:none;';
    return { dom, contentDOM: dom };
  };
}

// ─── Admonition Panel ────────────────────────────────────────────────────────

function applyPanelStyle(dom, attrs) {
  const { bgColor, textColor, fontSize } = attrs;
  dom.style.backgroundColor = bgColor || '#e3f2fd';
  dom.style.color = textColor || 'inherit';
  dom.style.fontSize = fontSize || 'inherit';
  dom.style.borderLeft = '4px solid #1976d2';
  dom.style.borderRadius = '4px';
  dom.style.padding = '8px';
  dom.style.margin = '12px 0';
  dom.style.position = 'relative';
}

function showPanelPopover(node, view, getPos, anchor) {
  const existing = document.getElementById('admonition-popover');
  if (existing) existing.remove();

  const popover = document.createElement('div');
  popover.id = 'admonition-popover';
  popover.style.cssText =
    'position:fixed;background:white;border:1px solid #ccc;border-radius:6px;padding:12px;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.2);min-width:200px;font-family:system-ui,sans-serif;font-size:13px;';

  const rect = anchor.getBoundingClientRect();
  popover.style.top = `${rect.bottom + 4}px`;
  popover.style.left = `${rect.left}px`;

  const title = document.createElement('div');
  title.textContent = 'Panel settings';
  title.style.cssText = 'font-weight:600;margin-bottom:10px;';
  popover.appendChild(title);

  const makeRow = (label, inputHtml) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    lbl.style.cssText = 'width:80px;flex-shrink:0;';
    row.appendChild(lbl);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = inputHtml;
    row.appendChild(wrapper);
    popover.appendChild(row);
    return wrapper.firstChild;
  };

  const bgInput = makeRow(
    'Background',
    `<input type="color" value="${node.attrs.bgColor || '#e3f2fd'}" style="width:48px;height:28px;cursor:pointer;">`
  );
  const textInput = makeRow(
    'Text color',
    `<input type="color" value="${node.attrs.textColor || '#000000'}" style="width:48px;height:28px;cursor:pointer;">`
  );
  const fontInput = makeRow(
    'Font size',
    `<input type="text" value="${node.attrs.fontSize || ''}" placeholder="e.g. 14px" style="width:80px;padding:2px 4px;border:1px solid #ccc;border-radius:3px;">`
  );

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:8px;margin-top:8px;';

  const applyBtn = document.createElement('button');
  applyBtn.textContent = 'Apply';
  applyBtn.type = 'button';
  applyBtn.style.cssText =
    'background:#1976d2;color:white;border:none;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:12px;';
  applyBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const pos = typeof getPos === 'function' ? getPos() : null;
    if (pos !== null && pos !== undefined) {
      const attrs = {
        ...node.attrs,
        bgColor: bgInput.value,
        textColor: textInput.value,
        fontSize: fontInput.value || null,
      };
      const tr = view.state.tr.setNodeMarkup(pos, undefined, attrs);
      view.dispatch(tr);
    }
    popover.remove();
  });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.type = 'button';
  closeBtn.style.cssText =
    'background:#f5f5f5;color:#333;border:1px solid #ccc;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:12px;';
  closeBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    popover.remove();
  });

  actions.appendChild(applyBtn);
  actions.appendChild(closeBtn);
  popover.appendChild(actions);

  document.body.appendChild(popover);

  const closeOnOutside = (e) => {
    if (!popover.contains(e.target) && e.target !== anchor) {
      popover.remove();
      document.removeEventListener('mousedown', closeOnOutside);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', closeOnOutside), 0);
}

function createAdmonitionPanelView(editable) {
  return (node, view, getPos) => {
    const dom = document.createElement('div');
    dom.setAttribute('data-admonition-panel', '');
    applyPanelStyle(dom, node.attrs);

    let settingsBtn = null;
    let deleteBtn = null;
    if (editable) {
      const controls = document.createElement('div');
      controls.style.cssText = 'position:absolute;top:4px;right:4px;display:flex;gap:4px;z-index:2;';

      settingsBtn = document.createElement('button');
      settingsBtn.type = 'button';
      settingsBtn.title = 'Panel settings';
      settingsBtn.innerHTML = '⚙';
      settingsBtn.style.cssText =
        'background:rgba(25,118,210,0.12);border:none;border-radius:3px;cursor:pointer;font-size:14px;padding:1px 5px;color:#1976d2;';
      settingsBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showPanelPopover(node, view, getPos, settingsBtn);
      });
      controls.appendChild(settingsBtn);

      deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.title = 'Delete panel';
      deleteBtn.innerHTML = '🗑';
      deleteBtn.style.cssText =
        'background:rgba(211,47,47,0.12);border:none;border-radius:3px;cursor:pointer;font-size:13px;padding:1px 5px;color:#d32f2f;';
      deleteBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pos = typeof getPos === 'function' ? getPos() : null;
        if (pos === null || pos === undefined) return;

        const currentNode = view.state.doc.nodeAt(pos);
        if (!currentNode) return;

        const paragraph = view.state.schema.nodes.paragraph?.create();
        let tr = view.state.tr.delete(pos, pos + currentNode.nodeSize);
        if (paragraph) {
          tr = tr.insert(pos, paragraph);
        }
        view.dispatch(tr.scrollIntoView());
        view.focus();
      });
      controls.appendChild(deleteBtn);

      dom.appendChild(controls);
    }

    const contentWrapper = document.createElement('div');
    contentWrapper.style.cssText = 'padding-top:2px;';
    dom.appendChild(contentWrapper);

    return {
      dom,
      contentDOM: contentWrapper,
      update(newNode) {
        if (newNode.type !== node.type) return false;
        node = newNode;
        applyPanelStyle(dom, newNode.attrs);
        return true;
      },
      stopEvent(event) {
        return event.target === settingsBtn || event.target === deleteBtn;
      },
      destroy() {
        const popover = document.getElementById('admonition-popover');
        if (popover) popover.remove();
      },
    };
  };
}

export const admonitionBodyViewPlugin = $view(admonitionBodyNode, () => createAdmonitionBodyView());
export const admonitionPanelViewPlugin = $view(admonitionPanelNode, () => createAdmonitionPanelView(true));
export const admonitionPanelReadonlyViewPlugin = $view(admonitionPanelNode, () =>
  createAdmonitionPanelView(false)
);
