// Minimal Auwla JSX global declarations
// Copy this into your project's global.d.ts or types file

declare global {
  // Auwla custom JSX syntax
  function $if(condition: any): boolean;
  function $if(condition: any, element: JSX.Element): JSX.Element | null;
  function $elseif(condition: any, element: JSX.Element): JSX.Element | null;
  function $else(element: JSX.Element): JSX.Element;
  function $each<T>(items: T[], render: (item: T, index: number) => JSX.Element): JSX.Element[];
  function $key(key: string | number, element: JSX.Element): JSX.Element;
  function $map<T>(items: T[], render: (item: T, index: number) => JSX.Element): JSX.Element[];
}

export {};