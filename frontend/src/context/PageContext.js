import React, { createContext, useContext } from "react";

const PageContext = createContext({ title: "Command Center", breadcrumbs: [] });

export function PageProvider({ children, value }) {
  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
}

export const usePage = () => useContext(PageContext);
