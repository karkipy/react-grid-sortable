import * as React from 'react';

export const SortableContext = React.createContext({
    manager: {},
});

export function useContainerManager() {
    return React.useContext(SortableContext).manager;
}
