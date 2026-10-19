"use client";

/**
 * Keeps React working when the browser auto-translates the page (Google Translate wraps text
 * nodes in <font>, so React later tries to remove/insert relative to nodes that moved).
 * Known workaround: make those two DOM calls tolerant instead of throwing.
 * https://github.com/facebook/react/issues/11538
 */
if (typeof window !== "undefined" && !(Node.prototype as { __translateSafe?: boolean }).__translateSafe) {
  const proto = Node.prototype as Node & { __translateSafe?: boolean };
  proto.__translateSafe = true;

  const originalRemoveChild = proto.removeChild;
  proto.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = proto.insertBefore;
  proto.insertBefore = function <T extends Node>(this: Node, newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) return newNode;
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

export function TranslateSafe() {
  return null;
}
