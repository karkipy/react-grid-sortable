import * as React from 'react';
import PropTypes from 'prop-types';
import { SortableContext } from '../context';

import Manager from '../Manager';
import {
    closest,
} from '../utils';

import { SortableContainerManager, nodeIsChild, isSortableHandle } from './SortableHandler';

export function SortableContainer({
    children, className, useDragHandle, ...others
}) {
    const managerRef = React.useRef(Manager.create());
    const containerRef = React.useRef(null);

    function handleStart(event) {
        const node = closest(event.target, (el) => el.sortableInfo != null);
        if (
            node
        && node.sortableInfo
        && nodeIsChild(node, managerRef.current)) {
            const { index, collection, disabled } = node.sortableInfo;

            if (disabled) {
                return;
            }
            if (useDragHandle && !closest(event.target, isSortableHandle)) {
                return;
            }
            managerRef.current.active = { collection, index };
            const sortableHandler = SortableContainerManager.create(managerRef.current, event, containerRef.current, others);
            sortableHandler.handlePress(event);
        }
    }

    React.useEffect(() => {
        if (containerRef.current) {
            const container = containerRef.current;
            container.addEventListener('mousedown', handleStart, false);
            // container.addEventListener('mouseup', handleEnd, false);

            return () => {
                container.removeEventListener('mousedown', handleStart);
                // managerRef.current.active = null;
            };
        }

        return () => {

        };
    }, [containerRef?.current, managerRef?.current]);

    return (
        <SortableContext.Provider value={{ manager: managerRef.current }}>
            <div ref={containerRef} className={className}>
                {children}
            </div>
        </SortableContext.Provider>
    );
}

SortableContainer.propTypes = {
    onSortEnd: PropTypes.func,
    className: PropTypes.string,
    onSortMove: PropTypes.func,
    onSortOver: PropTypes.func,
    onSortStart: PropTypes.func,
    useDragHandle: PropTypes.bool,
};
