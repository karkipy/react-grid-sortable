import * as React from 'react';

import { useContainerManager } from '../context';

export function SortableElement({
    children, className, style, index, disabled, collection = 0, id,
}) {
    const elementRef = React.useRef();
    const manager = useContainerManager();

    React.useEffect(() => {
        if (elementRef?.current) {
            const element = elementRef.current;
            element.sortableInfo = {
                collection,
                disabled,
                index,
                manager,
                id,

            };
            const node = {
                node: element,
            };
            manager.add(collection, node);

            return () => {
                manager.remove(collection, node);
            };
        }

        return () => {

        };
    }, [elementRef?.current, collection, manager, index, disabled]);

    // React.useEffect(() => {
    //     if (!elementRef?.current) return;
    //     const element = elementRef.current;
    //     if (element?.sortableInfo) {
    //         element.sortableInfo.index = index;
    //         element.sortableInfo.disabled = disabled;
    //     }
    // }, [index, disabled]);

    return (
        <div key={index} ref={elementRef} className={className} style={style}>
            {children}
        </div>
    );
}
