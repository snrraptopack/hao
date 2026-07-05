export function createStaticApp(root: Element): { root: Element; render(): void; destroy(): void } {
  return {
    root,
    render() {},
    destroy() {},
  };
}
