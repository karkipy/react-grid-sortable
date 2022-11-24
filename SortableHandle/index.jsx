import * as React from 'react';

export function SortableHandle({ className, style, children }) {
    const ref = React.useRef(null);

    React.useEffect(() => {
        if (ref.current) {
            ref.current.sortableHandle = true;
        }
    }, [ref.current]);

    return (
        <div ref={ref} className={className} style={style}>
            {children}
        </div>
    );
}
